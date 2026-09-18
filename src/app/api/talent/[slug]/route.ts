/**
 * Talent Profile API (slug-based access)
 *
 * GET  /api/talent/[slug] - Fetch a talent's public profile by slug (public)
 * PUT  /api/talent/[slug] - Update allowed profile fields (requires auth)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireTalentAuth, getTalentSessionFromCookie } from '@/lib/talent-session';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fields the talent is allowed to update via PUT */
const ALLOWED_UPDATE_KEYS: Record<string, string> = {
  personalInfo: 'personal_info',
  portfolioLinks: 'portfolio_links',
  socialMedia: 'social_media',
  availability: 'availability',
  preferences: 'preferences',
  pricing: 'pricing',
};

/** Transform a Supabase row (snake_case) to the API response (camelCase) */
function transformProfile(row: Record<string, unknown>) {
  return {
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
    ratings: row.ratings || {
      overallRating: 0,
      totalReviews: 0,
      qualityOfWork: 0,
      communication: 0,
      timeliness: 0,
      professionalism: 0,
    },
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// GET - Fetch talent profile by slug
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'Profile slug is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: profile, error } = await supabase
      .from('talent_profiles')
      .select('*')
      .eq('profile_slug', slug)
      .single();

    if (error || !profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Suspended profiles should not be accessible
    if (profile.status === 'suspended') {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    // The page renders inline Edit controls off this flag. Only the signed-in
    // owner sees them; the PUT below is the actual guard, this just stops the
    // page offering an action that would be rejected.
    const session = getTalentSessionFromCookie(request);
    const isOwner = session?.talentId === profile.id;

    return NextResponse.json({
      success: true,
      isOwner,
      profile: transformProfile(profile),
    });
  } catch (error) {
    console.error('Error fetching talent profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch talent profile' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PUT - Update allowed profile fields (requires talent auth)
// ---------------------------------------------------------------------------

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'Profile slug is required' },
        { status: 400 }
      );
    }

    // Require authenticated talent session with matching slug
    const authError = await requireTalentAuth(request, slug);
    if (authError) return authError;

    const supabase = getSupabaseAdmin();

    // Verify the profile exists and is not suspended before allowing updates
    const { data: existing, error: lookupError } = await supabase
      .from('talent_profiles')
      .select('id, status')
      .eq('profile_slug', slug)
      .single();

    if (lookupError || !existing) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    if (existing.status === 'suspended') {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Build the update payload from allowed fields only
    const dbUpdates: Record<string, unknown> = {};

    for (const [camelKey, snakeKey] of Object.entries(ALLOWED_UPDATE_KEYS)) {
      if (body[camelKey] !== undefined) {
        dbUpdates[snakeKey] = body[camelKey];
      }
    }

    if (Object.keys(dbUpdates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // If personalInfo contains an email, sync it to the top-level email column
    if (
      body.personalInfo &&
      typeof body.personalInfo === 'object' &&
      typeof body.personalInfo.email === 'string' &&
      body.personalInfo.email.trim() !== ''
    ) {
      dbUpdates.email = body.personalInfo.email.trim();
    }

    dbUpdates.updated_at = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('talent_profiles')
      .update(dbUpdates)
      .eq('id', existing.id);

    if (updateError) {
      console.error('Supabase update error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating talent profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
