import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LeadTimeline } from '../LeadTimeline';

describe('LeadTimeline', () => {
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
