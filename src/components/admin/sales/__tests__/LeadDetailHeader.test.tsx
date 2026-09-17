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
  sequenceKey: null,
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

const canStart: SequenceStartInfo = {
  recommended: 'ad-lead-v1',
  canStart: true,
  blockedReason: null,
  starting: false,
  lastStartFailed: false,
};
const blocked: SequenceStartInfo = {
  recommended: 'enquiry-v1',
  canStart: false,
  blockedReason: "Automation is switched off in Settings, so follow-ups can't be sent.",
  starting: false,
  lastStartFailed: false,
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

  it('shows "Choose a set" and cannot start when there is no recommendation', async () => {
    const onStartSequence = vi.fn().mockResolvedValue(true);
    render(
      <LeadDetailHeader
        {...baseProps}
        sequences={{ ...canStart, recommended: null }}
        onStartSequence={onStartSequence}
      />
    );

    const select = screen.getByLabelText(/follow-up set/i) as HTMLSelectElement;
    expect(select.value).toBe('');
    expect(screen.getByRole('option', { name: 'Choose a set' })).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /start follow-ups/i });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onStartSequence).not.toHaveBeenCalled();

    fireEvent.change(select, { target: { value: 'enquiry-v1' } });
    expect(screen.getByRole('button', { name: /start follow-ups/i })).not.toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /start follow-ups/i }));
    await waitFor(() => expect(onStartSequence).toHaveBeenCalledWith('enquiry-v1'));
  });

  it('does not offer the "Choose a set" placeholder when a set is recommended', () => {
    render(<LeadDetailHeader {...baseProps} sequences={canStart} onStartSequence={vi.fn().mockResolvedValue(true)} />);
    expect(screen.queryByRole('option', { name: 'Choose a set' })).not.toBeInTheDocument();
  });

  it('shows "Starting follow-ups…" instead of the select and button while the start is queued', () => {
    render(
      <LeadDetailHeader
        {...baseProps}
        sequences={{ ...canStart, starting: true }}
        onStartSequence={vi.fn().mockResolvedValue(true)}
      />
    );
    expect(screen.getByText('Starting follow-ups…')).toBeInTheDocument();
    expect(screen.queryByLabelText(/follow-up set/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /start follow-ups/i })).not.toBeInTheDocument();
  });
});

describe('LeadDetailHeader — a start that did not go through', () => {
  const RETRY_NOTE = "The last start didn't go through, so you can try again.";

  it('shows the retry note above a usable select and Start button', async () => {
    const onStartSequence = vi.fn().mockResolvedValue(true);
    render(
      <LeadDetailHeader {...baseProps} sequences={{ ...canStart, lastStartFailed: true }} onStartSequence={onStartSequence} />
    );

    const note = screen.getByText(RETRY_NOTE);
    const select = screen.getByLabelText(/follow-up set/i) as HTMLSelectElement;
    const button = screen.getByRole('button', { name: /start follow-ups/i });
    expect(note.compareDocumentPosition(select) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(select).not.toBeDisabled();
    expect(select.value).toBe('ad-lead-v1');
    expect(button).not.toBeDisabled();
    expect(screen.queryByText('Starting follow-ups…')).not.toBeInTheDocument();

    fireEvent.click(button);
    await waitFor(() => expect(onStartSequence).toHaveBeenCalledWith('ad-lead-v1'));
  });

  it('does not show the retry note without a failed start', () => {
    render(<LeadDetailHeader {...baseProps} sequences={canStart} onStartSequence={vi.fn().mockResolvedValue(true)} />);
    expect(screen.queryByText(RETRY_NOTE)).not.toBeInTheDocument();
  });

  it('does not invite a retry that would be refused: the blocked reason shows instead', () => {
    render(
      <LeadDetailHeader {...baseProps} sequences={{ ...blocked, lastStartFailed: true }} onStartSequence={vi.fn().mockResolvedValue(true)} />
    );
    expect(screen.queryByText(RETRY_NOTE)).not.toBeInTheDocument();
    expect(screen.getByText("Automation is switched off in Settings, so follow-ups can't be sent.")).toBeInTheDocument();
  });
});

describe('LeadDetailHeader — the running set is named', () => {
  it.each([
    ['active', 'ad-lead-v1', 'Ad lead follow-ups running'],
    ['completed', 'brief-v1', 'Project brief follow-ups finished'],
    ['stopped', 'scorecard-v1', 'Scorecard follow-ups stopped (replied)'],
    ['active', 'enquiry-v1', 'Enquiry follow-ups running'],
  ] as const)('%s %s reads "%s"', (sequenceStatus, sequenceKey, text) => {
    render(
      <LeadDetailHeader
        {...baseProps}
        lead={{ ...lead, sequenceStatus, sequenceKey, sequenceStopReason: sequenceStatus === 'stopped' ? 'replied' : null }}
        sequences={blocked}
        onStartSequence={vi.fn().mockResolvedValue(true)}
      />
    );
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it.each([null, 'inbound-v1', 'constructor'])('falls back to plain wording for sequence key %s', (sequenceKey) => {
    render(
      <LeadDetailHeader
        {...baseProps}
        lead={{ ...lead, sequenceStatus: 'active', sequenceKey }}
        sequences={blocked}
        onStartSequence={vi.fn().mockResolvedValue(true)}
      />
    );
    expect(screen.getByText('Follow-ups running')).toBeInTheDocument();
  });
});
