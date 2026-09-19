'use client';

import { useState } from 'react';

type State = 'idle' | 'sending' | 'done' | 'error';

/** A button, not an automatic unsubscribe on page load: link scanners open URLs too. */
export function UnsubscribeForm({ token }: { token: string }) {
  const [state, setState] = useState<State>(token ? 'idle' : 'error');
  const [message, setMessage] = useState(
    token ? '' : 'This link is incomplete. Reply "unsubscribe" to any of our emails instead.'
  );

  async function confirm() {
    setState('sending');
    try {
      const res = await fetch('/api/sales/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ t: token }),
      });
      if (res.ok) {
        setState('done');
        return;
      }
      const json: unknown = await res.json().catch(() => null);
      const error =
        typeof json === 'object' && json !== null && 'error' in json && typeof json.error === 'string'
          ? json.error
          : 'Something went wrong. Please try again.';
      setMessage(error);
      setState('error');
    } catch {
      setMessage('Could not reach the server. Check your connection and try again.');
      setState('error');
    }
  }

  if (state === 'done') {
    return (
      <p className="font-site-sans text-site-lead text-site-text" role="status">
        You are unsubscribed. We will not email you about this enquiry again.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-start gap-5">
      <button
        type="button"
        onClick={confirm}
        disabled={state === 'sending' || !token}
        className="btn btn--primary disabled:opacity-50"
      >
        {state === 'sending' ? 'Unsubscribing…' : 'Unsubscribe'}
      </button>
      {state === 'error' && (
        <p className="font-site-sans text-site-body" style={{ color: 'var(--site-accent)' }} role="alert">
          {message}
        </p>
      )}
    </div>
  );
}
