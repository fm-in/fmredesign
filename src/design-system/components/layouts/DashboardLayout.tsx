'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Bell,
  User,
  LogOut,
  Search,
  Check,
  ExternalLink,
} from 'lucide-react';
import { MobileBottomNav } from '@/components/admin/MobileBottomNav';

export interface DashboardLayoutProps {
  children: React.ReactNode;
  variant?: 'admin' | 'client';
  navigation?: NavigationGroup[];
  user?: {
    name: string;
    email: string;
    avatar?: string;
    role?: string;
  };
  onLogout?: () => void;
  onCommandPalette?: () => void;
  breadcrumb?: React.ReactNode;
  className?: string;
  /** Notification system */
  notifications?: NotificationItem[];
  unreadCount?: number;
  onMarkAllRead?: () => void;
  onNotificationClick?: (id: string, actionUrl?: string) => void;
  onRefreshNotifications?: () => void;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  priority: 'low' | 'normal' | 'high';
  actionUrl: string | null;
  createdAt: string;
}

export interface NavigationGroup {
  title?: string;
  items: NavigationItem[];
}

export interface NavigationItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

/* Time formatting for notifications */
function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const layoutVariants = {
  admin: {
    bg: 'bg-[var(--admin-bg)]',
    sidebar: 'bg-white border-r border-[var(--admin-border)]',
    header: 'bg-white/95 border-b border-[var(--admin-border)]',
    accent: 'text-fm-magenta-700',
    logo: 'FreakingMinds',
    theme: 'Command Center',
  },
  client: {
    bg: 'bg-[#FEFCFB]',
    sidebar: 'bg-white border-r border-fm-magenta-100/50',
    header: 'bg-white border-b border-fm-magenta-100/30',
    accent: 'text-fm-magenta-700',
    logo: 'Client Portal',
    theme: 'Your Progress Hub',
  },
};

const SIDEBAR_STORAGE_KEY = 'fm-sidebar-collapsed';
const SWIPE_THRESHOLD = 80;
const EDGE_ZONE = 24;

/* ── Tiny icon button ── */
const IconBtn: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }
> = ({ className, label, children, ...props }) => (
  <button
    className={cn(
      'flex items-center justify-center w-10 h-10 md:w-8 md:h-8 rounded-lg shrink-0',
      'text-fm-neutral-400 hover:text-fm-neutral-700 hover:bg-fm-neutral-100',
      'transition-colors duration-150',
      className
    )}
    aria-label={label}
    {...props}
  >
    {children}
  </button>
);

/* ======================================================================== */

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  variant = 'admin',
  navigation = [],
  user,
  onLogout,
  onCommandPalette,
  breadcrumb,
  className,
  notifications = [],
  unreadCount = 0,
  onMarkAllRead,
  onNotificationClick,
  onRefreshNotifications,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const pathname = usePathname();
  const styles = layoutVariants[variant];

  /* Persist collapsed preference */
  useEffect(() => {
    try {
      if (localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true') setCollapsed(true);
    } catch {
      /* SSR / privacy mode */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
    } catch {}
  }, [collapsed]);

  /* Keyboard shortcuts: Cmd+B (toggle sidebar), Cmd+K (command palette), Escape (close panels) */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (notifOpen) setNotifOpen(false);
        if (mobileOpen) setMobileOpen(false);
        return;
      }
      if (e.metaKey || e.ctrlKey) {
        if (e.key === 'b') {
          e.preventDefault();
          setCollapsed((prev) => !prev);
        }
        if (e.key === 'k') {
          e.preventDefault();
          onCommandPalette?.();
        }
      }
    },
    [onCommandPalette, notifOpen, mobileOpen]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  /* Body scroll lock when mobile sidebar is open */
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  /* Focus management: move focus into sidebar on open, return on close */
  useEffect(() => {
    if (mobileOpen && sidebarRef.current) {
      const closeBtn = sidebarRef.current.querySelector<HTMLElement>('[aria-label="Close menu"]');
      closeBtn?.focus();
    }
  }, [mobileOpen]);

  /* Swipe gestures for mobile sidebar */
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
      const startX = touchStartRef.current.x;
      touchStartRef.current = null;

      // Ignore vertical swipes
      if (deltaY > Math.abs(deltaX)) return;

      if (!mobileOpen && startX < EDGE_ZONE && deltaX > SWIPE_THRESHOLD) {
        setMobileOpen(true);
      } else if (mobileOpen && deltaX < -SWIPE_THRESHOLD) {
        setMobileOpen(false);
      }
    };

    // Only attach on mobile-sized screens
    const mql = window.matchMedia('(max-width: 767px)');
    if (!mql.matches) return;

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [mobileOpen]);

  /* Close notification panel on outside click */
  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notifOpen]);

  /* Fetch notifications when panel opens */
  useEffect(() => {
    if (notifOpen) onRefreshNotifications?.();
  }, [notifOpen, onRefreshNotifications]);

  /* Auto-detect active nav item from pathname */
  const isActive = (href: string) => {
    if (href === '/admin' || href === '/client') return pathname === href;
    // Dashboard root paths (e.g. /client/slug, /admin) should use exact match
    // to avoid the root item staying highlighted on every sub-page
    const segments = href.replace(/\/$/, '').split('/').filter(Boolean);
    const isRootPath =
      (segments[0] === 'client' && segments.length === 2) ||
      (segments[0] === 'admin' && segments.length === 1);
    if (isRootPath) return pathname === href;
    return pathname?.startsWith(href) ?? false;
  };

  /* Flatten groups for iteration */
  const allGroups: NavigationGroup[] = navigation.length > 0
    ? navigation
    : [{ items: [{ label: 'Dashboard', href: variant === 'admin' ? '/admin' : '/client', icon: <div className="w-5 h-5 rounded bg-current opacity-20" /> }] }];

  return (
    <div className={cn('min-h-screen flex', styles.bg, className)}>
      {/* ─────────────── Sidebar ─────────────── */}
      <aside
        ref={sidebarRef}
        className={cn(
          'fixed inset-y-0 left-0 flex flex-col',
          'transition-[width,transform] duration-300 ease-in-out',
          styles.sidebar,
          'w-64',
          collapsed && 'md:w-[72px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
        style={{ zIndex: 50 }}
        aria-label="Sidebar navigation"
      >
        {/* ── Sidebar header ── */}
        <div
          className={cn(
            'shrink-0 flex items-center h-14 border-b border-fm-neutral-100',
            collapsed ? 'px-4 md:justify-center md:px-0' : 'px-4 justify-between'
          )}
        >
          <Link
            href="/admin"
            className={cn(
              'flex items-center gap-3 hover:opacity-80 transition-opacity min-w-0',
              collapsed && 'md:gap-0'
            )}
          >
            <img
              src="/favicon.png"
              alt="FreakingMinds"
              className="w-8 h-8 shrink-0 object-contain"
            />
            <div className={cn('min-w-0', collapsed && 'md:hidden')}>
              <h1 className="font-display font-bold text-[15px] leading-tight text-fm-neutral-900 truncate">
                {styles.logo}
              </h1>
              <p className="text-[11px] text-fm-neutral-500 truncate">{styles.theme}</p>
            </div>
          </Link>

          <div className={cn('flex-1', collapsed && 'md:hidden')} />

          {/* Desktop: always-visible collapse toggle */}
          <IconBtn
            onClick={() => setCollapsed((prev) => !prev)}
            label={collapsed ? 'Expand sidebar (Cmd+B)' : 'Collapse sidebar (Cmd+B)'}
            className={cn('hidden md:flex', collapsed && 'md:hidden')}
          >
            <PanelLeftClose className="w-4 h-4" />
          </IconBtn>

          {/* Mobile: close button */}
          <IconBtn
            onClick={() => setMobileOpen(false)}
            label="Close menu"
            className="md:hidden"
          >
            <X className="w-4 h-4" />
          </IconBtn>
        </div>

        {/* ── Navigation with section dividers ── */}
        <nav
          className={cn(
            'flex-1 overflow-y-auto overflow-x-hidden',
            'py-3',
            collapsed ? 'px-3 md:px-2' : 'px-3'
          )}
          aria-label="Dashboard navigation"
        >
          {allGroups.map((group, gi) => (
            <div key={gi} className={cn(gi > 0 && 'mt-6')}>
              {/* Section title */}
              {group.title && !collapsed && (
                <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-fm-neutral-400">
                  {group.title}
                </p>
              )}
              {group.title && collapsed && (
                <div className="hidden md:block mx-auto w-6 border-t border-fm-neutral-200 mb-2" />
              )}

              <div className="space-y-0.5">
                {group.items.map((item, ii) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={ii}
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'group/nav relative flex items-center rounded-xl text-[13px] font-medium',
                        'transition-all duration-200',
                        collapsed
                          ? 'gap-3 px-3 py-2.5 md:justify-center md:px-0 md:py-2.5'
                          : 'gap-3 px-3 py-2.5',
                        active
                          ? 'bg-gradient-to-r from-fm-magenta-600 to-fm-magenta-700 text-white shadow-[0_4px_12px_rgba(168,37,72,0.25)]'
                          : 'text-fm-neutral-600 hover:text-fm-neutral-900 hover:bg-fm-magenta-50/50'
                      )}
                    >
                      {item.icon && (
                        <span
                          className={cn(
                            'shrink-0 relative flex items-center justify-center',
                            active ? 'text-white' : styles.accent
                          )}
                        >
                          {item.icon}
                          {collapsed && item.badge && (
                            <span className="hidden md:block absolute -top-1 -right-1.5 w-2 h-2 bg-fm-magenta-500 rounded-full ring-2 ring-white" />
                          )}
                        </span>
                      )}

                      <span className={cn('truncate', collapsed && 'md:hidden')}>
                        {item.label}
                      </span>

                      {item.badge && (
                        <span
                          className={cn(
                            'ml-auto text-[11px] font-semibold rounded-full px-1.5 py-0.5 shrink-0',
                            active
                              ? 'bg-white/20 text-white'
                              : 'bg-fm-magenta-100 text-fm-magenta-700',
                            collapsed && 'md:hidden'
                          )}
                        >
                          {item.badge}
                        </span>
                      )}

                      {/* Tooltip — collapsed desktop only */}
                      {collapsed && (
                        <span
                          className={cn(
                            'hidden md:block absolute left-full ml-3 px-2.5 py-1 rounded-lg',
                            'bg-fm-neutral-900 text-white text-xs font-medium whitespace-nowrap',
                            'opacity-0 pointer-events-none',
                            'group-hover/nav:opacity-100',
                            'transition-opacity duration-150',
                            'shadow-lg'
                          )}
                          style={{ zIndex: 60 }}
                        >
                          {item.label}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Expand button at bottom when collapsed (desktop) ── */}
        {collapsed && (
          <div className="hidden md:flex shrink-0 justify-center py-3 border-t border-fm-neutral-100">
            <IconBtn
              onClick={() => setCollapsed(false)}
              label="Expand sidebar (Cmd+B)"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </IconBtn>
          </div>
        )}

        {/* ── User section ── */}
        {user && (
          <div
            className={cn(
              'shrink-0 border-t border-fm-neutral-100',
              collapsed ? 'p-3 md:py-3 md:px-2' : 'p-3'
            )}
          >
            <div
              className={cn(
                'flex items-center rounded-xl transition-colors',
                collapsed
                  ? 'gap-3 px-1.5 py-1 md:flex-col md:items-center md:gap-1.5 md:px-0 md:py-0'
                  : 'gap-3 px-1.5 py-1 hover:bg-fm-magenta-50/30'
              )}
            >
              <div
                className="w-8 h-8 rounded-full bg-fm-magenta-100 flex items-center justify-center shrink-0"
                title={collapsed ? user.name : undefined}
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={`${user.name} avatar`}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="w-4 h-4 text-fm-magenta-600" />
                )}
              </div>

              <div className={cn('flex-1 min-w-0', collapsed && 'md:hidden')}>
                <p className="text-sm font-medium text-fm-neutral-900 truncate">{user.name}</p>
                <p className="text-[11px] text-fm-neutral-500 truncate">
                  {user.role ?? user.email}
                </p>
              </div>

              {onLogout && (
                <IconBtn onClick={onLogout} label="Log out" title="Log out">
                  <LogOut className="w-3.5 h-3.5" />
                </IconBtn>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* ─────────────── Main content ─────────────── */}
      <div
        className={cn(
          'flex-1 flex flex-col min-w-0',
          'transition-[margin-left] duration-300 ease-in-out',
          collapsed ? 'md:ml-[72px]' : 'md:ml-64'
        )}
        inert={mobileOpen || undefined}
      >
        {/* Top bar */}
        <header
          className={cn(
            'sticky top-0 flex items-center justify-between h-14 px-3 md:px-4 lg:px-6',
            styles.header
          )}
          style={{ zIndex: 30 }}
        >
          {/* Left — mobile menu toggle + breadcrumb */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              ref={menuTriggerRef}
              onClick={() => setMobileOpen(true)}
              className="md:hidden flex items-center justify-center w-11 h-11 rounded-lg text-fm-neutral-600 hover:text-fm-neutral-900 hover:bg-fm-neutral-100 transition-colors shrink-0"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb: full on desktop, page title only on mobile */}
            {breadcrumb && (
              <>
                <div className="hidden md:block min-w-0">{breadcrumb}</div>
                <span className="md:hidden text-sm font-semibold text-fm-neutral-900 truncate min-w-0">
                  {(() => {
                    const allItems = navigation.flatMap(g => g.items);
                    const active = allItems.find(item => isActive(item.href));
                    return active?.label || '';
                  })()}
                </span>
              </>
            )}
          </div>

          {/* Right — search trigger + actions */}
          <div className="flex items-center gap-1">
            {onCommandPalette && (
              <>
                {/* Mobile: icon-only search button */}
                <IconBtn
                  label="Search"
                  className="sm:hidden"
                  onClick={onCommandPalette}
                >
                  <Search className="w-[18px] h-[18px]" />
                </IconBtn>
                {/* Desktop: full search bar */}
                <button
                  onClick={onCommandPalette}
                  className="hidden sm:flex items-center gap-2 h-8 px-3 rounded-lg border border-fm-neutral-200 text-sm text-fm-neutral-500 hover:text-fm-neutral-700 hover:border-fm-neutral-300 transition-colors"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Search...</span>
                  <kbd className="ml-2 text-[10px] font-mono bg-fm-neutral-100 rounded px-1.5 py-0.5 text-fm-neutral-400">
                    {'\u2318'}K
                  </kbd>
                </button>
              </>
            )}
            {/* Notification bell + dropdown */}
            <div className="relative" ref={notifRef}>
              <IconBtn
                label="Notifications"
                className="relative"
                onClick={() => setNotifOpen((p) => !p)}
              >
                <Bell className="w-[18px] h-[18px]" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center bg-fm-magenta-500 text-white text-[10px] font-bold rounded-full leading-none">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </IconBtn>

              {/* Notification Panel */}
              {notifOpen && (
                <div
                  className="fixed inset-x-3 bottom-3 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-96 max-h-[80vh] sm:max-h-96 bg-white rounded-xl shadow-xl border border-fm-neutral-200 overflow-hidden"
                  style={{ zIndex: 100 }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-fm-neutral-100 bg-fm-neutral-50">
                    <h3 className="font-semibold text-fm-neutral-900 text-sm">
                      Notifications
                      {unreadCount > 0 && (
                        <span className="ml-2 text-xs font-medium text-fm-magenta-600">
                          {unreadCount} new
                        </span>
                      )}
                    </h3>
                    {unreadCount > 0 && onMarkAllRead && (
                      <button
                        onClick={() => { onMarkAllRead(); }}
                        className="text-xs text-fm-magenta-600 hover:text-fm-magenta-700 font-medium flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* Notification list */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-fm-neutral-100">
                    {notifications.length === 0 ? (
                      <div className="py-10 px-4" style={{ textAlign: 'center' as const }}>
                        <Bell className="w-8 h-8 text-fm-neutral-300 mx-auto mb-2" />
                        <p className="text-sm text-fm-neutral-500">No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          className={cn(
                            'w-full px-4 py-3 flex items-start gap-3 hover:bg-fm-neutral-50 transition-colors',
                            !n.isRead && 'bg-fm-magenta-50/40'
                          )}
                          onClick={() => {
                            onNotificationClick?.(n.id, n.actionUrl || undefined);
                            setNotifOpen(false);
                          }}
                        >
                          {/* Unread dot */}
                          <div className="pt-1.5 shrink-0">
                            {!n.isRead ? (
                              <span className="block w-2 h-2 rounded-full bg-fm-magenta-500" />
                            ) : (
                              <span className="block w-2 h-2 rounded-full bg-transparent" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0" style={{ textAlign: 'left' as const }}>
                            <p className={cn(
                              'text-sm leading-tight',
                              !n.isRead ? 'font-semibold text-fm-neutral-900' : 'text-fm-neutral-700'
                            )}>
                              {n.title}
                            </p>
                            {n.message && (
                              <p className="text-xs text-fm-neutral-500 mt-0.5 truncate">{n.message}</p>
                            )}
                            <p className="text-[11px] text-fm-neutral-400 mt-1">
                              {formatRelativeTime(n.createdAt)}
                            </p>
                          </div>
                          {n.actionUrl && (
                            <ExternalLink className="w-3.5 h-3.5 text-fm-neutral-400 shrink-0 mt-1" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-3 md:p-4 lg:p-6 pb-20 md:pb-4 lg:pb-6 overflow-auto">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      {/* Mobile bottom navigation — all dashboard variants */}
      <MobileBottomNav navigation={allGroups} />

      {/* ─────────────── Mobile overlay (always rendered for smooth transitions) ─────────────── */}
      <div
        className={cn(
          'fixed inset-0 bg-black/40 md:hidden',
          'transition-opacity duration-300 ease-in-out',
          mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        style={{ zIndex: 40 }}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />
    </div>
  );
};
