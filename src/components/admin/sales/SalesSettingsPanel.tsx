'use client';

import { useCallback, useEffect, useState } from 'react';
import { Copy } from 'lucide-react';
import { CardContent, CardDescription, CardHeader, CardTitle, DashboardButton, DashboardCard } from '@/design-system';
import { Input } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';
import { adminToast } from '@/lib/admin/toast';
import { formatIst } from '@/lib/sales/api-types';

interface SalesSettingsPayload {
  settings: { automationEnabled: boolean; bookingLink: string };
  users: Array<{ id: string; name: string; email: string | null; role: string; inRotation: boolean }>;
  webhooks: Array<{ source: string; url: string; configured: boolean; missingEnv: string[]; lastReceivedAt: string | null; lastError: string | null }>;
  emailConfigured: boolean;
}

const SOURCE_NAMES: Record<string, string> = {
  google: 'Google Ads lead forms',
  connector: 'Zapier / Make',
  meta: 'Meta Lead Ads',
  calcom: 'Cal.com bookings',
  resend: 'Email replies and bounces',
};

export function SalesSettingsPanel() {
  const [data, setData] = useState<SalesSettingsPayload | null>(null);
  const [bookingLink, setBookingLink] = useState('');
  const [rotation, setRotation] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const apply = useCallback((payload: SalesSettingsPayload) => {
    setData(payload);
    setBookingLink(payload.settings.bookingLink);
    setRotation(payload.users.filter((user) => user.inRotation).map((user) => user.id));
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/sales/settings');
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) apply(json.data);
      else adminToast.error(json?.error ?? 'Could not load sales settings');
    } catch {
      adminToast.error('Could not load sales settings');
    }
  }, [apply]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(patch: Record<string, unknown>, success: string) {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/sales/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        apply(json.data);
        adminToast.success(success);
      } else {
        adminToast.error(json?.error ?? 'Could not save sales settings');
      }
    } catch {
      adminToast.error('Could not save sales settings');
    } finally {
      setSaving(false);
    }
  }

  if (!data) {
    return <p className="text-sm text-fm-neutral-500">Loading sales settings…</p>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <DashboardCard variant="admin">
        <CardHeader>
          <CardTitle>Automation</CardTitle>
          <CardDescription>
            When this is off, new leads still get an owner, a brief and a first-touch task, but nothing is sent to them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Toggle
            checked={data.settings.automationEnabled}
            onChange={(checked) => save({ automationEnabled: checked }, checked ? 'Automation on' : 'Automation off')}
            disabled={saving}
            label="Send instant replies and follow-ups"
            description="Email only, to people who contacted you. Sent 09:00–19:00 IST."
          />
          {!data.emailConfigured && (
            <p className="text-sm text-amber-700">
              Sending is not set up yet: RESEND_API_KEY, SALES_REPLY_TO and SALES_LINK_SECRET must all be set. See docs/SALES-SETUP.md.
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="w-full sm:w-72">
              <Input
                id="booking-link"
                label="Cal.com booking link"
                hint="team/event, for example fm-in/15min"
                value={bookingLink}
                onChange={(e) => setBookingLink(e.target.value)}
              />
            </div>
            <DashboardButton
              variant="secondary"
              size="sm"
              disabled={saving || bookingLink === data.settings.bookingLink}
              onClick={() => save({ bookingLink }, 'Booking link saved')}
            >
              Save link
            </DashboardButton>
          </div>
        </CardContent>
      </DashboardCard>

      <DashboardCard variant="admin">
        <CardHeader>
          <CardTitle>Sales rotation</CardTitle>
          <CardDescription>New leads go to whoever in this list was assigned one least recently.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.users.length === 0 ? (
            <p className="text-sm text-fm-neutral-500">Add team members under Users first.</p>
          ) : (
            <ul className="space-y-2">
              {data.users.map((user) => (
                <li key={user.id}>
                  <label htmlFor={`rotation-${user.id}`} className="flex items-center gap-3 text-sm text-fm-neutral-800">
                    <input
                      id={`rotation-${user.id}`}
                      type="checkbox"
                      checked={rotation.includes(user.id)}
                      onChange={(e) =>
                        setRotation((current) => (e.target.checked ? [...current, user.id] : current.filter((id) => id !== user.id)))
                      }
                      className="rounded border-fm-neutral-300 text-fm-magenta-600 focus:ring-fm-magenta-500"
                    />
                    <span className="font-medium">{user.name}</span>
                    <span className="text-fm-neutral-500">{user.role}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <DashboardButton variant="primary" size="sm" disabled={saving} onClick={() => save({ rotation }, 'Rotation saved')}>
            Save rotation
          </DashboardButton>
        </CardContent>
      </DashboardCard>

      <DashboardCard variant="admin">
        <CardHeader>
          <CardTitle>Lead sources</CardTitle>
          <CardDescription>Paste each URL into the platform. The last delivery shows up here within seconds.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-fm-neutral-200">
            {data.webhooks.map((hook) => (
              <li key={hook.source} className="space-y-1 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-fm-neutral-900">{SOURCE_NAMES[hook.source] ?? hook.source}</p>
                  <span className={`text-xs font-medium ${hook.configured ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {hook.configured ? 'Ready' : `Needs ${hook.missingEnv.join(', ')}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 truncate rounded bg-fm-neutral-50 px-2 py-1 text-xs text-fm-neutral-700">{hook.url}</code>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(hook.url);
                        adminToast.success('URL copied');
                      } catch {
                        adminToast.error('Could not copy the URL');
                      }
                    }}
                    className="text-fm-neutral-500 hover:text-fm-magenta-700"
                    aria-label={`Copy the ${SOURCE_NAMES[hook.source] ?? hook.source} URL`}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-fm-neutral-500">
                  {hook.lastReceivedAt ? `Last delivery ${formatIst(hook.lastReceivedAt)} IST` : 'No deliveries yet'}
                  {hook.lastError ? ` · Last error: ${hook.lastError}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </CardContent>
      </DashboardCard>
    </div>
  );
}
