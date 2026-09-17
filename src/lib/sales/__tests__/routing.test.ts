import { describe, it, expect } from 'vitest';
import { pickOwner, type RotationCandidate } from '../routing';

const person = (id: string, lastAssignedAt: string | null): RotationCandidate => ({
  id,
  name: id.toUpperCase(),
  email: `${id}@fm.in`,
  lastAssignedAt,
});

describe('pickOwner', () => {
  it('returns null with nobody in rotation', () => {
    expect(pickOwner([])).toBeNull();
  });

  it('prefers someone who has never been assigned', () => {
    expect(pickOwner([person('a', '2026-09-14T10:00:00Z'), person('b', null)])?.id).toBe('b');
  });

  it('picks the least recently assigned', () => {
    expect(pickOwner([person('a', '2026-09-15T10:00:00Z'), person('b', '2026-09-14T10:00:00Z')])?.id).toBe('b');
  });

  it('breaks ties by id so the choice is stable', () => {
    expect(pickOwner([person('b', null), person('a', null)])?.id).toBe('a');
  });
});
