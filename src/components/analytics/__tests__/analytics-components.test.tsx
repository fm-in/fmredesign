import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ContactClickTracker } from '../ContactClickTracker';
import { CookieConsent } from '@/components/CookieConsent';
import { CONSENT_KEY } from '@/lib/analytics/consent';

function events(): unknown[] {
  return (window.dataLayer ?? []).filter(
    (e): e is Record<string, unknown> =>
      Object.prototype.toString.call(e) !== '[object Arguments]' && 'event' in (e as object)
  );
}

beforeEach(() => {
  delete window.dataLayer;
  window.localStorage.clear();
});

describe('ContactClickTracker', () => {
  function page() {
    return render(
      <>
        <ContactClickTracker />
        <a href="https://wa.me/916268112515" onClick={(e) => e.preventDefault()}>
          <span>WhatsApp us</span>
        </a>
        <a href="mailto:hello@example.com" onClick={(e) => e.preventDefault()}>Email</a>
        <a href="/services" onClick={(e) => e.preventDefault()}>Services</a>
      </>
    );
  }

  it('tracks WhatsApp clicks, including on an element inside the link', () => {
    page();
    fireEvent.click(screen.getByText('WhatsApp us'));
    expect(events()).toEqual([{ event: 'contact_click', method: 'whatsapp', link_location: '/' }]);
  });

  it('tracks email clicks and ignores ordinary links', () => {
    page();
    fireEvent.click(screen.getByText('Email'));
    fireEvent.click(screen.getByText('Services'));
    expect(events()).toEqual([{ event: 'contact_click', method: 'email', link_location: '/' }]);
  });
});

describe('CookieConsent', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function consentUpdates() {
    return (window.dataLayer ?? [])
      .filter((e) => Object.prototype.toString.call(e) === '[object Arguments]')
      .map((e) => Array.from(e as unknown as ArrayLike<unknown>));
  }

  it('Decline stores the choice and revokes consent on this page view', () => {
    render(<CookieConsent />);
    act(() => void vi.advanceTimersByTime(1600));
    fireEvent.click(screen.getByRole('button', { name: 'Decline' }));

    expect(window.localStorage.getItem(CONSENT_KEY)).toBe('denied');
    expect(consentUpdates()).toEqual([
      ['consent', 'update', expect.objectContaining({ analytics_storage: 'denied', ad_storage: 'denied' })],
    ]);
    expect(screen.queryByRole('region', { name: 'Cookie consent' })).toBeNull();
  });

  it('Accept grants consent', () => {
    render(<CookieConsent />);
    act(() => void vi.advanceTimersByTime(1600));
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    expect(window.localStorage.getItem(CONSENT_KEY)).toBe('granted');
    expect(consentUpdates()[0][2]).toMatchObject({ analytics_storage: 'granted' });
  });

  it('stays hidden once a choice exists', () => {
    window.localStorage.setItem(CONSENT_KEY, 'granted');
    render(<CookieConsent />);
    act(() => void vi.advanceTimersByTime(1600));
    expect(screen.queryByRole('region', { name: 'Cookie consent' })).toBeNull();
  });

  it('asks again visitors who only saw the old, non-functional banner', () => {
    window.localStorage.setItem('fm-cookie-consent', 'accepted');
    render(<CookieConsent />);
    act(() => void vi.advanceTimersByTime(1600));
    expect(screen.getByRole('region', { name: 'Cookie consent' })).toBeTruthy();
  });
});
