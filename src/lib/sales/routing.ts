/**
 * Owner assignment. `pickOwner` is the pure rule: whoever in the rotation was
 * assigned a lead least recently (never-assigned first; ties by id).
 */

export interface RotationCandidate {
  id: string;
  name: string;
  email: string | null;
  lastAssignedAt: string | null;
}

export function pickOwner(candidates: readonly RotationCandidate[]): RotationCandidate | null {
  if (candidates.length === 0) return null;
  const sorted = [...candidates].sort((a, b) => {
    if (a.lastAssignedAt === b.lastAssignedAt) return a.id.localeCompare(b.id);
    if (a.lastAssignedAt === null) return -1;
    if (b.lastAssignedAt === null) return 1;
    return a.lastAssignedAt.localeCompare(b.lastAssignedAt);
  });
  return sorted[0];
}
