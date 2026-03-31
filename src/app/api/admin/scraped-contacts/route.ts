/**
 * Scraped Contacts API Routes
 * Handles CRUD + bulk import for scraped contacts (Supabase)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requirePermission } from '@/lib/admin-auth-middleware';
import { logAuditEvent, getClientIP } from '@/lib/admin/audit-log';
import type { ScrapedContactStatus, SourcePlatform } from '@/lib/admin/scraped-contact-types';

// snake_case row → camelCase contact
function transformRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    mobile: row.mobile,
    companyName: row.company_name,
    category: row.category,
    speciality: row.speciality,
    website: row.website,
    city: row.city,
    state: row.state,
    country: row.country,
    addressFull: row.address_full,
    businessDescription: row.business_description,
    keywords: row.keywords,
    socialLinks: row.social_links,
    profileUrl: row.profile_url,
    sourcePlatform: row.source_platform,
    sourceFile: row.source_file,
    chapterName: row.chapter_name,
    membershipStatus: row.membership_status,
    externalId: row.external_id,
    status: row.status,
    notes: row.notes,
    tags: row.tags || [],
    linkedLeadId: row.linked_lead_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/admin/scraped-contacts
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'content.read');
  if ('error' in auth) return auth.error;

  try {
    const searchParams = request.nextUrl.searchParams;
    const supabase = getSupabaseAdmin();

    // Filters
    const statusFilter = searchParams.get('status');
    const sourceFilter = searchParams.get('sourcePlatform');
    const sourceFileFilter = searchParams.get('sourceFile');
    const hasContact = searchParams.get('hasContact');
    const countryFilter = searchParams.get('country');
    const searchQuery = searchParams.get('search');

    // Sorting
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortDirection = searchParams.get('sortDirection') || 'desc';
    const sortFieldMap: Record<string, string> = {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      companyName: 'company_name',
      country: 'country',
      firstName: 'first_name',
      lastName: 'last_name',
    };
    const dbSortField = sortFieldMap[sortBy] || sortBy;

    // Build query
    let query = supabase.from('scraped_contacts').select('*', { count: 'exact' });

    if (statusFilter) {
      query = query.in('status', statusFilter.split(','));
    }
    if (sourceFilter) {
      query = query.in('source_platform', sourceFilter.split(','));
    }
    if (countryFilter) {
      query = query.eq('country', countryFilter);
    }
    if (sourceFileFilter) {
      query = query.eq('source_file', sourceFileFilter);
    }

    // Default filter: only contacts with email or phone
    if (hasContact !== 'false') {
      query = query.or('email.neq.null,phone.neq.null,mobile.neq.null');
    }

    if (searchQuery) {
      query = query.or(
        `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,company_name.ilike.%${searchQuery}%`
      );
    }

    query = query.order(dbSortField, { ascending: sortDirection === 'asc' });

    const { data, error, count } = await query;
    if (error) throw error;

    const contacts = (data || []).map(transformRow);

    // Compute stats from unfiltered data
    const { data: allData, error: statsError } = await supabase
      .from('scraped_contacts')
      .select('status, source_platform, source_file, email, phone, mobile, website, social_links, notes');
    if (statsError) throw statsError;

    const sourceFiles = new Set<string>();
    const stats = {
      total: allData?.length || 0,
      withEmail: allData?.filter((r) => r.email).length || 0,
      withPhone: allData?.filter((r) => r.phone || r.mobile).length || 0,
      byStatus: {} as Record<string, number>,
      bySource: {} as Record<string, number>,
      sourceFiles: [] as string[],
      noWebsite: 0,
      noSocial: 0,
      noEmail: 0,
      priorityHigh: 0,
      priorityMedium: 0,
      priorityLow: 0,
    };

    for (const row of allData || []) {
      stats.byStatus[row.status as string] = (stats.byStatus[row.status as string] || 0) + 1;
      stats.bySource[row.source_platform as string] = (stats.bySource[row.source_platform as string] || 0) + 1;
      if (row.source_file) sourceFiles.add(row.source_file as string);
      if (!row.website) stats.noWebsite++;
      if (!row.social_links) stats.noSocial++;
      if (!row.email) stats.noEmail++;
      const notes = (row.notes as string) || '';
      if (notes.includes('PRIORITY: HIGH')) stats.priorityHigh++;
      else if (notes.includes('PRIORITY: MEDIUM')) stats.priorityMedium++;
      else if (notes.includes('PRIORITY: LOW')) stats.priorityLow++;
    }
    stats.sourceFiles = [...sourceFiles].sort();

    return NextResponse.json({
      success: true,
      data: contacts,
      stats,
      total: count ?? contacts.length,
    });
  } catch (error) {
    console.error('Error fetching scraped contacts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch scraped contacts' },
      { status: 500 }
    );
  }
}

// POST /api/admin/scraped-contacts — Bulk import
export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'content.write');
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const { contacts, sourcePlatform = 'bni', sourceFile } = body as {
      contacts: Record<string, unknown>[];
      sourcePlatform?: SourcePlatform;
      sourceFile?: string;
    };

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'contacts array is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Process in batches of 100
    const batchSize = 100;
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);
      const records = batch.map((c) => {
        const ts = Date.now().toString(36);
        const rand = Math.random().toString(36).substr(2, 6);
        const id = `sc_${ts}_${rand}`;

        // Support both camelCase and snake_case input
        return {
          id,
          first_name: (c.firstName || c.first_name || '') as string,
          last_name: (c.lastName || c.last_name || '') as string,
          email: (c.email as string) || null,
          phone: (c.phone as string) || null,
          mobile: (c.mobile as string) || null,
          company_name: (c.companyName || c.company_name || c.company || '') as string || null,
          category: (c.category as string) || null,
          speciality: (c.speciality || c.specialty as string) || null,
          website: (c.website as string) || null,
          city: (c.city as string) || null,
          state: (c.state as string) || null,
          country: (c.country as string) || null,
          address_full: (c.addressFull || c.address_full || c.address as string) || null,
          business_description: (c.businessDescription || c.business_description as string) || null,
          keywords: (c.keywords as string) || null,
          social_links: (c.socialLinks || c.social_links as string) || null,
          profile_url: (c.profileUrl || c.profile_url as string) || null,
          source_platform: sourcePlatform,
          source_file: sourceFile || null,
          chapter_name: (c.chapterName || c.chapter_name || c.chapter as string) || null,
          membership_status: (c.membershipStatus || c.membership_status as string) || null,
          external_id: (c.externalId || c.external_id as string) || null,
          status: 'new' as ScrapedContactStatus,
          notes: '',
          tags: [] as string[],
        };
      });

      const { data, error } = await supabase
        .from('scraped_contacts')
        .upsert(records, { onConflict: 'source_platform,external_id', ignoreDuplicates: true })
        .select('id');

      if (error) {
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
      } else {
        inserted += data?.length || 0;
        skipped += records.length - (data?.length || 0);
      }
    }

    // Audit log
    await logAuditEvent({
      user_id: auth.user.id,
      user_name: auth.user.name,
      action: 'create',
      resource_type: 'scraped_contact',
      resource_id: 'bulk_import',
      details: { inserted, skipped, sourcePlatform, sourceFile, totalSubmitted: contacts.length },
      ip_address: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      data: { inserted, skipped, errors },
      message: `Imported ${inserted} contacts (${skipped} skipped)`,
    }, { status: 201 });
  } catch (error) {
    console.error('Error importing scraped contacts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to import contacts' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/scraped-contacts — Update contact
export async function PUT(request: NextRequest) {
  const auth = await requirePermission(request, 'content.write');
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Contact ID is required' },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updateData.status !== undefined) updates.status = updateData.status;
    if (updateData.notes !== undefined) updates.notes = updateData.notes;
    if (updateData.tags !== undefined) updates.tags = updateData.tags;
    if (updateData.linkedLeadId !== undefined) updates.linked_lead_id = updateData.linkedLeadId;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('scraped_contacts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 });
    }

    await logAuditEvent({
      user_id: auth.user.id,
      user_name: auth.user.name,
      action: 'update',
      resource_type: 'scraped_contact',
      resource_id: id,
      details: { updatedFields: Object.keys(updates), newStatus: updateData.status },
      ip_address: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      data: transformRow(data),
      message: 'Contact updated',
    });
  } catch (error) {
    console.error('Error updating scraped contact:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update contact' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/scraped-contacts
export async function DELETE(request: NextRequest) {
  const auth = await requirePermission(request, 'content.delete');
  if ('error' in auth) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids');

    if (!ids) {
      return NextResponse.json({ success: false, error: 'Contact ID(s) required' }, { status: 400 });
    }

    const idList = ids.split(',');
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('scraped_contacts').delete().in('id', idList);

    if (error) throw error;

    await logAuditEvent({
      user_id: auth.user.id,
      user_name: auth.user.name,
      action: 'delete',
      resource_type: 'scraped_contact',
      resource_id: idList.join(','),
      details: { count: idList.length },
      ip_address: getClientIP(request),
    });

    return NextResponse.json({ success: true, message: `Deleted ${idList.length} contact(s)` });
  } catch (error) {
    console.error('Error deleting scraped contacts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete contacts' },
      { status: 500 }
    );
  }
}
