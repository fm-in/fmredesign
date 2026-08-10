/**
 * CreativeMinds Talent API
 * Handles talent applications and admin management (Supabase JSONB)
 *
 * POST  - Public: submit a talent application (rate-limited, no auth)
 * GET   - Admin: list/search talent applications with stats
 * PUT   - Admin: update application status (approve/reject) with profile creation
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAdminAuth, requirePermission } from '@/lib/admin-auth-middleware';
import { rateLimit, getClientIp } from '@/lib/rate-limiter';
import { notifyAdmins } from '@/lib/notifications';
import { logAuditEvent, getClientIP } from '@/lib/admin/audit-log';
import { submitTalentApplicationSchema, validateBody } from '@/lib/validations/schemas';
import {
  notifyTeam, notifyRecipient,
  talentApplicationReceivedEmail, talentApplicationTeamEmail, talentApprovedEmail, talentRejectedEmail,
} from '@/lib/email/send';
import { notifyTalent } from '@/lib/notifications';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate a URL-safe slug from a name.
 * Handles empty names, special characters, accented letters, and extra whitespace.
 * Appends 4 random alphanumeric characters for uniqueness.
 *
 * Examples:
 *   "Rahul Sharma"     -> "rahul-sharma-x3k9"
 *   "José García-López" -> "jose-garcia-lopez-a2b7"
 *   ""                  -> "talent-f4g8"
 *   "   "               -> "talent-m1n2"
 */
function generateProfileSlug(name: string): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const suffix = Array.from({ length: 4 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');

  if (!name || !name.trim()) {
    return `talent-${suffix}`;
  }

  const slug = name
    .normalize('NFD')                    // decompose accented characters
    .replace(/[\u0300-\u036f]/g, '')     // strip diacritical marks
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')        // remove non-alphanumeric (keep spaces & hyphens)
    .replace(/[\s-]+/g, '-')             // collapse whitespace/hyphens into single hyphen
    .replace(/^-+|-+$/g, '');            // trim leading/trailing hyphens

  if (!slug) {
    return `talent-${suffix}`;
  }

  return `${slug}-${suffix}`;
}

/** Transform a Supabase talent_applications row to the API response shape. */
function transformApplication(row: Record<string, any>) {
  return {
    id: row.id,
    applicationDate: row.application_date || row.created_at,
    status: row.status,
    reviewNotes: row.review_notes,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    personalInfo: row.personal_info || {},
    professionalDetails: row.professional_details || {},
    portfolioLinks: row.portfolio_links || {},
    socialMedia: row.social_media || {},
    availability: row.availability || {},
    preferences: row.preferences || {},
    pricing: row.pricing || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// POST  /api/talent  (public - no auth required)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 3 requests per minute per IP
    const clientIp = getClientIp(request);
    if (!rateLimit(clientIp, 3)) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const rawBody = await request.json();
    const validation = validateBody(submitTalentApplicationSchema, rawBody);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }
    const body = rawBody;
    const { application } = body;

    // ------------------------------------------------------------------
    // Insert into talent_applications
    // ------------------------------------------------------------------
    const applicationId = crypto.randomUUID();

    const record = {
      id: applicationId,
      status: 'submitted',
      personal_info: application.personalInfo || {},
      professional_details: application.professionalDetails || {},
      portfolio_links: application.portfolioLinks || {},
      social_media: application.socialMedia || {},
      availability: application.availability || {},
      preferences: application.preferences || {},
      pricing: application.pricing || {},
    };

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('talent_applications').insert(record);

    if (error) throw error;

    // Fire-and-forget email notifications
    const personalInfo = application.personalInfo || {};
    const fullName = personalInfo.fullName || 'Applicant';
    const applicantEmail = personalInfo.email;
    const talentData = {
      fullName,
      email: applicantEmail || '',
      category: (application.professionalDetails?.primaryCategory as string) || undefined,
      experience: (application.professionalDetails?.experienceLevel as string) || undefined,
    };

    // Surface in the admin dashboard. Email alone proved insufficient —
    // two genuine applications sat unreviewed for months because nothing
    // appeared in the notification bell. Mirrors the /api/leads pattern.
    notifyAdmins({
      type: 'general',
      title: 'New talent application',
      message: `${fullName}${talentData.category ? ` — ${talentData.category}` : ''}`,
      priority: 'high',
      actionUrl: '/admin/creativeminds',
    });

    // Notify team
    const teamEmail = talentApplicationTeamEmail(talentData);
    notifyTeam(teamEmail.subject, teamEmail.html);

    // Confirmation to applicant
    if (applicantEmail) {
      const confirmEmail = talentApplicationReceivedEmail(talentData);
      notifyRecipient(applicantEmail, confirmEmail.subject, confirmEmail.html);
    }

    return NextResponse.json(
      { success: true, id: applicationId },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error submitting talent application:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit application' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// GET  /api/talent  (admin-protected)
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'profiles' to query talent_profiles
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const supabase = getSupabaseAdmin();

    // ------------------------------------------------------------------
    // type=profiles → return talent_profiles (approved network members)
    // ------------------------------------------------------------------
    if (type === 'profiles') {
      let profileQuery = supabase
        .from('talent_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (status) {
        profileQuery = profileQuery.eq('status', status);
      }

      if (search) {
        profileQuery = profileQuery.or(
          `personal_info->>fullName.ilike.%${search}%,email.ilike.%${search}%`
        );
      }

      const { data, error } = await profileQuery;
      if (error) throw error;

      const profiles = (data || []).map((row: Record<string, unknown>) => ({
        id: row.id,
        applicationId: row.application_id,
        profileSlug: row.profile_slug,
        email: row.email,
        personalInfo: row.personal_info || {},
        professionalDetails: row.professional_details || {},
        portfolioLinks: row.portfolio_links || {},
        socialMedia: row.social_media || {},
        availability: row.availability || {},
        preferences: row.preferences || {},
        pricing: row.pricing || {},
        ratings: row.ratings || { overallRating: 0, totalReviews: 0 },
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      return NextResponse.json({ success: true, data: profiles });
    }

    // ------------------------------------------------------------------
    // type=assignable → return approved talent for project assignment
    // Returns a flat shape matching TalentMember interface used by
    // projects/new page: { id, name, category, skills, availability, hourlyRate }
    // ------------------------------------------------------------------
    if (type === 'assignable') {
      const { data, error } = await supabase
        .from('talent_profiles')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const assignable = (data || []).map((row: Record<string, unknown>) => {
        const personalInfo = (row.personal_info || {}) as Record<string, unknown>;
        const professionalDetails = (row.professional_details || {}) as Record<string, unknown>;
        const pricing = (row.pricing || {}) as Record<string, unknown>;
        const availability = (row.availability || {}) as Record<string, unknown>;

        return {
          id: row.id as string,
          name: (personalInfo.fullName as string) || (row.email as string) || 'Unknown',
          category: (professionalDetails.primaryCategory as string) || 'other',
          skills: (professionalDetails.skills as string[]) || [],
          availability: (availability.status as string) || 'available',
          hourlyRate: (pricing.hourlyRate as number) || 0,
        };
      });

      return NextResponse.json({ success: true, data: assignable });
    }

    // ------------------------------------------------------------------
    // Default: return talent_applications
    // ------------------------------------------------------------------
    let query = supabase
      .from('talent_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    // Search across JSONB personal_info fields (fullName, email)
    if (search) {
      query = query.or(
        `personal_info->>fullName.ilike.%${search}%,personal_info->>email.ilike.%${search}%`
      );
    }

    const { data, error } = await query;
    if (error) throw error;

    const applications = (data || []).map(transformApplication);

    // ------------------------------------------------------------------
    // Compute stats across ALL applications (unfiltered)
    // ------------------------------------------------------------------
    const { data: allApps, error: statsError } = await supabase
      .from('talent_applications')
      .select('status');

    if (statsError) throw statsError;

    const stats = {
      total: (allApps || []).length,
      submitted: 0,
      under_review: 0,
      approved: 0,
      rejected: 0,
    };

    for (const app of allApps || []) {
      const s = app.status as string;
      if (s === 'submitted') stats.submitted++;
      else if (s === 'under_review') stats.under_review++;
      else if (s === 'approved') stats.approved++;
      else if (s === 'rejected') stats.rejected++;
    }

    return NextResponse.json({
      success: true,
      data: applications,
      stats,
    });
  } catch (error) {
    console.error('Error fetching talent data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch talent data' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PUT  /api/talent  (admin-protected)
// ---------------------------------------------------------------------------

export async function PUT(request: NextRequest) {
  const auth = await requirePermission(request, 'clients.write');
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const { id, status, reviewNotes, reviewedBy } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Application ID is required' },
        { status: 400 }
      );
    }

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Status is required' },
        { status: 400 }
      );
    }

    const validStatuses = ['submitted', 'under_review', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // ------------------------------------------------------------------
    // Update the application
    // ------------------------------------------------------------------
    const updatePayload: Record<string, any> = {
      status,
      reviewed_at: new Date().toISOString(),
    };

    if (reviewNotes !== undefined) updatePayload.review_notes = reviewNotes;
    if (reviewedBy !== undefined) updatePayload.reviewed_by = reviewedBy;

    const { data: updatedApp, error: updateError } = await supabase
      .from('talent_applications')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    if (!updatedApp) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    // ------------------------------------------------------------------
    // If approved -> create talent_profiles record
    // ------------------------------------------------------------------
    let profileSlug: string | undefined;

    if (status === 'approved') {
      const personalInfo = updatedApp.personal_info as Record<string, any> || {};
      const fullName = (personalInfo.fullName as string) || '';
      profileSlug = generateProfileSlug(fullName);

      // Generate temporary portal password
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const tempPassword = Array.from({ length: 12 }, () =>
        chars[Math.floor(Math.random() * chars.length)]
      ).join('');
      const hashedPassword = await bcrypt.hash(tempPassword, 12);
      const portalEmail = personalInfo.email
        ? (personalInfo.email as string).trim().toLowerCase()
        : null;

      const profileRecord: Record<string, unknown> = {
        id: crypto.randomUUID(),
        application_id: id,
        profile_slug: profileSlug,
        email: personalInfo.email || null,
        portal_email: portalEmail,
        portal_password: hashedPassword,
        personal_info: updatedApp.personal_info,
        professional_details: updatedApp.professional_details,
        portfolio_links: updatedApp.portfolio_links,
        social_media: updatedApp.social_media,
        availability: updatedApp.availability,
        preferences: updatedApp.preferences,
        pricing: updatedApp.pricing,
        status: 'approved',
      };

      const { error: profileError } = await supabase
        .from('talent_profiles')
        .insert(profileRecord);

      if (profileError) throw profileError;

      // Fire-and-forget: notify approved applicant (include login credentials)
      const approvedEmail = personalInfo.email as string | undefined;
      if (approvedEmail && profileSlug) {
        const emailData = talentApprovedEmail({
          fullName,
          profileSlug,
          tempPassword,
          portalEmail: portalEmail || undefined,
        });
        notifyRecipient(approvedEmail, emailData.subject, emailData.html);
      }

      // In-app notification for talent portal
      notifyTalent(profileRecord.id as string, {
        type: 'talent_approved',
        title: 'Welcome to CreativeMinds!',
        message: 'Your application has been approved. Explore your portal to get started.',
        actionUrl: `/creativeminds/portal/${profileSlug}`,
      });
    }

    // Fire-and-forget: notify rejected applicant
    if (status === 'rejected') {
      const personalInfo = updatedApp.personal_info as Record<string, any> || {};
      const fullName = (personalInfo.fullName as string) || '';
      const rejectedEmail = personalInfo.email as string | undefined;
      if (rejectedEmail) {
        const emailData = talentRejectedEmail({ fullName });
        notifyRecipient(rejectedEmail, emailData.subject, emailData.html);
      }
    }

    // Audit log
    await logAuditEvent({
      user_id: auth.user.id,
      user_name: auth.user.name,
      action: status === 'approved' ? 'approve' : status === 'rejected' ? 'reject' : 'update',
      resource_type: 'talent_application',
      resource_id: id,
      details: { newStatus: status, profileSlug },
      ip_address: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      ...(profileSlug ? { profileSlug } : {}),
    });
  } catch (error) {
    console.error('Error updating talent application:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update application' },
      { status: 500 }
    );
  }
}
