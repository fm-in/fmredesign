/**
 * Admin Users API Route Tests
 * Tests GET, POST, PUT, DELETE for /api/admin/users
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createHmac } from 'crypto';

// ── Supabase mock ──
const mockInsert = vi.fn(() => Promise.resolve({ data: null, error: null }));
const mockDelete = vi.fn(() => ({
  eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
}));
const mockUpdateEq = vi.fn(() => Promise.resolve({ data: null, error: null }));
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }));
const mockOrder = vi.fn(() =>
  Promise.resolve({
    data: [
      {
        id: 'user-1',
        mobile_number: '+919876543210',
        name: 'Test User',
        email: 'test@example.com',
        role: 'admin',
        permissions: 'content.read,content.write',
        status: 'active',
        created_by: 'admin',
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
        last_login: null,
        notes: '',
      },
    ],
    error: null,
  })
);

vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: mockOrder,
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: {
                id: 'user-1',
                name: 'Test User',
                role: 'admin',
                permissions: 'system.full_access',
                status: 'active',
              },
              error: null,
            })
          ),
        })),
      })),
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    })),
  })),
}));

// ── Auth middleware mocks ──
const TEST_PASSWORD = 'test-admin-pw';

vi.mock('@/lib/admin-auth-middleware', () => ({
  requireAdminAuth: vi.fn(() => Promise.resolve(null)),
  requirePermission: vi.fn(() =>
    Promise.resolve({
      user: { id: 'system-admin', name: 'System Admin', role: 'super_admin', permissions: ['system.full_access'] },
    })
  ),
}));

// ── Audit log mock ──
vi.mock('@/lib/admin/audit-log', () => ({
  logAuditEvent: vi.fn(() => Promise.resolve()),
  getClientIP: vi.fn(() => '127.0.0.1'),
}));

// ── Supabase-utils mock ──
vi.mock('@/lib/supabase-utils', () => ({
  normalizeMobileNumber: vi.fn((n: string) => (n.startsWith('+91') ? n : `+91${n}`)),
  getRolePermissions: vi.fn((role: string) => {
    if (role === 'super_admin') return ['system.full_access'];
    if (role === 'admin') return ['content.read', 'content.write', 'clients.read', 'clients.write'];
    return ['content.read'];
  }),
  toCamelCaseKeys: vi.fn((row: Record<string, unknown>, defaults: Record<string, unknown> = {}) => ({
    ...defaults,
    ...Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()), v])
    ),
  })),
}));

// ── Validation mock ──
vi.mock('@/lib/validations/schemas', () => ({
  createUserSchema: { safeParse: vi.fn(() => ({ success: true })) },
  updateUserSchema: { safeParse: vi.fn(() => ({ success: true })) },
  validateBody: vi.fn(() => ({ success: true })),
}));

describe('GET /api/admin/users', () => {
  beforeEach(() => {
    process.env.ADMIN_PASSWORD = TEST_PASSWORD;
    mockOrder.mockClear();
  });

  afterEach(() => {
    delete process.env.ADMIN_PASSWORD;
  });

  it('returns list of users', async () => {
    const { GET } = await import('../route');
    const req = new NextRequest('http://localhost/api/admin/users', {
      headers: { cookie: `fm-admin-session=valid` },
    });

    const res = await GET(req);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.users).toHaveLength(1);
    expect(body.users[0].name).toBe('Test User');
    expect(body.users[0].mobileNumber).toBe('+919876543210');
  });

  it('transforms snake_case to camelCase', async () => {
    const { GET } = await import('../route');
    const req = new NextRequest('http://localhost/api/admin/users');

    const res = await GET(req);
    const body = await res.json();

    const user = body.users[0];
    expect(user).toHaveProperty('mobileNumber');
    expect(user).toHaveProperty('createdBy');
    expect(user).toHaveProperty('createdAt');
    expect(user).toHaveProperty('updatedAt');
    expect(user).toHaveProperty('lastLogin');
    // Should not have snake_case keys
    expect(user).not.toHaveProperty('mobile_number');
    expect(user).not.toHaveProperty('created_by');
  });
});

describe('POST /api/admin/users', () => {
  beforeEach(() => {
    process.env.ADMIN_PASSWORD = TEST_PASSWORD;
    mockInsert.mockClear();
    mockInsert.mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    delete process.env.ADMIN_PASSWORD;
  });

  it('creates a new user', async () => {
    const { POST } = await import('../route');
    const req = new NextRequest('http://localhost/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        name: 'New User',
        email: 'new@example.com',
        mobileNumber: '+919876543211',
        role: 'editor',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.user.name).toBe('New User');
    expect(body.user.role).toBe('editor');
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  it('returns validation error for invalid data', async () => {
    const { validateBody } = await import('@/lib/validations/schemas');
    (validateBody as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      success: false,
      error: 'Name is required',
    });

    const { POST } = await import('../route');
    const req = new NextRequest('http://localhost/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });
});

describe('PUT /api/admin/users', () => {
  beforeEach(() => {
    process.env.ADMIN_PASSWORD = TEST_PASSWORD;
    mockUpdate.mockClear();
    mockUpdateEq.mockClear();
    mockUpdateEq.mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    delete process.env.ADMIN_PASSWORD;
  });

  it('updates user fields', async () => {
    const { PUT } = await import('../route');
    const req = new NextRequest('http://localhost/api/admin/users', {
      method: 'PUT',
      body: JSON.stringify({
        id: 'user-1',
        name: 'Updated Name',
        status: 'inactive',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await PUT(req);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });
});

describe('DELETE /api/admin/users', () => {
  beforeEach(() => {
    process.env.ADMIN_PASSWORD = TEST_PASSWORD;
    mockDelete.mockClear();
    mockDelete.mockReturnValue({
      eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
    });
  });

  afterEach(() => {
    delete process.env.ADMIN_PASSWORD;
  });

  it('deletes a user by ID', async () => {
    const { DELETE } = await import('../route');
    const req = new NextRequest('http://localhost/api/admin/users?id=user-1', {
      method: 'DELETE',
    });

    const res = await DELETE(req);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it('returns 400 when ID is missing', async () => {
    const { DELETE } = await import('../route');
    const req = new NextRequest('http://localhost/api/admin/users', {
      method: 'DELETE',
    });

    const res = await DELETE(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('User ID is required');
  });
});
