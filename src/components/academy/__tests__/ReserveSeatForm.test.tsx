/**
 * The "checkout unavailable" state — when POST /api/academy/enroll succeeds
 * (the reservation row exists) but returns no Razorpay order, there is no
 * manual fallback any more: the form must say so and let the buyer retry
 * with the same details, never open a payment page of its own.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ReserveSeatForm } from '../ReserveSeatForm';

describe('ReserveSeatForm — checkout unavailable', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function fillAndSubmit() {
    fireEvent.change(screen.getByPlaceholderText('Your name *'), { target: { value: 'Aarav Gupta' } });
    fireEvent.change(screen.getByPlaceholderText('Email *'), { target: { value: 'aarav.gupta@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /pay/i }));
  }

  it('shows "Payment isn’t available right now" and Try again re-posts the same details without opening a payment page', async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    // The reservation was created but the server could not open a Razorpay
    // order — success:true with no `razorpay` meta, exactly like a Razorpay
    // outage today.
    fetchMock.mockResolvedValue({
      json: async () => ({ success: true, data: { id: 'enr-1', status: 'reserved' } }),
    });

    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(<ReserveSeatForm programId="prog-1" programTitle="Digital Marketing" amountInr={29999} />);

    fillAndSubmit();

    expect(await screen.findByRole('heading', { name: /Payment isn.t available right now/ })).toBeInTheDocument();
    expect(screen.getByText(/We couldn.t open the payment window\. Please try again in a few minutes\./)).toBeInTheDocument();
    expect(screen.getByText(/Still stuck\? Email/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'freakingmindsdigital@gmail.com' })).toHaveAttribute(
      'href',
      'mailto:freakingmindsdigital@gmail.com'
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(openSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    // Still the unavailable state — no payment page or modal was opened.
    expect(await screen.findByRole('heading', { name: /Payment isn.t available right now/ })).toBeInTheDocument();
    expect(openSpy).not.toHaveBeenCalled();

    const [, secondCallInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    const body = JSON.parse(secondCallInit.body as string);
    expect(body).toMatchObject({
      programId: 'prog-1',
      buyerName: 'Aarav Gupta',
      buyerEmail: 'aarav.gupta@example.com',
    });
  });
});
