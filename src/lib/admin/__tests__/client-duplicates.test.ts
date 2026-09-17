import { describe, it, expect } from 'vitest';
import { findDuplicateClient, phoneKey, emailKey } from '../client-duplicates';

describe('phoneKey', () => {
  it('reduces varied Indian formats to the same key', () => {
    const forms = ['93015 32235', '+91 93015 32235', '9301532235', '09301532235', '+919301532235'];
    const keys = forms.map(phoneKey);
    expect(new Set(keys).size).toBe(1);
    expect(keys[0]).toBe('9301532235');
  });

  it('returns empty for missing or too-short input', () => {
    expect(phoneKey(null)).toBe('');
    expect(phoneKey(undefined)).toBe('');
    expect(phoneKey('')).toBe('');
    expect(phoneKey('12345')).toBe('');
  });
});

describe('emailKey', () => {
  it('normalises case and whitespace', () => {
    expect(emailKey('  Foo@Bar.COM ')).toBe('foo@bar.com');
    expect(emailKey(null)).toBe('');
  });
});

describe('findDuplicateClient', () => {
  // The actual rows that caused the incident.
  const poojaTypo = {
    id: 'client-1785932847171',
    name: 'Pooja Sharma',
    email: 'acbcbcd@gmsil.com',
    phone: '93015 32235',
  };

  it('catches the real-world duplicate that email alone would have missed', () => {
    const candidate = { email: 'ca.psharma13@gmail.com', phone: '93015 32235' };
    // Emails genuinely differ — that was the whole failure mode.
    expect(emailKey(candidate.email)).not.toBe(emailKey(poojaTypo.email));

    const dupe = findDuplicateClient(candidate, [poojaTypo]);
    expect(dupe).not.toBeNull();
    expect(dupe!.matchedOn).toBe('phone');
    expect(dupe!.client.id).toBe(poojaTypo.id);
  });

  it('matches on email when phones differ', () => {
    const dupe = findDuplicateClient(
      { email: 'ACBCBCD@gmsil.com', phone: '99999 88888' },
      [poojaTypo]
    );
    expect(dupe!.matchedOn).toBe('email');
  });

  it('returns null for a genuinely new client', () => {
    expect(
      findDuplicateClient({ email: 'new@example.com', phone: '98765 43210' }, [poojaTypo])
    ).toBeNull();
  });

  it('ignores the excluded id so updates do not collide with themselves', () => {
    const same = { email: poojaTypo.email, phone: poojaTypo.phone };
    expect(findDuplicateClient(same, [poojaTypo])).not.toBeNull();
    expect(findDuplicateClient(same, [poojaTypo], poojaTypo.id)).toBeNull();
  });

  it('does not match on absent contact details', () => {
    const blank = { id: 'c2', name: 'No Contact', email: null, phone: null };
    expect(findDuplicateClient({ email: null, phone: null }, [blank])).toBeNull();
    expect(findDuplicateClient({ email: '', phone: '' }, [blank])).toBeNull();
  });

  it('does not treat two short/invalid phones as equal', () => {
    const a = { id: 'c3', name: 'A', email: 'a@x.com', phone: '123' };
    expect(findDuplicateClient({ email: 'b@x.com', phone: '123' }, [a])).toBeNull();
  });

  it('returns the first match when several collide', () => {
    const b = { id: 'c4', name: 'B', email: 'x@y.com', phone: '93015 32235' };
    const dupe = findDuplicateClient({ email: 'x@y.com', phone: '93015 32235' }, [poojaTypo, b]);
    expect(dupe!.client.id).toBe(poojaTypo.id);
  });
});
