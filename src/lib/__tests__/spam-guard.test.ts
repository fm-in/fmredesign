import { describe, it, expect } from 'vitest';
import { checkSpam, HONEYPOT_FIELD } from '../spam-guard';

/**
 * The address lists below are the real values from the production
 * `enrollments`, `leads`, `talent_applications` and `clients` tables as of
 * 2026-08-10. Keeping them here means a future tweak to the heuristic has to
 * stay compatible with traffic we have actually seen.
 */
const KNOWN_BOT_EMAILS = [
  'q.im.oxa.be.h.o.p.66@gmail.com',
  'gi.q.oc.uc.a.03@gmail.com',
  'aq.e.z.u.q.es.o.f.i.z44@gmail.com',
  'u.nub.ojobo.m.e.4.5.1@gmail.com',
  'i.vup.usule.p.o.14.9@gmail.com',
  'e.n.uw.eg.u03.5@gmail.com',
];

const KNOWN_GENUINE_EMAILS = [
  'devanshhedau01@gmail.com',
  'rishisharmaforlife@gmail.com',
  'pdaworksart@gmail.com',
  'MUJDESIGNS1@GMAIL.COM',
  'ca.psharma13@gmail.com',
  'aaryavaraashirwad14@gmail.com',
  'Kanhafuncity@yahoo.com',
  'ariel_allelectricalproducts@outlook.com',
  'info@grihashikshakendra.com',
  'reservations@giovannivillage.com',
];

describe('checkSpam — honeypot', () => {
  it('rejects when the honeypot field is filled', () => {
    const v = checkSpam({ honeypot: 'http://spam.example', email: 'real@example.com' });
    expect(v.isSpam).toBe(true);
    expect(v.reason).toBe('honeypot');
  });

  it('accepts when the honeypot is empty or absent', () => {
    expect(checkSpam({ honeypot: '', email: 'real@example.com' }).isSpam).toBe(false);
    expect(checkSpam({ email: 'real@example.com' }).isSpam).toBe(false);
  });

  it('ignores a whitespace-only honeypot (browser autofill artefact)', () => {
    expect(checkSpam({ honeypot: '   ', email: 'real@example.com' }).isSpam).toBe(false);
  });

  it('exposes a field name that reads as a plausible real input', () => {
    expect(HONEYPOT_FIELD).toBe('companyWebsite');
  });
});

describe('checkSpam — Gmail dot-obfuscation', () => {
  it.each(KNOWN_BOT_EMAILS)('rejects observed bot address %s', (email) => {
    const v = checkSpam({ email });
    expect(v.isSpam).toBe(true);
    expect(v.reason).toBe('email_dot_abuse');
  });

  it.each(KNOWN_GENUINE_EMAILS)('accepts genuine address %s', (email) => {
    expect(checkSpam({ email }).isSpam).toBe(false);
  });

  it('allows one and two dots, rejects three', () => {
    expect(checkSpam({ email: 'a.b@gmail.com' }).isSpam).toBe(false);
    expect(checkSpam({ email: 'a.b.c@gmail.com' }).isSpam).toBe(false);
    expect(checkSpam({ email: 'a.b.c.d@gmail.com' }).isSpam).toBe(true);
  });

  it('only applies the dot rule to dot-insensitive providers', () => {
    // Other providers treat dots as significant, so many dots are legitimate.
    expect(checkSpam({ email: 'a.b.c.d.e@fastmail.com' }).isSpam).toBe(false);
    expect(checkSpam({ email: 'a.b.c.d.e@googlemail.com' }).isSpam).toBe(true);
  });

  it('is case-insensitive on the domain', () => {
    expect(checkSpam({ email: 'A.B.C.D@GMAIL.COM' }).isSpam).toBe(true);
  });
});

describe('checkSpam — plus-addressing abuse', () => {
  it('allows a single +tag', () => {
    expect(checkSpam({ email: 'someone+fm@gmail.com' }).isSpam).toBe(false);
  });

  it('rejects repeated + segments', () => {
    const v = checkSpam({ email: 'someone+a+b@gmail.com' });
    expect(v.isSpam).toBe(true);
    expect(v.reason).toBe('email_plus_abuse');
  });
});

describe('checkSpam — soft signals never block', () => {
  it('flags a random-looking name without rejecting it', () => {
    const v = checkSpam({ email: 'real@example.com', name: 'aAoJkjuaJSjbbvHcr' });
    expect(v.isSpam).toBe(false);
    expect(v.suspicions).toContain('name_looks_random');
  });

  it('leaves ordinary names unflagged', () => {
    for (const name of ['Mohammad Samee Ullah', 'Pratik Alhat', 'devansh', 'Priya Mehta']) {
      expect(checkSpam({ email: 'real@example.com', name }).suspicions).toEqual([]);
    }
  });

  it('handles malformed input without throwing', () => {
    expect(checkSpam({}).isSpam).toBe(false);
    expect(checkSpam({ email: 'not-an-email' }).isSpam).toBe(false);
    expect(checkSpam({ email: '@gmail.com' }).isSpam).toBe(false);
    expect(checkSpam({ honeypot: 42 }).isSpam).toBe(false);
  });
});
