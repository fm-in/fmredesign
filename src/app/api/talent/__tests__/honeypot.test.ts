import { describe, it, expect } from 'vitest';
import { checkSpam, HONEYPOT_FIELD } from '@/lib/spam-guard';

/**
 * `POST /api/talent` has always run this check, but the application form never
 * rendered the decoy field — so the value was always `undefined` and no bot
 * was ever caught by it. These lock in both halves: that a filled decoy is
 * rejected, and that an absent one is NOT treated as proof of innocence.
 */
describe('the talent application decoy field', () => {
  const real = { email: 'priya@example.com', name: 'Priya Shah' };

  it('rejects a submission that filled it in', () => {
    const result = checkSpam({ ...real, honeypot: 'https://spam.example' });
    expect(result.isSpam).toBe(true);
    expect(result.reason).toBe('honeypot');
  });

  it('lets a real person through with it empty', () => {
    expect(checkSpam({ ...real, honeypot: '' }).isSpam).toBe(false);
  });

  it('lets a real person through when the field is absent entirely', () => {
    // An older client, or a form mid-deploy, must not be locked out.
    expect(checkSpam({ ...real, honeypot: undefined }).isSpam).toBe(false);
  });

  it('is the field name the form and the route both use', () => {
    // If these ever drift, the check silently stops working — which is
    // exactly what was happening before.
    expect(HONEYPOT_FIELD).toBe('companyWebsite');
  });

  it('still catches the address tricks, decoy or not', () => {
    // The decoy is the cheap filter, not the only one.
    expect(checkSpam({ ...real, email: 'p.r.i.y.a@gmail.com' }).isSpam).toBe(true);
  });
});
