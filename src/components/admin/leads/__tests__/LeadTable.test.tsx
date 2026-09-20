import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LeadTable } from '../LeadTable';
import type { LeadProfile } from '@/lib/admin/lead-types';

/**
 * A lead created from a WhatsApp message: no form was filled in, so there is
 * no project type, budget, timeline, company, website or email.
 *
 * Every lead before this one came from a form that always set those fields, so
 * the table read them unguarded and `null.replace` took the whole list down —
 * an error boundary showed "Lead List" failed while the lead itself opened
 * fine from a notification. A direct Cal.com booking would have done the same;
 * it simply had not happened yet.
 */
const sparse = {
  id: 'lead_wa',
  name: '+919833257659',
  email: null,
  phone: '+919833257659',
  company: null,
  website: null,
  source: 'whatsapp',
  status: 'new',
  priority: 'warm',
  leadScore: 10,
  projectType: null,
  projectDescription: null,
  budgetRange: null,
  timeline: null,
  companySize: null,
  primaryChallenge: null,
  additionalChallenges: [],
  tags: [],
  customFields: {},
  assignedTo: null,
  createdAt: '2026-09-20T10:00:00.000Z',
  updatedAt: '2026-09-20T10:00:00.000Z',
} as unknown as LeadProfile;

const props = {
  loading: false,
  selectedLeads: new Set<string>(),
  onSelectedLeadsChange: () => undefined,
  selectedLead: null,
  onSelectLead: () => undefined,
  onUpdateStatus: () => undefined,
  onConvertToClient: () => undefined,
  onAddLead: () => undefined,
  searchQuery: '',
  filters: {} as never,
  formatStatus: (s: string) => s,
  formatPriority: (p: string) => p,
};

describe('LeadTable with a lead that filled in no form', () => {
  it('renders the table view without throwing', () => {
    render(<LeadTable {...props} leads={[sparse]} viewMode="table" />);
    // Twice over: `normalise.ts` falls back to the phone number for the name.
    expect(screen.getAllByText('+919833257659').length).toBeGreaterThan(0);
  });

  it('renders the card view without throwing', () => {
    render(<LeadTable {...props} leads={[sparse]} viewMode="cards" />);
    expect(screen.getAllByText('+919833257659').length).toBeGreaterThan(0);
  });

  it('renders the detail drawer without throwing', () => {
    render(<LeadTable {...props} leads={[sparse]} viewMode="table" selectedLead={sparse} />);
    expect(screen.getAllByText('+919833257659').length).toBeGreaterThan(0);
  });

  it('shows a dash for the missing fields rather than blank or "null"', () => {
    const { container } = render(<LeadTable {...props} leads={[sparse]} viewMode="table" />);
    expect(container.textContent).toContain('—');
    expect(container.textContent).not.toContain('null');
  });

  it('still renders a fully populated lead normally', () => {
    const full = {
      ...sparse,
      id: 'lead_form',
      name: 'Priya Shah',
      projectType: 'web_development',
      budgetRange: '10k_25k',
      timeline: 'next_quarter',
    } as unknown as LeadProfile;

    const { container } = render(<LeadTable {...props} leads={[full]} viewMode="table" />);
    expect(container.textContent).toContain('web development');
    expect(container.textContent).toContain('10K 25K');
    expect(container.textContent).toContain('next quarter');
  });
});
