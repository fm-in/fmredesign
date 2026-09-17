import { describe, it, expect } from 'vitest';
import { canAccessLead, canAssignOwner, isSalesAdmin } from '../access';
import { leadPatchSchema, salesSettingsSchema } from '../schemas';

const admin = { id: 'u-admin', role: 'admin', permissions: ['sales.read', 'sales.write'] };
const manager = { id: 'u-mgr', role: 'manager', permissions: ['sales.read', 'sales.write'] };
const superAdmin = { id: 'system-admin', role: 'super_admin', permissions: ['system.full_access'] };

describe('access', () => {
  it('treats admins and super admins as sales admins', () => {
    expect(isSalesAdmin(admin)).toBe(true);
    expect(isSalesAdmin(superAdmin)).toBe(true);
    expect(isSalesAdmin(manager)).toBe(false);
  });

  it('lets managers see their own and unassigned leads only', () => {
    expect(canAccessLead(manager, { owner_id: 'u-mgr' })).toBe(true);
    expect(canAccessLead(manager, { owner_id: null })).toBe(true);
    expect(canAccessLead(manager, { owner_id: 'someone-else' })).toBe(false);
    expect(canAccessLead(admin, { owner_id: 'someone-else' })).toBe(true);
  });

  it('lets managers take an unassigned lead or release their own, nothing else', () => {
    expect(canAssignOwner(manager, null, 'u-mgr')).toBe(true);
    expect(canAssignOwner(manager, 'u-mgr', null)).toBe(true);
    expect(canAssignOwner(manager, null, 'someone-else')).toBe(false);
    expect(canAssignOwner(manager, 'someone-else', 'u-mgr')).toBe(false);
    expect(canAssignOwner(admin, 'someone-else', 'u-mgr')).toBe(true);
  });
});

describe('leadPatchSchema', () => {
  it('requires a reason when marking a lead lost', () => {
    expect(leadPatchSchema.safeParse({ status: 'lost' }).success).toBe(false);
    expect(leadPatchSchema.safeParse({ status: 'lost', lostReason: 'Chose another agency' }).success).toBe(true);
  });

  it('rejects unknown stages', () => {
    expect(leadPatchSchema.safeParse({ status: 'sleeping' }).success).toBe(false);
  });
});

describe('salesSettingsSchema', () => {
  it('accepts a Cal.com team/event path only', () => {
    expect(salesSettingsSchema.safeParse({ bookingLink: 'fm-in/15min' }).success).toBe(true);
    expect(salesSettingsSchema.safeParse({ bookingLink: 'https://cal.com/fm-in/15min' }).success).toBe(false);
  });

  it('validates bookingLinkLong with the same Cal.com path shape', () => {
    expect(salesSettingsSchema.safeParse({ bookingLinkLong: 'fm-in/30min' }).success).toBe(true);
    expect(salesSettingsSchema.safeParse({ bookingLinkLong: 'https://cal.com/fm-in/30min' }).success).toBe(false);
    expect(salesSettingsSchema.safeParse({ bookingLinkLong: 'fm-in' }).success).toBe(false);
  });

  it('treats bookingLinkLong as optional', () => {
    expect(salesSettingsSchema.safeParse({}).success).toBe(true);
  });
});
