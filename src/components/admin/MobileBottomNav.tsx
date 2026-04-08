'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Briefcase, Calendar, Users, MoreHorizontal, X } from 'lucide-react';
import type { NavigationGroup, NavigationItem } from '@/design-system/components/layouts/DashboardLayout';

interface MobileBottomNavProps {
  navigation: NavigationGroup[];
}

const ICON_MAP: Record<string, typeof LayoutDashboard> = {
  '/admin': LayoutDashboard,
  '/admin/projects': Briefcase,
  '/admin/content': Calendar,
  '/admin/clients': Users,
  '/admin/leads': Users,
  '/admin/my-work': Briefcase,
};

const DEFAULT_TABS: { label: string; href: string; icon: typeof LayoutDashboard }[] = [
  { label: 'Home', href: '/admin', icon: LayoutDashboard },
  { label: 'Projects', href: '/admin/projects', icon: Briefcase },
  { label: 'Content', href: '/admin/content', icon: Calendar },
  { label: 'Clients', href: '/admin/clients', icon: Users },
];

export function MobileBottomNav({ navigation }: MobileBottomNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  // Derive primary tabs from the first 4 visible nav items (permission-filtered)
  const allNavItems = navigation.flatMap((g) => g.items);
  const PRIMARY_TABS = allNavItems.length > 0
    ? allNavItems.slice(0, 4).map((item) => ({
        label: item.label,
        href: item.href,
        icon: ICON_MAP[item.href] || LayoutDashboard,
      }))
    : DEFAULT_TABS;

  const primaryHrefs = new Set(PRIMARY_TABS.map((t) => t.href));

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === href;
    return pathname?.startsWith(href) ?? false;
  };

  // Collect overflow items from navigation groups (excluding primary tabs)
  const overflowItems: NavigationItem[] = [];
  for (const group of navigation) {
    for (const item of group.items) {
      if (!primaryHrefs.has(item.href)) {
        overflowItems.push(item);
      }
    }
  }

  const isMoreActive = overflowItems.some((item) => isActive(item.href));

  return (
    <>
      {/* More overlay sheet */}
      {moreOpen && (
        <div
          className="fixed inset-0 md:hidden"
          style={{ zIndex: 34 }}
          onClick={() => setMoreOpen(false)}
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-black/30" />
        </div>
      )}

      {moreOpen && (
        <div
          className="fixed left-2 right-2 md:hidden bg-white rounded-2xl shadow-2xl border border-fm-neutral-200 overflow-hidden"
          style={{
            zIndex: 36,
            bottom: 'calc(64px + env(safe-area-inset-bottom, 0px) + 8px)',
            maxHeight: '60vh',
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-fm-neutral-100">
            <span className="text-sm font-semibold text-fm-neutral-900">More Pages</span>
            <button
              onClick={() => setMoreOpen(false)}
              className="p-1 rounded-lg text-fm-neutral-500 hover:text-fm-neutral-700 hover:bg-fm-neutral-100 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <nav className="overflow-y-auto p-2" style={{ maxHeight: 'calc(60vh - 48px)' }}>
            {overflowItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                    active
                      ? 'bg-fm-magenta-50 text-fm-magenta-700'
                      : 'text-fm-neutral-600 hover:bg-fm-neutral-50 hover:text-fm-neutral-900'
                  )}
                >
                  {item.icon && (
                    <span className={cn('shrink-0', active ? 'text-fm-magenta-600' : 'text-fm-neutral-400')}>
                      {item.icon}
                    </span>
                  )}
                  {item.label}
                  {item.badge && (
                    <span className="ml-auto text-[11px] font-semibold bg-fm-magenta-100 text-fm-magenta-700 rounded-full px-1.5 py-0.5">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Bottom navigation bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-fm-neutral-200"
        style={{
          zIndex: 35,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-around h-16">
          {PRIMARY_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-w-[48px] transition-colors',
                  active ? 'text-fm-magenta-600' : 'text-fm-neutral-400'
                )}
              >
                <span className="flex items-center justify-center w-8 h-8">
                  <Icon className="w-5 h-5" />
                </span>
                <span className="text-[10px] font-medium leading-none">{tab.label}</span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen((p) => !p)}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-w-[48px] transition-colors',
              moreOpen || isMoreActive ? 'text-fm-magenta-600' : 'text-fm-neutral-400'
            )}
          >
            <span className="flex items-center justify-center w-8 h-8">
              <MoreHorizontal className="w-5 h-5" />
            </span>
            <span className="text-[10px] font-medium leading-none">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
