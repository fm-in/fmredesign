/**
 * Clients API Route
 * Handles client operations with Supabase (single source of truth)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { toCamelCaseKeys } from '@/lib/supabase-utils';
import { requireAdminAuth, requirePermission } from '@/lib/admin-auth-middleware';
import { createClientSchema, updateClientSchema, validateBody } from '@/lib/validations/schemas';
import { logAuditEvent, getClientIP } from '@/lib/admin/audit-log';
import bcrypt from 'bcryptjs';

/** Generate a URL-safe slug from a company name */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Ensure slug is unique by appending a counter if needed */
async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const supabase = getSupabaseAdmin();
  let slug = base;
  let counter = 1;

  while (true) {
    let query = supabase.from('clients').select('id').eq('slug', slug);
    if (excludeId) query = query.neq('id', excludeId);
    const { data } = await query.limit(1);
    if (!data || data.length === 0) return slug;
    counter++;
    slug = `${base}-${counter}`;
  }
}

export async function GET(request: NextRequest) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const supabase = getSupabaseAdmin();

    // Single resource fetch by ID
    if (id) {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, email, phone, address, city, state, zip_code, country, gst_number, industry, company_size, website, status, health, account_manager, contract_type, contract_value, contract_start_date, contract_end_date, billing_cycle, services, created_at, updated_at, total_value, tags, notes, brand_name, parent_client_id, is_brand_group, logo_url, brand_colors, brand_fonts, tagline, brand_guidelines_url, content_pillars, content_events, content_preferences, competitor_social_urls, auto_invoice, auto_invoice_day, auto_invoice_send, auto_invoice_template, auto_invoice_currency, auto_invoice_tax_rate, auto_invoice_notes, auto_invoice_terms')
        .eq('id', id)
        .single();

      if (error || !data) {
        return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
      }

      const CLIENT_DEFAULTS = {
        contentPillars: [] as string[],
        contentEvents: [] as string[],
        contentPreferences: null,
        competitorSocialUrls: [] as string[],
      };
      const formatted = toCamelCaseKeys(data, CLIENT_DEFAULTS);

      return NextResponse.json({ success: true, data: formatted });
    }

    const selectCols = 'id, name, email, phone, address, city, state, zip_code, country, gst_number, industry, company_size, website, status, health, account_manager, contract_type, contract_value, contract_start_date, contract_end_date, billing_cycle, services, created_at, updated_at, total_value, tags, notes, brand_name, parent_client_id, is_brand_group, logo_url, brand_colors, brand_fonts, tagline, brand_guidelines_url, content_pillars, content_events, content_preferences, competitor_social_urls, auto_invoice, auto_invoice_day, auto_invoice_send, auto_invoice_template, auto_invoice_currency, auto_invoice_tax_rate, auto_invoice_notes, auto_invoice_terms';

    // Pagination: only active when `page` param is provided (backwards compat)
    const pageParam = searchParams.get('page');
    const isPaginated = pageParam !== null;
    const page = Math.max(1, parseInt(pageParam || '1', 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(searchParams.get('pageSize') || '25', 10)));

    let clients;
    let totalItems = 0;

    if (isPaginated) {
      // Get total count first
      const { count, error: countError } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });
      if (countError) throw countError;
      totalItems = count || 0;

      // Then get paginated data
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, error } = await supabase
        .from('clients')
        .select(selectCols)
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      clients = data;
    } else {
      const { data, error } = await supabase
        .from('clients')
        .select(selectCols)
        .order('created_at', { ascending: false });
      if (error) throw error;
      clients = data;
    }

    // Transform snake_case to camelCase for frontend compatibility
    const clientDefaults = {
      contentPillars: [] as string[],
      contentEvents: [] as string[],
      contentPreferences: null,
      competitorSocialUrls: [] as string[],
    };
    const formatted = (clients || []).map((c) => toCamelCaseKeys(c, clientDefaults));

    const body: Record<string, unknown> = {
      success: true,
      data: formatted,
    };

    if (isPaginated) {
      body.pagination = {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      };
    }

    const response = NextResponse.json(body);

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'clients.write');
  if ('error' in auth) return auth.error;

  try {
    const rawBody = await request.json();
    const validation = validateBody(createClientSchema, rawBody);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }
    const formData = rawBody;

    if (!formData.id) {
      formData.id = `client-${Date.now()}`;
    }

    // Build the structured client data for the response
    const clientData = {
      id: formData.id,
      name: formData.name || formData.company,
      logo: formData.logo || undefined,
      industry: formData.industry || 'other',
      website: formData.website || undefined,
      description: formData.description || undefined,
      primaryContact: {
        id: `contact-${Date.now()}`,
        name: formData.name || 'Primary Contact',
        email: formData.email,
        phone: formData.phone || undefined,
        role: formData.contactRole || 'Primary Contact',
        department: formData.department || undefined,
        isPrimary: true,
        linkedInUrl: formData.linkedIn || undefined,
      },
      additionalContacts: [],
      companySize: formData.companySize || 'medium',
      founded: formData.founded || undefined,
      headquarters: {
        street: formData.address || '',
        city: formData.city || '',
        state: formData.state || '',
        zipCode: formData.zipCode || '',
        country: formData.country || 'India',
      },
      accountManager: formData.accountManager || 'admin',
      status: formData.status || 'active',
      health: formData.health || 'good',
      contractDetails: {
        type: formData.contractType || 'project',
        startDate: new Date().toISOString(),
        endDate: formData.contractEndDate || undefined,
        value: parseFloat(formData.totalValue) || 0,
        currency: 'INR',
        billingCycle: formData.billingCycle || 'monthly',
        retainerAmount: formData.retainerAmount || undefined,
        services: formData.services || [],
        terms: formData.terms || undefined,
        isActive: true,
      },
      gstNumber: formData.gstNumber || undefined,
      onboardedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: formData.tags || [],
      notes: [],
    };

    // Write to Supabase
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('clients').upsert([
      {
        id: clientData.id,
        name: clientData.name,
        email: clientData.primaryContact.email,
        phone: clientData.primaryContact.phone || null,
        industry: clientData.industry,
        website: formData.website || null,
        address: clientData.headquarters.street || null,
        city: clientData.headquarters.city || null,
        state: clientData.headquarters.state || null,
        zip_code: clientData.headquarters.zipCode || null,
        country: clientData.headquarters.country || null,
        gst_number: clientData.gstNumber || null,
        company_size: clientData.companySize,
        status: clientData.status,
        health: clientData.health,
        account_manager: clientData.accountManager,
        contract_type: clientData.contractDetails.type,
        contract_value: clientData.contractDetails.value,
        contract_start_date: clientData.contractDetails.startDate,
        contract_end_date: formData.contractEndDate || null,
        billing_cycle: clientData.contractDetails.billingCycle,
        total_value: clientData.contractDetails.value,
        portal_password: formData.portalPassword ? await bcrypt.hash(formData.portalPassword, 12) : null,
        slug: await uniqueSlug(slugify(clientData.name)),
        services: Array.isArray(clientData.contractDetails.services)
          ? clientData.contractDetails.services
          : null,
        tags: Array.isArray(clientData.tags) ? clientData.tags : null,
        brand_name: formData.brandName || null,
        parent_client_id: formData.parentClientId || null,
        is_brand_group: formData.isBrandGroup || false,
        logo_url: formData.logoUrl || null,
        brand_colors: Array.isArray(formData.brandColors) ? formData.brandColors : null,
        brand_fonts: Array.isArray(formData.brandFonts) ? formData.brandFonts : null,
        tagline: formData.tagline || null,
        brand_guidelines_url: formData.brandGuidelinesUrl || null,
      },
    ]);

    if (error) throw error;

    // Fire-and-forget audit log
    await logAuditEvent({
      user_id: auth.user.id,
      user_name: auth.user.name,
      action: 'create',
      resource_type: 'client',
      resource_id: clientData.id,
      details: { name: clientData.name, email: clientData.primaryContact.email },
      ip_address: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      data: clientData,
      message: 'Client created successfully',
    });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create client' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requirePermission(request, 'clients.write');
  if ('error' in auth) return auth.error;

  try {
    const rawBody = await request.json();
    const validation = validateBody(updateClientSchema, rawBody);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }
    const { id, ...formData } = rawBody;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Client ID is required' },
        { status: 400 }
      );
    }

    const updates: Record<string, any> = {};
    if (formData.name) {
      updates.name = formData.name;
      updates.slug = await uniqueSlug(slugify(formData.name), id);
    }
    if (formData.email) updates.email = formData.email;
    if (formData.phone !== undefined) updates.phone = formData.phone || null;
    if (formData.industry) updates.industry = formData.industry;
    if (formData.website !== undefined) updates.website = formData.website || null;
    if (formData.address !== undefined) updates.address = formData.address || null;
    if (formData.city !== undefined) updates.city = formData.city || null;
    if (formData.state !== undefined) updates.state = formData.state || null;
    if (formData.zipCode !== undefined) updates.zip_code = formData.zipCode || null;
    if (formData.country !== undefined) updates.country = formData.country || null;
    if (formData.gstNumber !== undefined) updates.gst_number = formData.gstNumber || null;
    if (formData.companySize) updates.company_size = formData.companySize;
    if (formData.status) updates.status = formData.status;
    if (formData.health) updates.health = formData.health;
    if (formData.accountManager) updates.account_manager = formData.accountManager;
    if (formData.contractType) updates.contract_type = formData.contractType;
    if (formData.contractValue !== undefined) updates.contract_value = parseFloat(formData.contractValue) || 0;
    if (formData.contractStartDate) updates.contract_start_date = formData.contractStartDate;
    if (formData.contractEndDate !== undefined) updates.contract_end_date = formData.contractEndDate || null;
    if (formData.billingCycle) updates.billing_cycle = formData.billingCycle;
    if (formData.totalValue !== undefined) updates.total_value = parseFloat(formData.totalValue) || 0;
    if (formData.services) updates.services = formData.services;
    if (formData.tags) updates.tags = formData.tags;
    if (formData.brandName !== undefined) updates.brand_name = formData.brandName || null;
    if (formData.parentClientId !== undefined) updates.parent_client_id = formData.parentClientId || null;
    if (formData.isBrandGroup !== undefined) updates.is_brand_group = formData.isBrandGroup || false;
    if (formData.logoUrl !== undefined) updates.logo_url = formData.logoUrl || null;
    if (formData.brandColors !== undefined) updates.brand_colors = Array.isArray(formData.brandColors) ? formData.brandColors : null;
    if (formData.brandFonts !== undefined) updates.brand_fonts = Array.isArray(formData.brandFonts) ? formData.brandFonts : null;
    if (formData.tagline !== undefined) updates.tagline = formData.tagline || null;
    if (formData.brandGuidelinesUrl !== undefined) updates.brand_guidelines_url = formData.brandGuidelinesUrl || null;
    if (formData.contentPillars !== undefined) updates.content_pillars = formData.contentPillars;
    if (formData.contentEvents !== undefined) updates.content_events = formData.contentEvents;
    if (formData.contentPreferences !== undefined) updates.content_preferences = formData.contentPreferences;
    if (formData.competitorSocialUrls !== undefined) updates.competitor_social_urls = formData.competitorSocialUrls;
    // Auto-invoice fields
    if (formData.autoInvoice !== undefined) updates.auto_invoice = !!formData.autoInvoice;
    if (formData.autoInvoiceDay !== undefined) updates.auto_invoice_day = parseInt(formData.autoInvoiceDay, 10) || 1;
    if (formData.autoInvoiceSend !== undefined) updates.auto_invoice_send = !!formData.autoInvoiceSend;
    if (formData.autoInvoiceTemplate !== undefined) updates.auto_invoice_template = formData.autoInvoiceTemplate;
    if (formData.autoInvoiceCurrency !== undefined) updates.auto_invoice_currency = formData.autoInvoiceCurrency || 'INR';
    if (formData.autoInvoiceTaxRate !== undefined) updates.auto_invoice_tax_rate = parseFloat(formData.autoInvoiceTaxRate) || 18;
    if (formData.autoInvoiceNotes !== undefined) updates.auto_invoice_notes = formData.autoInvoiceNotes || null;
    if (formData.autoInvoiceTerms !== undefined) updates.auto_invoice_terms = formData.autoInvoiceTerms || null;
    if (formData.portalPassword !== undefined) {
      updates.portal_password = formData.portalPassword
        ? await bcrypt.hash(formData.portalPassword, 12)
        : null;
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    // Build response data matching original format
    const clientData = {
      id,
      name: formData.name,
      primaryContact: {
        id: `contact-${Date.now()}`,
        name: formData.name || 'Primary Contact',
        email: formData.email,
        phone: formData.phone || undefined,
        role: formData.contactRole || 'Primary Contact',
        isPrimary: true,
      },
      additionalContacts: [],
      companySize: formData.companySize || 'medium',
      headquarters: {
        street: formData.address || '',
        city: formData.city || '',
        state: formData.state || '',
        zipCode: formData.zipCode || '',
        country: formData.country || 'India',
      },
      accountManager: formData.accountManager || 'admin',
      status: formData.status || 'active',
      health: formData.health || 'good',
      contractDetails: {
        type: formData.contractType || 'project',
        startDate: formData.contractStartDate || new Date().toISOString(),
        endDate: formData.contractEndDate || undefined,
        value: parseFloat(formData.contractValue) || 0,
        currency: 'INR',
        billingCycle: formData.billingCycle || 'monthly',
        services: formData.services || [],
        isActive: true,
      },
      gstNumber: formData.gstNumber || undefined,
      industry: formData.industry || 'other',
      website: formData.website || undefined,
      updatedAt: new Date().toISOString(),
      tags: formData.tags || [],
      notes: formData.notes || [],
    };

    // Fire-and-forget audit log
    await logAuditEvent({
      user_id: auth.user.id,
      user_name: auth.user.name,
      action: 'update',
      resource_type: 'client',
      resource_id: id,
      details: { name: formData.name, updatedFields: Object.keys(updates) },
      ip_address: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      data: clientData,
      message: 'Client updated successfully',
    });
  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update client' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requirePermission(request, 'clients.delete');
  if ('error' in auth) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('id');

    if (!clientId) {
      return NextResponse.json(
        { success: false, error: 'Client ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('clients').delete().eq('id', clientId);

    if (error) throw error;

    // Fire-and-forget audit log
    await logAuditEvent({
      user_id: auth.user.id,
      user_name: auth.user.name,
      action: 'delete',
      resource_type: 'client',
      resource_id: clientId,
      details: {},
      ip_address: getClientIP(request),
    });

    return NextResponse.json({
      success: true,
      message: `Client with ID ${clientId} deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete client' },
      { status: 500 }
    );
  }
}
