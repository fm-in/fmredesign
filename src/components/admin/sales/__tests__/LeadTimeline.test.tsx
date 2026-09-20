import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LeadTimeline } from '../LeadTimeline';
import type { SalesActivity } from '@/lib/sales/api-types';

describe('LeadTimeline', () => {
  it('shows the human label for a started sequence, not the raw key', () => {
    const activity: SalesActivity = {
      id: 'act_1',
      leadId: 'lead_1',
      type: 'sequence_started',
      channel: null,
      direction: null,
      subject: null,
      body: null,
      metadata: { sequenceKey: 'brief-v1' },
      actorName: 'Maya',
      occurredAt: '2026-09-15T04:00:00.000Z',
    };
    render(<LeadTimeline activities={[activity]} onAddNote={vi.fn().mockResolvedValue(true)} />);

    expect(screen.getByText('Set: Project brief')).toBeInTheDocument();
    expect(screen.queryByText('Set: brief-v1')).not.toBeInTheDocument();
  });

  it('keeps the typed note when the save fails', async () => {
    const onAddNote = vi.fn().mockResolvedValue(false);
    render(<LeadTimeline activities={[]} onAddNote={onAddNote} />);

    const textarea = screen.getByLabelText(/add a note/i);
    fireEvent.change(textarea, { target: { value: 'Called, no answer' } });
    fireEvent.click(screen.getByRole('button', { name: /add note/i }));

    await waitFor(() => expect(onAddNote).toHaveBeenCalledWith('Called, no answer'));
    expect(textarea).toHaveValue('Called, no answer');
  });

  it('clears the note once the save succeeds', async () => {
    const onAddNote = vi.fn().mockResolvedValue(true);
    render(<LeadTimeline activities={[]} onAddNote={onAddNote} />);

    const textarea = screen.getByLabelText(/add a note/i);
    fireEvent.change(textarea, { target: { value: 'Called, will follow up Monday' } });
    fireEvent.click(screen.getByRole('button', { name: /add note/i }));

    await waitFor(() => expect(textarea).toHaveValue(''));
  });
});
