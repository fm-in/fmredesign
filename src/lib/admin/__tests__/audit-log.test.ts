import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAuditUser, getClientIP } from '../audit-log';

/*
 * `logAuditEvent` tries Inngest first and falls back to a direct insert when
 * it is unreachable. Without this mock the SDK attempts a real HTTP call, so
 * the two tests below passed or timed out depending on how fast the network
 * refused it — intermittently blowing past vitest's 5s limit on a busy
 * machine. Rejecting immediately is what "Inngest unreachable" means, and it
 * is the fallback these tests are actually about.
 */
vi.mock('@/lib/inngest/client', () => ({
  inngest: { send: vi.fn(() => Promise.reject(new Error('Inngest unreachable'))) },
}));

// Mock Supabase — logAuditEvent depends on it
vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ error: null })),
    })),
  })),
}));

describe('getAuditUser (deprecated — reads forgeable headers)', () => {
  it('extracts user info from headers', () => {
    const request = new Request('http://localhost', {
      headers: {
        'x-admin-user-id': 'user-123',
        'x-admin-user-name': 'John Doe',
      },
    });
    const user = getAuditUser(request);
    expect(user.user_id).toBe('user-123');
    expect(user.user_name).toBe('John Doe');
  });

  it('returns defaults when headers are missing', () => {
    const request = new Request('http://localhost');
    const user = getAuditUser(request);
    expect(user.user_id).toBe('admin');
    expect(user.user_name).toBe('Super Admin');
  });
});

describe('getClientIP', () => {
  it('returns x-forwarded-for when present', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(getClientIP(request)).toBe('1.2.3.4');
  });

  it('returns x-real-ip when x-forwarded-for is absent', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-real-ip': '10.0.0.1' },
    });
    expect(getClientIP(request)).toBe('10.0.0.1');
  });

  it('returns "unknown" when no IP headers present', () => {
    const request = new Request('http://localhost');
    expect(getClientIP(request)).toBe('unknown');
  });
});

describe('logAuditEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls supabase insert with user data passed directly', async () => {
    const { logAuditEvent } = await import('../audit-log');
    await expect(
      logAuditEvent({
        user_id: 'user-1',
        user_name: 'Test User',
        action: 'create',
        resource_type: 'client',
        resource_id: 'client-1',
        details: { name: 'Acme' },
        ip_address: '1.2.3.4',
      })
    ).resolves.toBeUndefined();
  });

  it('does not throw when supabase errors', async () => {
    const { getSupabaseAdmin } = await import('@/lib/supabase');
    vi.mocked(getSupabaseAdmin).mockReturnValueOnce({
      from: vi.fn(() => ({
        insert: vi.fn(() => Promise.reject(new Error('DB error'))),
      })),
    } as any);

    const { logAuditEvent } = await import('../audit-log');
    // Should not throw — fire-and-forget
    await expect(
      logAuditEvent({
        user_id: 'user-1',
        user_name: 'Test User',
        action: 'delete',
        resource_type: 'project',
      })
    ).resolves.toBeUndefined();
  });
});
