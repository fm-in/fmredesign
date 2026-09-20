'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Copy, RefreshCw } from 'lucide-react';
import { DashboardCard, CardContent, CardHeader, CardTitle, CardDescription, DashboardButton } from '@/design-system';

/**
 * Settings → WhatsApp.
 *
 * Read-only on purpose. Templates are written and approved in Meta's own
 * interface, and rebuilding that here would be a second source of truth for
 * something Meta has the final say on. What this screen is for is answering
 * "is it actually on", which was previously impossible to tell from inside
 * the product.
 */

interface TemplateRow {
  name: string;
  language: string;
  category: string;
  status: string;
  variables: number;
}

interface Status {
  configured: boolean;
  missingEnv: string[];
  webhook: { url: string; lastReceivedAt: string | null; lastError: string | null; legacyPath?: boolean };
  number: { displayPhoneNumber: string | null; verifiedName: string | null; qualityRating: string | null; verified: boolean } | null;
  templates: TemplateRow[];
  subscribedApps: number | null;
  graphError: string | null;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-2.5 border-b border-fm-neutral-200 last:border-b-0">
      <span className="text-sm text-fm-neutral-600 shrink-0">{label}</span>
      <span className="text-sm text-fm-neutral-900 text-right break-all">{children}</span>
    </div>
  );
}

function Pill({ tone, children }: { tone: 'good' | 'bad' | 'warn'; children: React.ReactNode }) {
  const styles = {
    good: 'bg-green-50 text-green-700 border-green-200',
    bad: 'bg-red-50 text-red-700 border-red-200',
    warn: 'bg-amber-50 text-amber-800 border-amber-200',
  }[tone];
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${styles}`}>{children}</span>;
}

export function WhatsAppSettingsPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/whatsapp/status');
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Could not read the WhatsApp status');
      setStatus(json.data as Status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read the WhatsApp status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const copyWebhook = async () => {
    if (!status) return;
    try {
      await navigator.clipboard.writeText(status.webhook.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission refused; the URL is on screen to copy by hand.
    }
  };

  if (loading && !status) {
    return (
      <DashboardCard variant="admin">
        <CardContent className="p-6 text-sm text-fm-neutral-600">Reading the WhatsApp connection…</CardContent>
      </DashboardCard>
    );
  }

  if (error || !status) {
    return (
      <DashboardCard variant="admin">
        <CardContent className="p-6">
          <p className="text-sm text-red-700">{error}</p>
          <DashboardButton variant="secondary" size="sm" className="mt-4" onClick={() => void load()}>
            Try again
          </DashboardButton>
        </CardContent>
      </DashboardCard>
    );
  }

  const live = status.configured && status.subscribedApps !== null && status.subscribedApps > 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <DashboardCard variant="admin">
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>WhatsApp</CardTitle>
            <CardDescription>
              The business number, and whether messages sent to it actually reach us.
            </CardDescription>
          </div>
          <DashboardButton variant="secondary" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </DashboardButton>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          {/*
            The single most useful line on the screen. A correct callback URL
            with no app subscribed means Meta is delivering nowhere, and there
            is no other way to see that from in here.
          */}
          <div className="mb-5">
            {live ? (
              <Pill tone="good">
                <CheckCircle2 className="h-3.5 w-3.5" /> Receiving messages
              </Pill>
            ) : (
              <Pill tone="bad">
                <AlertTriangle className="h-3.5 w-3.5" />
                {status.subscribedApps === 0 ? 'No app subscribed — messages reach nobody' : 'Not connected'}
              </Pill>
            )}
          </div>

          <Row label="Number">{status.number?.displayPhoneNumber ?? '—'}</Row>
          <Row label="Display name">{status.number?.verifiedName ?? '—'}</Row>
          <Row label="Quality rating">
            {status.number?.qualityRating ? (
              <Pill tone={status.number.qualityRating === 'GREEN' ? 'good' : status.number.qualityRating === 'RED' ? 'bad' : 'warn'}>
                {status.number.qualityRating}
              </Pill>
            ) : (
              '—'
            )}
          </Row>
          <Row label="Apps subscribed to the WABA">
            {status.subscribedApps === null ? '—' : status.subscribedApps}
          </Row>
          <Row label="Last webhook received">
            {status.webhook.lastReceivedAt ? new Date(status.webhook.lastReceivedAt).toLocaleString('en-IN') : 'Never'}
          </Row>
          {status.webhook.legacyPath && (
            <Row label="Note">
              <span className="text-amber-800">
                Last delivery arrived on the older /sales/whatsapp path — still supported, but the URL above is the one to use.
              </span>
            </Row>
          )}
          {status.webhook.lastError && (
            <Row label="Last webhook error">
              <span className="text-red-700">{status.webhook.lastError}</span>
            </Row>
          )}

          <div className="mt-5">
            <p className="text-sm text-fm-neutral-600 mb-2">Callback URL — paste this into Meta</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-fm-neutral-50 border border-fm-neutral-200 rounded px-3 py-2 break-all">
                {status.webhook.url}
              </code>
              <DashboardButton variant="secondary" size="sm" onClick={() => void copyWebhook()}>
                <Copy className="h-4 w-4" />
                {copied ? 'Copied' : 'Copy'}
              </DashboardButton>
            </div>
          </div>

          {status.missingEnv.length > 0 && (
            <div className="mt-5 rounded border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-900">Not configured</p>
              <p className="text-sm text-amber-800 mt-1">
                Missing:{' '}
                {status.missingEnv.map((name, index) => (
                  <span key={name}>
                    {index > 0 && ', '}
                    <code>{name}</code>
                  </span>
                ))}
              </p>
            </div>
          )}

          {status.graphError && (
            <div className="mt-5 rounded border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-medium text-red-900">Meta returned an error</p>
              <p className="text-sm text-red-800 mt-1">{status.graphError}</p>
            </div>
          )}
        </CardContent>
      </DashboardCard>

      <DashboardCard variant="admin">
        <CardHeader>
          <CardTitle>Approved templates</CardTitle>
          <CardDescription>
            Written and approved in Meta&rsquo;s interface — this is a read-only view of what is live there.
            A template only sends if the code uses its exact name and language.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          {status.templates.length === 0 ? (
            <p className="text-sm text-fm-neutral-600">No templates, or Meta could not be reached.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-fm-neutral-500 border-b border-fm-neutral-200">
                    <th className="py-2 pr-4 font-medium">Name</th>
                    <th className="py-2 pr-4 font-medium">Language</th>
                    <th className="py-2 pr-4 font-medium">Category</th>
                    <th className="py-2 pr-4 font-medium">Variables</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {status.templates.map((template) => (
                    <tr key={`${template.name}:${template.language}`} className="border-b border-fm-neutral-100 last:border-b-0">
                      <td className="py-2 pr-4 font-mono text-xs text-fm-neutral-900">{template.name}</td>
                      <td className="py-2 pr-4 text-fm-neutral-700">{template.language}</td>
                      <td className="py-2 pr-4 text-fm-neutral-700">{template.category}</td>
                      <td className="py-2 pr-4 text-fm-neutral-700">{template.variables}</td>
                      <td className="py-2">
                        <Pill tone={template.status === 'APPROVED' ? 'good' : template.status === 'REJECTED' ? 'bad' : 'warn'}>
                          {template.status}
                        </Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </DashboardCard>
    </div>
  );
}
