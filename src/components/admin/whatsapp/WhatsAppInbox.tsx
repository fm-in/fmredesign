'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, Clock, Send } from 'lucide-react';
import { DashboardCard, CardContent, DashboardButton } from '@/design-system';

/**
 * The WhatsApp inbox.
 *
 * This exists because a number registered to the Cloud API cannot be opened in
 * the WhatsApp or WhatsApp Business app. Before this screen there was no way
 * for anyone to answer as the business at all: the automatic reply went out,
 * and then the conversation stopped.
 *
 * The 24-hour window is the thing the UI has to be honest about. WhatsApp
 * accepts free text only within 24 hours of the customer's own last message.
 * Outside it, a typed reply is refused by Meta with an error that means
 * nothing to the person who wrote it — so the composer disables itself and
 * says why, rather than letting someone write a paragraph into a void.
 */

interface Message {
  id: string;
  direction: 'in' | 'out';
  body: string | null;
  occurredAt: string;
  type: string;
  templateName: string | null;
  deliveryStatus: string | null;
  automatic: boolean;
  actorName: string | null;
}

interface WindowState {
  open: boolean;
  expiresAt: string | null;
  lastInboundAt: string | null;
}

interface Summary {
  leadId: string;
  name: string;
  phoneE164: string | null;
  lastMessage: string | null;
  lastAt: string;
  lastDirection: 'in' | 'out';
  awaitingReply: boolean;
  window: WindowState;
}

const time = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function windowLabel(window: WindowState): string {
  if (!window.lastInboundAt) return 'They have not messaged us';
  if (!window.open) return 'Reply window closed — only an approved template will send';
  const hours = Math.max(0, Math.floor((new Date(window.expiresAt!).getTime() - Date.now()) / 3_600_000));
  return hours >= 1 ? `Reply window open for ${hours}h` : 'Reply window closes within the hour';
}

export function WhatsAppInbox() {
  // `?lead=` lets a task card open straight onto its conversation.
  const requested = useSearchParams().get('lead');
  const [conversations, setConversations] = useState<Summary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(requested);
  const [messages, setMessages] = useState<Message[]>([]);
  const [window_, setWindow] = useState<WindowState | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/whatsapp/conversations');
      const json = await res.json();
      if (json.success) setConversations(json.data.conversations as Summary[]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadThread = useCallback(async (leadId: string) => {
    const res = await fetch(`/api/admin/whatsapp/conversations/${leadId}`);
    const json = await res.json();
    if (json.success) {
      setMessages(json.data.messages as Message[]);
      setWindow(json.data.window as WindowState);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (activeId) void loadThread(activeId);
  }, [activeId, loadThread]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  const send = async () => {
    if (!activeId || !draft.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/whatsapp/conversations/${activeId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: draft }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? 'Could not send');
        return;
      }
      setDraft('');
      await loadThread(activeId);
      await loadList();
    } catch {
      setError('Could not reach the server');
    } finally {
      setSending(false);
    }
  };

  const active = conversations.find((c) => c.leadId === activeId) ?? null;

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <DashboardCard variant="admin">
        <CardContent className="p-0 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <p className="p-4 text-sm text-fm-neutral-600">Loading…</p>
          ) : conversations.length === 0 ? (
            <p className="p-4 text-sm text-fm-neutral-600">
              No WhatsApp conversations yet. They appear here as soon as someone messages the business number.
            </p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.leadId}
                onClick={() => setActiveId(c.leadId)}
                className={`w-full border-b border-fm-neutral-200 p-3 text-left last:border-b-0 hover:bg-fm-neutral-50 ${
                  c.leadId === activeId ? 'bg-fm-neutral-50' : ''
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium text-fm-neutral-900">{c.name}</span>
                  <span className="shrink-0 text-xs text-fm-neutral-500">{time(c.lastAt)}</span>
                </div>
                <p className="mt-1 truncate text-xs text-fm-neutral-600">
                  {c.lastDirection === 'out' && <span className="text-fm-neutral-400">You: </span>}
                  {c.lastMessage ?? '(no text)'}
                </p>
                {c.awaitingReply && (
                  <span className="mt-1.5 inline-block rounded-full bg-fm-magenta-600 px-2 py-0.5 text-[10px] font-medium text-white">
                    Awaiting reply
                  </span>
                )}
              </button>
            ))
          )}
        </CardContent>
      </DashboardCard>

      <DashboardCard variant="admin">
        <CardContent className="flex h-[70vh] flex-col p-0">
          {!active ? (
            <p className="p-6 text-sm text-fm-neutral-600">Pick a conversation.</p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4 border-b border-fm-neutral-200 p-4">
                <div>
                  <p className="text-sm font-medium text-fm-neutral-900">{active.name}</p>
                  <p className="text-xs text-fm-neutral-500">{active.phoneE164}</p>
                </div>
                <Link href={`/admin/leads/${active.leadId}`} className="text-xs text-fm-magenta-700 hover:underline">
                  Open lead
                </Link>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] rounded-lg px-3 py-2 ${
                        m.direction === 'out'
                          ? m.type === 'message_failed'
                            ? 'bg-red-50 text-red-900 border border-red-200'
                            : 'bg-fm-magenta-600 text-white'
                          : 'bg-fm-neutral-100 text-fm-neutral-900'
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm">
                        {m.body ?? (m.templateName ? `Template: ${m.templateName}` : '(no text)')}
                      </p>
                      <p className={`mt-1 text-[10px] ${m.direction === 'out' ? 'text-white/70' : 'text-fm-neutral-500'}`}>
                        {time(m.occurredAt)}
                        {m.automatic && ' · automatic'}
                        {m.actorName && m.actorName !== 'System' && ` · ${m.actorName}`}
                        {m.type === 'message_failed' && ' · failed'}
                        {m.deliveryStatus === 'read' && ' · read'}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>

              <div className="border-t border-fm-neutral-200 p-3">
                <p className="mb-2 flex items-center gap-1.5 text-xs text-fm-neutral-600">
                  {window_?.open ? <Clock className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
                  {window_ ? windowLabel(window_) : ''}
                </p>
                <div className="flex gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void send();
                    }}
                    disabled={!window_?.open || sending}
                    rows={2}
                    placeholder={window_?.open ? 'Reply as Freaking Minds…' : 'Cannot reply in free text right now'}
                    className="flex-1 resize-none rounded-md border border-fm-neutral-300 p-2 text-sm disabled:bg-fm-neutral-50 disabled:text-fm-neutral-400"
                  />
                  <DashboardButton
                    variant="secondary"
                    size="sm"
                    onClick={() => void send()}
                    disabled={!window_?.open || sending || !draft.trim()}
                  >
                    <Send className="h-4 w-4" />
                    {sending ? 'Sending…' : 'Send'}
                  </DashboardButton>
                </div>
                {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
              </div>
            </>
          )}
        </CardContent>
      </DashboardCard>
    </div>
  );
}
