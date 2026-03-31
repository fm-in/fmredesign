/**
 * Admin Dashboard Layout
 * Uses the design-system DashboardLayout with command palette, breadcrumbs,
 * toast provider, and error boundary.
 * Authentication is validated server-side via session cookie.
 */

'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAdminAuth, AdminAuth } from '@/lib/admin/auth';
import { DashboardLayout, type NavigationGroup } from '@/design-system';
import { AdminErrorBoundary } from '@/components/admin/AdminErrorBoundary';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

// Lazy-load CommandPalette — only rendered on Cmd+K, not on every page load
const CommandPalette = dynamic(
  () => import('@/components/admin/CommandPalette').then(m => ({ default: m.CommandPalette })),
  { ssr: false }
);
const KeyboardShortcutsHelp = dynamic(
  () => import('@/components/admin/KeyboardShortcutsHelp').then(m => ({ default: m.KeyboardShortcutsHelp })),
  { ssr: false }
);
import { ToastProvider } from '@/components/ui/toast-provider';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import {
  Breadcrumb,
  BreadcrumbItem as BCItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  LayoutDashboard,
  FileText,
  Users,
  Briefcase,
  Calendar,
  Search,
  Sparkles,
  Settings,
  Shield,
  UserCog,
  Presentation,
  UsersRound,
  ScrollText,
  Target,
  MessageSquare,
  Database,
  ClipboardList,
} from 'lucide-react';
import React from 'react';

/* ── Permission requirements per nav href ── */
const NAV_PERMISSIONS: Record<string, string> = {
  '/admin': '',                           // Dashboard — all roles
  '/admin/my-work': '',                   // My Work — all roles
  '/admin/clients': 'clients.read',
  '/admin/projects': 'projects.read',
  '/admin/content': 'content.read',
  '/admin/invoices': 'finance.read',
  '/admin/proposals': 'finance.read',
  '/admin/leads': 'clients.read',
  '/admin/scraped-contacts': 'users.read',    // Admin/super_admin only
  '/admin/support': 'clients.read',
  '/admin/team': 'users.read',
  '/admin/discovery': 'clients.read',
  '/admin/creativeminds': 'clients.read',
  '/admin/users': 'users.read',
  '/admin/audit': 'settings.read',
  '/admin/system': 'settings.read',
  '/admin/settings': 'settings.read',
};

/** Filter navigation groups based on current user's permissions */
function filterNavigation(
  groups: NavigationGroup[],
  hasPermission: (p: string) => boolean
): NavigationGroup[] {
  return groups
    .map(group => ({
      ...group,
      items: group.items.filter(item => {
        const required = NAV_PERMISSIONS[item.href];
        return required === '' || required === undefined || hasPermission(required);
      }),
    }))
    .filter(group => group.items.length > 0);
}

/* ── Navigation configuration ── */
const adminNavigation: NavigationGroup[] = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="w-5 h-5" /> },
      { label: 'My Work', href: '/admin/my-work', icon: <ClipboardList className="w-5 h-5" /> },
      { label: 'Clients', href: '/admin/clients', icon: <Users className="w-5 h-5" /> },
      { label: 'Projects', href: '/admin/projects', icon: <Briefcase className="w-5 h-5" /> },
    ],
  },
  {
    title: 'Content',
    items: [
      { label: 'Content Calendar', href: '/admin/content', icon: <Calendar className="w-5 h-5" /> },
      { label: 'Invoices', href: '/admin/invoices', icon: <FileText className="w-5 h-5" /> },
      { label: 'Proposals', href: '/admin/proposals', icon: <Presentation className="w-5 h-5" /> },
    ],
  },
  {
    title: 'Management',
    items: [
      { label: 'Leads', href: '/admin/leads', icon: <Target className="w-5 h-5" /> },
      { label: 'Scraped Contacts', href: '/admin/scraped-contacts', icon: <Database className="w-5 h-5" /> },
      { label: 'Support', href: '/admin/support', icon: <MessageSquare className="w-5 h-5" /> },
      { label: 'Team', href: '/admin/team', icon: <UsersRound className="w-5 h-5" /> },
      { label: 'Discovery', href: '/admin/discovery', icon: <Search className="w-5 h-5" /> },
      { label: 'CreativeMinds', href: '/admin/creativeminds', icon: <Sparkles className="w-5 h-5" /> },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Users', href: '/admin/users', icon: <UserCog className="w-5 h-5" /> },
      { label: 'Audit Log', href: '/admin/audit', icon: <ScrollText className="w-5 h-5" /> },
      { label: 'Admin System', href: '/admin/system', icon: <Shield className="w-5 h-5" /> },
      { label: 'Settings', href: '/admin/settings', icon: <Settings className="w-5 h-5" /> },
    ],
  },
];

/* ── Breadcrumb renderer ── */
function AdminBreadcrumbs() {
  const crumbs = useBreadcrumbs();
  if (crumbs.length <= 1) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, i) => (
          <React.Fragment key={crumb.href}>
            {i > 0 && <BreadcrumbSeparator />}
            <BCItem>
              {i === crumbs.length - 1 ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
              )}
            </BCItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

/* ── Layout component ── */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, loading, currentUser, logout, hasPermission, checkSession } = useAdminAuth();
  const [commandOpen, setCommandOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Context-aware "new" action
  const handleNew = useCallback(() => {
    if (pathname?.startsWith('/admin/content')) router.push('/admin/content/new');
    else if (pathname?.startsWith('/admin/projects')) router.push('/admin/projects/new');
    else if (pathname?.startsWith('/admin/team')) router.push('/admin/team/new');
    else if (pathname?.startsWith('/admin/discovery')) router.push('/admin/discovery/new');
    else router.push('/admin/projects/new');
  }, [pathname, router]);

  const shortcutConfig = useMemo(() => ({
    onHelp: () => setShortcutsOpen(true),
    onNew: handleNew,
  }), [handleNew]);

  const { pendingKey } = useKeyboardShortcuts(shortcutConfig);

  // Notification state
  const [notifications, setNotifications] = useState<
    { id: string; type: string; title: string; message: string; isRead: boolean; priority: 'low' | 'normal' | 'high'; actionUrl: string | null; createdAt: string }[]
  >([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const isAuthRoute = pathname?.startsWith('/admin/auth');

  useEffect(() => {
    let cancelled = false;

    if (!loading && !isAuthenticated && !isAuthRoute) {
      // Re-verify session before redirecting — the cookie may have just been
      // set by the login page's hook instance (separate from this layout's hook).
      AdminAuth.validateSession().then((result) => {
        if (cancelled) return;
        if (result.authenticated) {
          checkSession(); // Sync this hook's state with the valid session
        } else {
          router.push('/admin/auth/login');
        }
      });
    }
    if (!loading && isAuthenticated && pathname === '/admin/auth/login') {
      router.push('/admin');
    }

    return () => { cancelled = true; };
  }, [loading, isAuthenticated, isAuthRoute, pathname, router, checkSession]);

  // Notification handlers
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/notifications?limit=20');
      if (res.ok) {
        const json = await res.json();
        setNotifications(json.data || []);
        setUnreadCount(json.unreadCount || 0);
      }
    } catch { /* silent */ }
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await fetch('/api/admin/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  }, []);

  const handleNotificationClick = useCallback(async (id: string, actionUrl?: string) => {
    try {
      await fetch('/api/admin/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch { /* silent */ }
    if (actionUrl) router.push(actionUrl);
  }, [router]);

  // Poll notifications every 60s when authenticated
  useEffect(() => {
    if (!isAuthenticated || loading) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated, loading, fetchNotifications]);

  const handleLogout = useCallback(async () => {
    await logout();
    router.push('/admin/auth/login');
  }, [logout, router]);

  const handleCommandPalette = useCallback(() => {
    setCommandOpen(true);
  }, []);

  /* Get user info for sidebar */
  const user = currentUser
    ? {
        name: currentUser.name ?? 'Admin',
        email: currentUser.email ?? 'Super Admin',
        role: currentUser.type === 'admin' ? 'Super Admin' : currentUser.role ?? 'Viewer',
      }
    : undefined;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--admin-bg)]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fm-magenta-700" />
          <p className="text-sm text-fm-neutral-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  // Auth routes — render without layout
  if (isAuthRoute) {
    return (
      <>
        {children}
        <ToastProvider />
      </>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--admin-bg)]">
        <p className="text-fm-neutral-600">Redirecting to login...</p>
      </div>
    );
  }

  // Authenticated — full admin layout
  return (
    <>
      <DashboardLayout
        variant="admin"
        navigation={filterNavigation(adminNavigation, hasPermission)}
        user={user}
        onLogout={handleLogout}
        onCommandPalette={handleCommandPalette}
        breadcrumb={
          <Suspense fallback={null}>
            <AdminBreadcrumbs />
          </Suspense>
        }
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAllRead={handleMarkAllRead}
        onNotificationClick={handleNotificationClick}
        onRefreshNotifications={fetchNotifications}
      >
        <AdminErrorBoundary>{children}</AdminErrorBoundary>
      </DashboardLayout>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
      <KeyboardShortcutsHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      {/* Pending key indicator */}
      {pendingKey && (
        <div
          className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-fm-neutral-900 text-white text-sm font-mono rounded-lg shadow-lg"
          style={{ zIndex: 100 }}
        >
          {pendingKey}...
        </div>
      )}

      <ToastProvider />
    </>
  );
}
