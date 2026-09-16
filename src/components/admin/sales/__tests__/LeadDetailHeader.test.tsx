import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LeadDetailHeader } from '../LeadDetailHeader';
import type { SalesLead, SequenceStartInfo } from '@/lib/sales/api-types';

const lead: SalesLead = {
  id: 'lead_1',
  name: 'Priya Shah',
  email: 'priya@example.com',
  phone: '98332 57659',
  phoneE164: '+919833257659',
  company: 'Acme',
  website: null,
  status: 'new',
  priority: 'warm',
  leadScore: 50,
  source: 'website_form',
  sourceDetail: null,
  ownerId: 'user-1',
  assignedTo: 'Asha',
  projectDescription: null,
  budgetRange: null,
  timeline: null,
  customFields: null,
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  sequenceStatus: null,
  sequenceStopReason: null,
  firstResponseAt: null,
  lastActivityAt: null,
  dealValue: null,
  currency: null,
  lostReason: null,
  clientId: null,
  createdAt: '2026-09-15T04:00:00.000Z',
};

const baseProps = {
  lead,
  owners: [],
  canAssign: false,
  userId: 'user-1',
  suppressed: false,
  onStageChange: vi.fn().mockResolvedValue(true),
  onOwnerChange: vi.fn().mockResolvedValue(true),
  onStopSequence: vi.fn().mockResolvedValue(true),
};

const canStart: SequenceStartInfo = { recommended: 'ad-lead-v1', canStart: true, blockedReason: null };
const blocked: SequenceStartInfo = {
  recommended: 'enquiry-v1',
  canStart: false,
  blockedReason: "Automation is switched off in Settings, so follow-ups can't be sent.",
};

describe('LeadDetailHeader — Start follow-ups panel', () => {
  it('preselects the recommended sequence in the select', () => {
    render(<LeadDetailHeader {...baseProps} sequences={canStart} onStartSequence={vi.fn().mockResolvedValue(true)} />);
    const select = screen.getByLabelText(/follow-up set/i) as HTMLSelectElement;
    expect(select.value).toBe('ad-lead-v1');
    expect(screen.getByRole('option', { name: 'Ad lead' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Project brief' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Enquiry' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Scorecard' })).toBeInTheDocument();
  });

  it('shows the Start follow-ups button when it can start', () => {
    render(<LeadDetailHeader {...baseProps} sequences={canStart} onStartSequence={vi.fn().mockResolvedValue(true)} />);
    expect(screen.getByRole('button', { name: /start follow-ups/i })).toBeInTheDocument();
  });

  it('shows the blocked reason instead of the button when it cannot start', () => {
    render(<LeadDetailHeader {...baseProps} sequences={blocked} onStartSequence={vi.fn().mockResolvedValue(true)} />);
    expect(screen.queryByRole('button', { name: /start follow-ups/i })).not.toBeInTheDocument();
    expect(screen.getByText("Automation is switched off in Settings, so follow-ups can't be sent.")).toBeInTheDocument();
    // The select is still shown so a salesperson can see (and pick) the sets even while blocked.
    expect(screen.getByLabelText(/follow-up set/i)).toBeInTheDocument();
  });

  it('posts the selected key, not just the recommended one, when starting', async () => {
    const onStartSequence = vi.fn().mockResolvedValue(true);
    render(<LeadDetailHeader {...baseProps} sequences={canStart} onStartSequence={onStartSequence} />);

    fireEvent.change(screen.getByLabelText(/follow-up set/i), { target: { value: 'scorecard-v1' } });
    fireEvent.click(screen.getByRole('button', { name: /start follow-ups/i }));

    await waitFor(() => expect(onStartSequence).toHaveBeenCalledWith('scorecard-v1'));
  });

  it('disables the select and button while starting', async () => {
    let resolveStart: (value: boolean) => void = () => undefined;
    const onStartSequence = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          resolveStart = resolve;
        })
    );
    render(<LeadDetailHeader {...baseProps} sequences={canStart} onStartSequence={onStartSequence} />);

    fireEvent.click(screen.getByRole('button', { name: /start follow-ups/i }));

    const button = screen.getByRole('button', { name: /starting/i });
    expect(button).toBeDisabled();
    expect(screen.getByLabelText(/follow-up set/i)).toBeDisabled();

    resolveStart(true);
    await waitFor(() => expect(screen.getByRole('button', { name: /start follow-ups/i })).not.toBeDisabled());
  });

  it('does not show the panel once a sequence has already run', () => {
    render(
      <LeadDetailHeader
        {...baseProps}
        lead={{ ...lead, sequenceStatus: 'active' }}
        sequences={canStart}
        onStartSequence={vi.fn().mockResolvedValue(true)}
      />
    );
    expect(screen.queryByLabelText(/follow-up set/i)).not.toBeInTheDocument();
    expect(screen.getByText('Follow-ups running')).toBeInTheDocument();
  });
});
