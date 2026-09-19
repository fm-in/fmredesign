'use client';

import { useId, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes, type InputHTMLAttributes } from 'react';
import { HONEYPOT_FIELD } from '@/lib/spam-guard-field';

/**
 * Form primitives for the public site.
 *
 * Every field here is labelled with a real `<label for>` rather than a
 * placeholder. Placeholder-as-label disappears the moment someone types, which
 * is the single most common accessibility failure in the forms being replaced.
 *
 * Errors are wired with `aria-describedby` and `aria-invalid` so a screen
 * reader announces them, and the message is rendered in ink, never in the
 * accent — `#C9325D` on bone measures ~4.7:1, too thin to carry an error at
 * small size.
 */

function labelClasses() {
  return 'block font-site-sans text-site-label uppercase text-site-muted';
}

function controlStyle(invalid: boolean): React.CSSProperties {
  return {
    background: 'var(--site-raised)',
    border: `1px solid ${invalid ? 'var(--site-text)' : 'var(--site-line)'}`,
    color: 'var(--site-text)',
  };
}

const CONTROL = 'mt-2 w-full rounded-site-sm px-3 py-3 font-site-sans text-site-body outline-none focus-visible:ring-2';

interface Common {
  label: string;
  error?: string;
  hint?: ReactNode;
}

export function TextField({
  label,
  error,
  hint,
  ...props
}: Common & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  return (
    <div>
      <label htmlFor={id} className={labelClasses()}>
        {label}
        {props.required && <span aria-hidden> *</span>}
      </label>
      <input
        {...props}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={[error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined}
        className={CONTROL}
        style={controlStyle(Boolean(error))}
      />
      {hint && (
        <p id={hintId} className="mt-2 font-site-sans text-site-label text-site-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-2 font-site-sans text-site-label text-site-text">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextAreaField({
  label,
  error,
  hint,
  ...props
}: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className={labelClasses()}>
        {label}
        {props.required && <span aria-hidden> *</span>}
      </label>
      <textarea
        {...props}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={CONTROL}
        style={controlStyle(Boolean(error))}
      />
      {error && (
        <p id={errorId} className="mt-2 font-site-sans text-site-label text-site-text">
          {error}
        </p>
      )}
    </div>
  );
}

export function SelectField({
  label,
  error,
  options,
  placeholder,
  ...props
}: Common & { options: readonly string[]; placeholder?: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className={labelClasses()}>
        {label}
        {props.required && <span aria-hidden> *</span>}
      </label>
      <select
        {...props}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={CONTROL}
        style={controlStyle(Boolean(error))}
      >
        {/* An empty value with a readable label, so the control never shows a
            blank line and never submits the prompt text as an answer. */}
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} className="mt-2 font-site-sans text-site-label text-site-text">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * The honeypot.
 *
 * Every unauthenticated POST route in this app runs `checkSpam` against a
 * field of this name, so a migrated form that forgets it starts failing the
 * guard silently. Rendering it through a primitive means it cannot be left out
 * by accident.
 *
 * Hidden with an off-screen clip rather than `display: none` or
 * `visibility: hidden` — a bot filters those out, but fills a field it can
 * "see" in the DOM.
 */
export function Honeypot({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div
      aria-hidden
      style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}
    >
      <label htmlFor={HONEYPOT_FIELD}>Company website</label>
      <input
        id={HONEYPOT_FIELD}
        type="text"
        name={HONEYPOT_FIELD}
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

/** The submit button. One style, so no form invents its own. */
export function SubmitButton({
  children,
  busy = false,
  ...props
}: { children: ReactNode; busy?: boolean } & InputHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      type="submit"
      disabled={busy || props.disabled}
      className="btn btn--primary disabled:opacity-60"
    >
      {busy ? 'Sending…' : children}
    </button>
  );
}
