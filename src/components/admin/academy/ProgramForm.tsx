/**
 * Program editor — shared by /admin/academy/new and /admin/academy/[id]/edit.
 *
 * Designed for an admin who wants to ship a workshop in 5 minutes:
 *   - Top section is "what's minimally required to publish" (title, format,
 *     status, price, dates, payment link).
 *   - Lower collapsible sections cover the rich marketing surface
 *     (outcomes, syllabus, FAQ, testimonials, delivery URLs, instructor).
 *
 * Form state is local; submit hits /api/admin/academy/programs (POST for
 * new, PUT for edit). After save the parent redirects to /admin/academy.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Save,
  ArrowLeft,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react';
import {
  DashboardCard as Card,
  CardContent,
  CardHeader,
  CardTitle,
  DashboardButton as Button,
} from '@/design-system';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/select-native';
import { adminToast } from '@/lib/admin/toast';
import {
  FORMAT_LABELS,
  STATUS_LABELS,
  type Program,
  type ProgramFormat,
  type ProgramStatus,
  type SyllabusModule,
  type FaqItem,
  type Testimonial,
  type ProgramScheduleEntry,
} from '@/lib/admin/academy-types';

// ─────────────────────────────────────────────────────────────────────────
// Local form state — string-typed for inputs; coerced on submit.
// ─────────────────────────────────────────────────────────────────────────

interface FormState {
  title: string;
  slug: string;
  format: ProgramFormat;
  status: ProgramStatus;
  shortDescription: string;
  longDescription: string;
  coverImageUrl: string;

  priceInr: string;
  earlyBirdPriceInr: string;
  earlyBirdUntil: string;

  startsAt: string;
  endsAt: string;
  seatsTotal: string;

  outcomes: string[];
  syllabus: SyllabusModule[];
  schedule: ProgramScheduleEntry[];
  faq: FaqItem[];
  testimonials: Testimonial[];

  deliveryZoomUrl: string;
  deliveryWhatsappUrl: string;
  deliveryNotionUrl: string;

  instructorName: string;
  instructorBio: string;
  instructorImageUrl: string;

  paymentLinkUrl: string;
}

const EMPTY: FormState = {
  title: '',
  slug: '',
  format: 'workshop',
  status: 'draft',
  shortDescription: '',
  longDescription: '',
  coverImageUrl: '',
  priceInr: '',
  earlyBirdPriceInr: '',
  earlyBirdUntil: '',
  startsAt: '',
  endsAt: '',
  seatsTotal: '',
  outcomes: [],
  syllabus: [],
  schedule: [],
  faq: [],
  testimonials: [],
  deliveryZoomUrl: '',
  deliveryWhatsappUrl: '',
  deliveryNotionUrl: '',
  instructorName: '',
  instructorBio: '',
  instructorImageUrl: '',
  paymentLinkUrl: '',
};

function slugify(s: string): string {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toLocalDateTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalDateTime(s: string): string | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export interface ProgramFormProps {
  initial?: Program;
}

export function ProgramForm({ initial }: ProgramFormProps) {
  const router = useRouter();
  const isEdit = !!initial;

  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>('basics');

  // Hydrate from initial program (edit mode) on mount.
  useEffect(() => {
    if (!initial) return;
    setForm({
      title: initial.title || '',
      slug: initial.slug || '',
      format: initial.format,
      status: initial.status,
      shortDescription: initial.shortDescription || '',
      longDescription: initial.longDescription || '',
      coverImageUrl: initial.coverImageUrl || '',
      priceInr: initial.priceInr != null ? String(initial.priceInr) : '',
      earlyBirdPriceInr: initial.earlyBirdPriceInr != null ? String(initial.earlyBirdPriceInr) : '',
      earlyBirdUntil: toLocalDateTime(initial.earlyBirdUntil),
      startsAt: toLocalDateTime(initial.startsAt),
      endsAt: toLocalDateTime(initial.endsAt),
      seatsTotal: initial.seatsTotal != null ? String(initial.seatsTotal) : '',
      outcomes: initial.outcomes || [],
      syllabus: initial.syllabus || [],
      schedule: initial.schedule || [],
      faq: initial.faq || [],
      testimonials: initial.testimonials || [],
      deliveryZoomUrl: initial.deliveryZoomUrl || '',
      deliveryWhatsappUrl: initial.deliveryWhatsappUrl || '',
      deliveryNotionUrl: initial.deliveryNotionUrl || '',
      instructorName: initial.instructorName || '',
      instructorBio: initial.instructorBio || '',
      instructorImageUrl: initial.instructorImageUrl || '',
      paymentLinkUrl: initial.paymentLinkUrl || '',
    });
  }, [initial]);

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Auto-derive slug from title only while creating, and only if user hasn't
  // edited the slug yet. Edit mode never auto-clobbers existing slugs.
  const [slugTouched, setSlugTouched] = useState(false);
  useEffect(() => {
    if (isEdit || slugTouched) return;
    set('slug', slugify(form.title));
  }, [form.title, isEdit, slugTouched, set]);

  const handleSubmit = useCallback(async () => {
    if (!form.title.trim()) {
      adminToast.error('Title is required');
      setOpenSection('basics');
      return;
    }
    if (!form.format) {
      adminToast.error('Format is required');
      setOpenSection('basics');
      return;
    }
    if (form.status === 'open' && !form.paymentLinkUrl.trim()) {
      adminToast.error('Status "Open" needs a Razorpay payment link');
      setOpenSection('payment');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...(isEdit && initial ? { id: initial.id } : {}),
        title: form.title.trim(),
        slug: slugify(form.slug || form.title),
        format: form.format,
        status: form.status,
        shortDescription: form.shortDescription || null,
        longDescription: form.longDescription || null,
        coverImageUrl: form.coverImageUrl || null,
        priceInr: form.priceInr ? Number(form.priceInr) : 0,
        earlyBirdPriceInr: form.earlyBirdPriceInr ? Number(form.earlyBirdPriceInr) : null,
        earlyBirdUntil: fromLocalDateTime(form.earlyBirdUntil),
        startsAt: fromLocalDateTime(form.startsAt),
        endsAt: fromLocalDateTime(form.endsAt),
        seatsTotal: form.seatsTotal ? Number(form.seatsTotal) : null,
        outcomes: form.outcomes.filter((o) => o.trim()),
        syllabus: form.syllabus.filter((m) => m.title?.trim()),
        schedule: form.schedule.filter((s) => s.date),
        faq: form.faq.filter((f) => f.q?.trim()),
        testimonials: form.testimonials.filter((t) => t.name?.trim()),
        deliveryZoomUrl: form.deliveryZoomUrl || null,
        deliveryWhatsappUrl: form.deliveryWhatsappUrl || null,
        deliveryNotionUrl: form.deliveryNotionUrl || null,
        instructorName: form.instructorName || null,
        instructorBio: form.instructorBio || null,
        instructorImageUrl: form.instructorImageUrl || null,
        paymentLinkUrl: form.paymentLinkUrl || null,
      };

      const res = await fetch('/api/admin/academy/programs', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        adminToast.success(isEdit ? 'Program updated' : 'Program created');
        router.push('/admin/academy');
      } else {
        adminToast.error(json.error || 'Save failed');
      }
    } catch (err) {
      console.error(err);
      adminToast.error('Save failed');
    } finally {
      setSaving(false);
    }
  }, [form, isEdit, initial, router]);

  // Toggleable section header — keeps the form scannable without losing
  // any control surface area.
  const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => {
    const isOpen = openSection === id;
    return (
      <Card>
        <CardHeader>
          <button
            onClick={() => setOpenSection(isOpen ? null : id)}
            className="w-full flex items-center justify-between"
          >
            <CardTitle>{title}</CardTitle>
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </CardHeader>
        {isOpen && <CardContent className="space-y-4">{children}</CardContent>}
      </Card>
    );
  };

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-fm-neutral-200 bg-white text-fm-neutral-900 text-sm focus:ring-2 focus:ring-fm-magenta-500 focus:border-transparent';
  const labelCls = 'text-xs font-medium text-fm-neutral-600 block mb-1';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/admin/academy')}
          className="inline-flex items-center gap-1 text-sm text-fm-neutral-500 hover:text-fm-neutral-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back to programs
        </button>
        <Button variant="primary" onClick={handleSubmit} disabled={saving}>
          <Save className="w-4 h-4 mr-1" />
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create program'}
        </Button>
      </div>

      {/* ── Basics ───────────────────────────────────────────────────── */}
      <Section id="basics" title="Basics">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelCls}>Title *</label>
            <Input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Performance Marketing Bootcamp"
            />
          </div>
          <div>
            <label className={labelCls}>URL slug</label>
            <Input
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set('slug', slugify(e.target.value));
              }}
              placeholder="performance-marketing-bootcamp"
            />
            <p className="text-xs text-fm-neutral-400 mt-1">
              Public URL: /academy/{form.slug || 'your-slug'}
            </p>
          </div>
          <div>
            <label className={labelCls}>Format *</label>
            <Select
              value={form.format}
              onChange={(e) => set('format', e.target.value as ProgramFormat)}
            >
              {Object.entries(FORMAT_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <Select
              value={form.status}
              onChange={(e) => set('status', e.target.value as ProgramStatus)}
            >
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
            <p className="text-xs text-fm-neutral-400 mt-1">
              Public page is live when status is &quot;Open&quot;.
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Cover image URL</label>
            <Input
              value={form.coverImageUrl}
              onChange={(e) => set('coverImageUrl', e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Short description (1–2 lines, shown on listing)</label>
            <Input
              value={form.shortDescription}
              onChange={(e) => set('shortDescription', e.target.value)}
              placeholder="What this program teaches and who it's for"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Long description</label>
            <textarea
              className={inputCls}
              rows={4}
              value={form.longDescription}
              onChange={(e) => set('longDescription', e.target.value)}
              placeholder="The deeper pitch shown on the program landing page."
            />
          </div>
        </div>
      </Section>

      {/* ── Pricing ──────────────────────────────────────────────────── */}
      <Section id="pricing" title="Pricing">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Price (INR)</label>
            <Input
              type="number"
              value={form.priceInr}
              onChange={(e) => set('priceInr', e.target.value)}
              placeholder="9999"
            />
          </div>
          <div>
            <label className={labelCls}>Early-bird price (INR)</label>
            <Input
              type="number"
              value={form.earlyBirdPriceInr}
              onChange={(e) => set('earlyBirdPriceInr', e.target.value)}
              placeholder="7499"
            />
          </div>
          <div>
            <label className={labelCls}>Early-bird until</label>
            <Input
              type="datetime-local"
              value={form.earlyBirdUntil}
              onChange={(e) => set('earlyBirdUntil', e.target.value)}
            />
          </div>
        </div>
      </Section>

      {/* ── Schedule (workshop / cohort) ────────────────────────────── */}
      <Section id="schedule" title="Schedule & seats">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Starts at</label>
            <Input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => set('startsAt', e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Ends at</label>
            <Input
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => set('endsAt', e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Total seats (leave blank = unlimited)</label>
            <Input
              type="number"
              value={form.seatsTotal}
              onChange={(e) => set('seatsTotal', e.target.value)}
              placeholder="40"
            />
          </div>
        </div>
        <ListEditor
          label="Schedule"
          items={form.schedule}
          setItems={(s) => set('schedule', s)}
          empty={{ date: '', time: '', topic: '' }}
          render={(entry, update) => (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input
                type="date"
                value={entry.date || ''}
                onChange={(e) => update({ ...entry, date: e.target.value })}
              />
              <Input
                value={entry.time || ''}
                onChange={(e) => update({ ...entry, time: e.target.value })}
                placeholder="6:00 PM IST"
              />
              <Input
                value={entry.topic || ''}
                onChange={(e) => update({ ...entry, topic: e.target.value })}
                placeholder="Topic / session title"
              />
            </div>
          )}
        />
      </Section>

      {/* ── Marketing surface ───────────────────────────────────────── */}
      <Section id="marketing" title="Marketing content">
        <ListEditor
          label="Outcomes (what learners will be able to do)"
          items={form.outcomes}
          setItems={(o) => set('outcomes', o)}
          empty=""
          render={(s, update) => (
            <Input value={s} onChange={(e) => update(e.target.value)} placeholder="Build their first campaign…" />
          )}
        />
        <ListEditor
          label="Syllabus modules"
          items={form.syllabus}
          setItems={(s) => set('syllabus', s)}
          empty={{ title: '', items: [] }}
          render={(m, update) => (
            <div className="space-y-2">
              <Input
                value={m.title}
                onChange={(e) => update({ ...m, title: e.target.value })}
                placeholder="Module title (e.g. Week 1 — Strategy)"
              />
              <textarea
                className={inputCls}
                rows={2}
                value={(m.items || []).join('\n')}
                onChange={(e) =>
                  update({ ...m, items: e.target.value.split('\n').filter(Boolean) })
                }
                placeholder="One topic per line"
              />
            </div>
          )}
        />
        <ListEditor
          label="FAQ"
          items={form.faq}
          setItems={(f) => set('faq', f)}
          empty={{ q: '', a: '' }}
          render={(f, update) => (
            <div className="space-y-2">
              <Input
                value={f.q}
                onChange={(e) => update({ ...f, q: e.target.value })}
                placeholder="Question"
              />
              <textarea
                className={inputCls}
                rows={2}
                value={f.a}
                onChange={(e) => update({ ...f, a: e.target.value })}
                placeholder="Answer"
              />
            </div>
          )}
        />
        <ListEditor
          label="Testimonials"
          items={form.testimonials}
          setItems={(t) => set('testimonials', t)}
          empty={{ name: '', role: '', quote: '' }}
          render={(t, update) => (
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  value={t.name}
                  onChange={(e) => update({ ...t, name: e.target.value })}
                  placeholder="Name"
                />
                <Input
                  value={t.role || ''}
                  onChange={(e) => update({ ...t, role: e.target.value })}
                  placeholder="Role / company"
                />
              </div>
              <textarea
                className={inputCls}
                rows={2}
                value={t.quote}
                onChange={(e) => update({ ...t, quote: e.target.value })}
                placeholder="What they said"
              />
            </div>
          )}
        />
      </Section>

      {/* ── Delivery (revealed post-payment) ────────────────────────── */}
      <Section id="delivery" title="Delivery details (private)">
        <p className="text-xs text-fm-neutral-500">
          Shared with buyers in the confirmation email. Not shown on the public page.
        </p>
        <div>
          <label className={labelCls}>Zoom / meeting URL</label>
          <Input value={form.deliveryZoomUrl} onChange={(e) => set('deliveryZoomUrl', e.target.value)} placeholder="https://zoom.us/j/..." />
        </div>
        <div>
          <label className={labelCls}>WhatsApp group invite</label>
          <Input value={form.deliveryWhatsappUrl} onChange={(e) => set('deliveryWhatsappUrl', e.target.value)} placeholder="https://chat.whatsapp.com/..." />
        </div>
        <div>
          <label className={labelCls}>Notion / course page</label>
          <Input value={form.deliveryNotionUrl} onChange={(e) => set('deliveryNotionUrl', e.target.value)} placeholder="https://notion.so/..." />
        </div>
      </Section>

      {/* ── Instructor ──────────────────────────────────────────────── */}
      <Section id="instructor" title="Instructor">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Name</label>
            <Input value={form.instructorName} onChange={(e) => set('instructorName', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Photo URL</label>
            <Input value={form.instructorImageUrl} onChange={(e) => set('instructorImageUrl', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Bio</label>
            <textarea
              className={inputCls}
              rows={3}
              value={form.instructorBio}
              onChange={(e) => set('instructorBio', e.target.value)}
            />
          </div>
        </div>
      </Section>

      {/* ── Payment ─────────────────────────────────────────────────── */}
      <Section id="payment" title="Payment">
        <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-900">
            Create a Razorpay <strong>Payment Link</strong> in your dashboard for
            this program, then paste the URL here. The public &quot;Reserve seat&quot;
            CTA will open it; you&apos;ll mark the enrollment as paid in
            /admin/academy/enrollments once Razorpay shows the payment received.
          </p>
        </div>
        <div>
          <label className={labelCls}>Razorpay payment link</label>
          <Input
            value={form.paymentLinkUrl}
            onChange={(e) => set('paymentLinkUrl', e.target.value)}
            placeholder="https://rzp.io/l/..."
          />
        </div>
      </Section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Tiny add/remove list editor used for every dynamic-array field above.
// Generic over T so each section can pass its own render fn.
// ─────────────────────────────────────────────────────────────────────────

interface ListEditorProps<T> {
  label: string;
  items: T[];
  setItems: (items: T[]) => void;
  empty: T;
  render: (item: T, update: (next: T) => void) => React.ReactNode;
}

function ListEditor<T>({ label, items, setItems, empty, render }: ListEditorProps<T>) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium text-fm-neutral-600">{label}</label>
        <Button variant="ghost" size="sm" onClick={() => setItems([...items, structuredClone(empty)])}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-fm-neutral-400 italic">None yet — click Add to start.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2 bg-fm-neutral-50 border border-fm-neutral-200 rounded-md p-3">
              <div className="flex-1 min-w-0">
                {render(item, (next) => {
                  const copy = [...items];
                  copy[idx] = next;
                  setItems(copy);
                })}
              </div>
              <button
                type="button"
                onClick={() => setItems(items.filter((_, i) => i !== idx))}
                className="p-1.5 rounded text-fm-neutral-400 hover:text-red-500 hover:bg-red-50 shrink-0"
                title="Remove"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
