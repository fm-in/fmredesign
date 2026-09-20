import { describe, it, expect } from 'vitest';
import { bookingUrl, companyWhatsappUrl, whatsappUrl } from '../links';

describe('bookingUrl', () => {
  it('links to the Cal.com event without prefill', () => {
    expect(bookingUrl('fm-in/15min')).toBe('https://cal.com/fm-in/15min');
  });

  it('prefills name, email and the lead id', () => {
    const url = new URL(bookingUrl('/fm-in/15min/', { leadId: 'lead_1', name: 'Priya Shah', email: 'p@x.com' }));
    expect(url.pathname).toBe('/fm-in/15min');
    expect(url.searchParams.get('name')).toBe('Priya Shah');
    expect(url.searchParams.get('email')).toBe('p@x.com');
    expect(url.searchParams.get('metadata[leadId]')).toBe('lead_1');
  });
});

describe('whatsappUrl', () => {
  it('builds a wa.me link with encoded text', () => {
    expect(whatsappUrl('+919833257659', 'Hi Priya, thanks!')).toBe('https://wa.me/919833257659?text=Hi%20Priya%2C%20thanks!');
  });

  it('returns null without a usable number', () => {
    expect(whatsappUrl(null, 'x')).toBeNull();
    expect(whatsappUrl('+9112', 'x')).toBeNull();
  });

  it('links to the company number', () => {
    expect(companyWhatsappUrl('Hello')).toBe('https://wa.me/916268112515?text=Hello');
  });
});
