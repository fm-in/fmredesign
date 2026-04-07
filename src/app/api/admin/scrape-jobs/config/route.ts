/**
 * Scrape Jobs Config API
 * Manage source configs (credentials) and rotation configs + suggestions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAdminAuth } from '@/lib/admin-auth-middleware';
import { logAuditEvent, getAuditUser, getClientIP } from '@/lib/admin/audit-log';

/**
 * Mask sensitive values in source config before sending to client.
 * Only the last 4 chars of API keys are visible.
 */
function maskConfigSecrets(config: Record<string, unknown>): Record<string, unknown> {
  if (!config || typeof config !== 'object') return config;
  const masked = { ...config };
  for (const key of Object.keys(masked)) {
    const val = masked[key];
    if (typeof val === 'string' && (key.includes('key') || key.includes('token') || key.includes('secret'))) {
      masked[key] = val.length > 4 ? `${'•'.repeat(val.length - 4)}${val.slice(-4)}` : '••••';
    }
  }
  return masked;
}

function transformSourceConfig(row: Record<string, unknown>, maskSecrets = true) {
  const config = row.config as Record<string, unknown> | undefined;
  return {
    id: row.id,
    sourcePlatform: row.source_platform,
    config: maskSecrets && config ? maskConfigSecrets(config) : config,
    isValid: row.is_valid,
    lastValidatedAt: row.last_validated_at,
    validationError: row.validation_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformRotationConfig(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    sourcePlatform: row.source_platform,
    countries: row.countries,
    industries: row.industries,
    currentCountryIndex: row.current_country_index,
    currentIndustryIndex: row.current_industry_index,
    runsPerDay: row.runs_per_day,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/admin/scrape-jobs/config
export async function GET(request: NextRequest) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  try {
    const supabase = getSupabaseAdmin();
    const type = request.nextUrl.searchParams.get('type');

    // Suggestions mode
    if (type === 'suggestions') {
      const { data: contacts } = await supabase
        .from('scraped_contacts')
        .select('country, category, source_platform, email, phone');

      const countryStats: Record<string, { total: number; withEmail: number }> = {};
      const categoryStats: Record<string, { total: number; withEmail: number }> = {};

      for (const c of contacts || []) {
        const country = (c.country as string) || 'Unknown';
        const category = (c.category as string) || 'Unknown';
        const hasEmail = !!c.email;

        if (!countryStats[country]) countryStats[country] = { total: 0, withEmail: 0 };
        countryStats[country].total++;
        if (hasEmail) countryStats[country].withEmail++;

        if (!categoryStats[category]) categoryStats[category] = { total: 0, withEmail: 0 };
        categoryStats[category].total++;
        if (hasEmail) categoryStats[category].withEmail++;
      }

      // Known BNI countries with no data yet
      const knownCountries = [
        'India', 'Philippines', 'Australia', 'Italy', 'United States',
        'United Kingdom', 'UAE', 'Singapore', 'Malaysia', 'Germany',
        'France', 'Canada', 'Brazil', 'South Africa', 'New Zealand',
      ];

      const suggestions = [];

      for (const country of knownCountries) {
        if (!countryStats[country] || countryStats[country].total === 0) {
          suggestions.push({
            type: 'country',
            value: country,
            reason: `0 contacts from ${country} — known BNI presence`,
          });
        }
      }

      // High email rate categories
      const sortedCategories = Object.entries(categoryStats)
        .filter(([, s]) => s.total >= 5)
        .sort((a, b) => (b[1].withEmail / b[1].total) - (a[1].withEmail / a[1].total))
        .slice(0, 5);

      for (const [cat, stats] of sortedCategories) {
        const rate = Math.round((stats.withEmail / stats.total) * 100);
        suggestions.push({
          type: 'industry',
          value: cat,
          reason: `${rate}% email rate (${stats.withEmail}/${stats.total} contacts)`,
          metric: `${rate}%`,
        });
      }

      return NextResponse.json({ success: true, data: suggestions });
    }

    // Default: return source configs + rotation configs
    const [sourceResult, rotationResult] = await Promise.all([
      supabase.from('scrape_source_config').select('*').order('source_platform'),
      supabase.from('scrape_rotation_config').select('*').order('created_at', { ascending: false }),
    ]);

    if (sourceResult.error) throw sourceResult.error;
    if (rotationResult.error) throw rotationResult.error;

    return NextResponse.json({
      success: true,
      data: {
        sourceConfigs: (sourceResult.data || []).map((row) => transformSourceConfig(row)),
        rotationConfigs: (rotationResult.data || []).map(transformRotationConfig),
      },
    });
  } catch (error) {
    console.error('Error fetching scrape config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch config' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/scrape-jobs/config — Update source or rotation config
export async function PUT(request: NextRequest) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { type, id, ...updateData } = body;
    const supabase = getSupabaseAdmin();

    if (type === 'source') {
      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (updateData.config !== undefined) updates.config = updateData.config;
      if (updateData.isValid !== undefined) updates.is_valid = updateData.isValid;
      if (updateData.lastValidatedAt !== undefined) updates.last_validated_at = updateData.lastValidatedAt;
      if (updateData.validationError !== undefined) updates.validation_error = updateData.validationError;

      const { data, error } = await supabase
        .from('scrape_source_config')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const auditUser = getAuditUser(request);
      await logAuditEvent({
        ...auditUser,
        action: 'update',
        resource_type: 'scrape_source_config',
        resource_id: id,
        details: { sourcePlatform: data.source_platform },
        ip_address: getClientIP(request),
      });

      return NextResponse.json({ success: true, data: transformSourceConfig(data) });
    }

    if (type === 'rotation') {
      // Create or update
      if (id) {
        const updates: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };
        if (updateData.name !== undefined) updates.name = updateData.name;
        if (updateData.countries !== undefined) updates.countries = updateData.countries;
        if (updateData.industries !== undefined) updates.industries = updateData.industries;
        if (updateData.runsPerDay !== undefined) updates.runs_per_day = updateData.runsPerDay;
        if (updateData.isActive !== undefined) updates.is_active = updateData.isActive;
        if (updateData.currentCountryIndex !== undefined) updates.current_country_index = updateData.currentCountryIndex;
        if (updateData.currentIndustryIndex !== undefined) updates.current_industry_index = updateData.currentIndustryIndex;

        const { data, error } = await supabase
          .from('scrape_rotation_config')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        const auditUser = getAuditUser(request);
        await logAuditEvent({
          ...auditUser,
          action: 'update',
          resource_type: 'scrape_rotation_config',
          resource_id: id,
          details: { updatedFields: Object.keys(updates).filter(k => k !== 'updated_at') },
          ip_address: getClientIP(request),
        });

        return NextResponse.json({ success: true, data: transformRotationConfig(data) });
      } else {
        // Create new
        const { data, error } = await supabase
          .from('scrape_rotation_config')
          .insert({
            name: updateData.name || 'New Rotation',
            source_platform: updateData.sourcePlatform || 'bni',
            countries: updateData.countries || [],
            industries: updateData.industries || [],
            runs_per_day: updateData.runsPerDay || 3,
          })
          .select()
          .single();

        if (error) throw error;

        const auditUser = getAuditUser(request);
        await logAuditEvent({
          ...auditUser,
          action: 'create',
          resource_type: 'scrape_rotation_config',
          resource_id: data.id as string,
          details: { name: updateData.name, sourcePlatform: updateData.sourcePlatform },
          ip_address: getClientIP(request),
        });

        return NextResponse.json(
          { success: true, data: transformRotationConfig(data) },
          { status: 201 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'type must be "source" or "rotation"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating scrape config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update config' },
      { status: 500 }
    );
  }
}

// DELETE rotation config
export async function DELETE(request: NextRequest) {
  const authError = await requireAdminAuth(request);
  if (authError) return authError;

  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('scrape_rotation_config')
      .delete()
      .eq('id', id);

    if (error) throw error;

    const auditUser = getAuditUser(request);
    await logAuditEvent({
      ...auditUser,
      action: 'delete',
      resource_type: 'scrape_rotation_config',
      resource_id: id,
      details: {},
      ip_address: getClientIP(request),
    });

    return NextResponse.json({ success: true, message: 'Rotation config deleted' });
  } catch (error) {
    console.error('Error deleting rotation config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete config' },
      { status: 500 }
    );
  }
}
