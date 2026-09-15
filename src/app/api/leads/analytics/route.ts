/**
 * Lead Analytics API Route
 * Provides lead analytics and dashboard statistics (Supabase)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { BUDGET_VALUES } from '@/lib/admin/lead-types';
import type { LeadSource, LeadStatus, LeadPriority, BudgetRange } from '@/lib/admin/lead-types';
import { requirePermission } from '@/lib/admin-auth-middleware';

// GET /api/leads/analytics
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'sales.read');
  if ('error' in auth) return auth.error;

  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'full';

    const supabase = getSupabaseAdmin();
    const { data: leads, error } = await supabase
      .from('leads')
      .select('id, status, priority, source, lead_score, budget_range, created_at, updated_at, converted_to_client_at, assigned_to')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const allLeads = leads || [];

    if (type === 'dashboard') {
      return NextResponse.json({
        success: true,
        data: buildDashboardStats(allLeads),
      });
    }

    // Default: full analytics
    return NextResponse.json({
      success: true,
      data: buildFullAnalytics(allLeads),
    });
  } catch (error) {
    console.error('Error fetching lead analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lead analytics' },
      { status: 500 }
    );
  }
}

function buildFullAnalytics(leads: any[]) {
  const totalLeads = leads.length;
  const newLeads = leads.filter((l) => l.status === 'new').length;
  const qualifiedLeads = leads.filter((l) =>
    ['qualified', 'discovery_scheduled', 'discovery_completed', 'proposal_sent', 'negotiating'].includes(l.status)
  ).length;
  const convertedLeads = leads.filter((l) => l.status === 'won').length;
  const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
  const averageLeadScore =
    totalLeads > 0 ? leads.reduce((sum, l) => sum + (l.lead_score || 0), 0) / totalLeads : 0;

  // Group by source
  const leadsBySource = leads.reduce((acc, l) => {
    acc[l.source] = (acc[l.source] || 0) + 1;
    return acc;
  }, {} as Record<LeadSource, number>);

  // Group by status
  const leadsByStatus = leads.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {} as Record<LeadStatus, number>);

  // Group by priority
  const leadsByPriority = leads.reduce((acc, l) => {
    acc[l.priority] = (acc[l.priority] || 0) + 1;
    return acc;
  }, {} as Record<LeadPriority, number>);

  // Average time to conversion
  const convertedWithTime = leads.filter(
    (l) => l.converted_to_client_at && l.created_at
  );
  const averageTimeToConversion =
    convertedWithTime.length > 0
      ? convertedWithTime.reduce((sum, l) => {
          const diff =
            new Date(l.converted_to_client_at).getTime() -
            new Date(l.created_at).getTime();
          return sum + diff / (1000 * 60 * 60 * 24);
        }, 0) / convertedWithTime.length
      : 0;

  // Monthly trends (last 6 months)
  const monthlyTrends = calculateMonthlyTrends(leads);

  return {
    totalLeads,
    newLeads,
    qualifiedLeads,
    convertedLeads,
    conversionRate,
    averageLeadScore,
    leadsBySource,
    leadsByStatus,
    leadsByPriority,
    averageTimeToConversion,
    monthlyTrends,
  };
}

function buildDashboardStats(leads: any[]) {
  const analytics = buildFullAnalytics(leads);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentLeads = leads.filter(
    (l) => new Date(l.created_at) >= sevenDaysAgo
  ).length;

  const hotLeads = leads.filter((l) => l.priority === 'hot').length;

  const topSources = Object.entries(analytics.leadsBySource)
    .map(([source, count]) => ({
      source: source as LeadSource,
      count: count as number,
      percentage: analytics.totalLeads > 0 ? ((count as number) / analytics.totalLeads) * 100 : 0,
    }))
    .sort((a, b) => (b.count as number) - (a.count as number))
    .slice(0, 5);

  const recentActivity = leads
    .slice(0, 10)
    .map((l) => ({
      leadId: l.id,
      action: `Lead ${l.status}`,
      timestamp: l.updated_at,
      user: l.assigned_to || 'System',
    }));

  const averageLeadValue =
    leads.reduce((sum, l) => {
      const budgetRange = BUDGET_VALUES[l.budget_range as BudgetRange] || BUDGET_VALUES['not_disclosed'];
      const midpoint = (budgetRange.min + budgetRange.max) / 2;
      return sum + midpoint;
    }, 0) / (leads.length || 1);

  return {
    totalLeads: analytics.totalLeads,
    hotLeads,
    recentLeads,
    conversionRate: analytics.conversionRate,
    averageLeadValue,
    topSources,
    recentActivity,
  };
}

function calculateMonthlyTrends(leads: any[]) {
  const months = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

    const monthLeads = leads.filter((l) => {
      const d = new Date(l.created_at);
      return d >= month && d < nextMonth;
    });

    const conversions = monthLeads.filter((l) => l.status === 'won').length;

    months.push({
      month: month.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
      leads: monthLeads.length,
      conversions,
    });
  }

  return months;
}
