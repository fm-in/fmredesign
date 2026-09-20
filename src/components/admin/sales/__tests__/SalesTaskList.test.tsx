import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SalesTaskList } from '../SalesTaskList';
import type { SalesTaskItem } from '@/lib/sales/api-types';

const task: SalesTaskItem = {
  id: 'task_1',
  leadId: 'lead_1',
  ownerId: 'user-1',
  type: 'whatsapp',
  title: 'First touch within the hour',
  draftBody: 'Hi Priya, this is Asha from FreakingMinds.',
  dueAt: '2026-09-15T05:00:00.000Z',
  status: 'open',
  completedAt: null,
  lead: { id: 'lead_1', name: 'Priya Shah', company: 'Acme', email: 'priya@example.com', phoneE164: '+919833257659' },
};

describe('SalesTaskList', () => {
  it('sends the reader to our inbox, not their own WhatsApp', () => {
    /*
     * This used to be a `wa.me` link, which opens the READER's WhatsApp and
     * messages the lead from their personal number. Harmless when we had no
     * business number; wrong now that we do — the customer would get the
     * automated message from the business and the follow-up from a stranger.
     * A Cloud API number cannot be opened in the WhatsApp app anyway.
     */
    render(<SalesTaskList tasks={[task]} onComplete={() => undefined} />);
    const link = screen.getByRole('link', { name: /reply in whatsapp inbox/i });
    expect(link).toHaveAttribute('href', '/admin/whatsapp?lead=lead_1');
    expect(link.getAttribute('href')).not.toContain('wa.me');
  });

  it('marks a task done', () => {
    const onComplete = vi.fn();
    render(<SalesTaskList tasks={[task]} onComplete={onComplete} />);
    fireEvent.click(screen.getByRole('button', { name: /done/i }));
    expect(onComplete).toHaveBeenCalledWith('task_1', 'done');
  });

  it('links to the lead when shown in My Work', () => {
    render(<SalesTaskList tasks={[task]} showLead onComplete={() => undefined} />);
    expect(screen.getByRole('link', { name: /priya shah/i })).toHaveAttribute('href', '/admin/leads/lead_1');
  });

  it('says so when nothing is open', () => {
    render(<SalesTaskList tasks={[{ ...task, status: 'done' }]} onComplete={() => undefined} emptyText="No open tasks." />);
    expect(screen.getByText('No open tasks.')).toBeInTheDocument();
  });

  it('shows Copy message but not Open WhatsApp for a LinkedIn task', () => {
    const linkedinTask: SalesTaskItem = { ...task, id: 'task_2', type: 'linkedin' };
    render(<SalesTaskList tasks={[linkedinTask]} onComplete={() => undefined} />);
    expect(screen.queryByRole('link', { name: /open whatsapp/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy message/i })).toBeInTheDocument();
  });
});
