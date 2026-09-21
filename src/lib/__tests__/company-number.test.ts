import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import * as company from '../company';
import { COMPANY_PHONE_E164, COMPANY_WHATSAPP_NUMBER, COMPANY_WHATSAPP_URL } from '../company';

/**
 * The company's number lived as a literal in a dozen files, and they drifted:
 * the site advertised 98332 57659 while the WhatsApp Business API was
 * registered against 62681 12515. Every "Prefer WhatsApp?" link in a sales
 * email opened a chat with a number that had no webhook behind it, so those
 * replies reached a handset and were invisible to the system — no timeline
 * entry, no sequence stop, no opt-out.
 *
 * This is the guard that stops it happening a third time.
 */
const RETIRED = [
  '9833257659', // the number the site used to advertise
  '8888886321', // a placeholder that shipped in the client portal's support page
];

/** Source files only — lockfiles and build output are not ours to police. */
function grepSrc(pattern: string): string[] {
  try {
    return execFileSync('git', ['grep', '-n', '-I', pattern, '--', 'src'], { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
  } catch {
    return []; // git grep exits 1 when it finds nothing
  }
}

describe('the company phone number', () => {
  it.each(RETIRED)('has no occurrence of the retired number %s in shipped code', (retired) => {
    // Test fixtures are exempt: a lead or client sample may hold any number,
    // and several do use the old one as a plausible Indian mobile. What must
    // not survive is a reference in code that actually ships.
    const hits = grepSrc(retired).filter(
      (line) => !line.includes('__tests__') && !line.startsWith('src/test-utils/'),
    );
    expect(hits, `retired number still in shipped code:\n${hits.join('\n')}`).toEqual([]);
  });

  it('derives every form from the one E.164 literal', () => {
    expect(COMPANY_PHONE_E164).toBe('+916268112515');
    expect(COMPANY_WHATSAPP_NUMBER).toBe('916268112515');
    expect(COMPANY_WHATSAPP_URL).toBe('https://wa.me/916268112515');
  });

  it('exposes no tel: link for a number that cannot take calls', () => {
    // It is a Cloud API number. A tel: link would invite a call it cannot
    // answer, which is why company.ts deliberately exports no such form.
    expect(Object.keys(company).some((k) => /TEL|CALL/i.test(k))).toBe(false);
    expect(Object.values(company).some((v) => typeof v === 'string' && v.startsWith('tel:'))).toBe(false);
  });

  it('has no hardcoded wa.me link anywhere but the one that builds them', () => {
    const offenders = grepSrc('wa\\.me/[0-9]')
      .filter((l) => !l.startsWith('src/lib/company.ts'))
      .filter((l) => !l.includes('__tests__'));
    expect(offenders, `hardcoded wa.me link:\n${offenders.join('\n')}`).toEqual([]);
  });
});
