/**
 * FM Academy — shared types for the programs / enrollments domain.
 *
 * One unified `Program` shape covers workshops, multi-week cohorts,
 * self-paced courses and 1:1 strategy calls — distinguished by `format`.
 * That way adding a new format later is config, not a new table.
 */

export type ProgramFormat =
  | 'workshop'      // one-time, dated, limited seats
  | 'cohort'        // multi-week, dated, group, structured
  | 'self_paced'    // pre-recorded, watch anytime — Phase 2
  | 'one_on_one';   // strategy calls — Phase 2

export type ProgramStatus = 'draft' | 'open' | 'closed' | 'archived';

export type EnrollmentStatus =
  | 'reserved'   // form submitted, payment not yet received
  | 'paid'       // payment received (manually marked in Phase 1, webhook in Phase 2)
  | 'failed'     // payment attempt failed
  | 'refunded'
  | 'cancelled';

export interface ProgramScheduleEntry {
  date: string;       // ISO date or YYYY-MM-DD
  time?: string;      // e.g. '6:00 PM IST'
  topic?: string;
  durationMinutes?: number;
}

export interface SyllabusModule {
  title: string;
  items?: string[];
  durationLabel?: string; // e.g. 'Week 1' or '90 min'
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface Testimonial {
  name: string;
  role?: string;
  quote: string;
  imageUrl?: string;
}

/** Program as stored in the database (camelCase API response). */
export interface Program {
  id: string;
  slug: string;
  title: string;
  format: ProgramFormat;
  status: ProgramStatus;

  shortDescription?: string;
  longDescription?: string;
  coverImageUrl?: string;

  // Pricing
  priceInr: number;
  earlyBirdPriceInr?: number;
  earlyBirdUntil?: string;
  currency: string;

  // Scheduling
  startsAt?: string;
  endsAt?: string;
  schedule?: ProgramScheduleEntry[];
  seatsTotal?: number;
  seatsTaken: number;

  // Marketing
  outcomes?: string[];
  syllabus?: SyllabusModule[];
  faq?: FaqItem[];
  testimonials?: Testimonial[];

  // Delivery (admin/internal — revealed in confirmation email)
  deliveryZoomUrl?: string;
  deliveryWhatsappUrl?: string;
  deliveryNotionUrl?: string;

  // Instructor
  instructorName?: string;
  instructorBio?: string;
  instructorImageUrl?: string;

  // Payment
  paymentLinkUrl?: string;

  // Meta
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

/** Slimmed-down Program for the public listing — never includes delivery
 *  URLs or admin-only metadata. Mirrors the `programs_public` SQL view. */
export type PublicProgram = Omit<
  Program,
  'deliveryZoomUrl' | 'deliveryWhatsappUrl' | 'deliveryNotionUrl' | 'createdBy'
>;

export interface Enrollment {
  id: string;
  programId: string;

  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  buyerCompany?: string;
  buyerMessage?: string;

  amountInr: number;
  currency: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  status: EnrollmentStatus;
  paymentLinkSharedAt?: string;
  paidAt?: string;

  inviteSentAt?: string;
  completedAt?: string;

  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────────────────────────────────

export const FORMAT_LABELS: Record<ProgramFormat, string> = {
  workshop: 'Workshop',
  cohort: 'Cohort',
  self_paced: 'Self-paced Course',
  one_on_one: '1:1 Strategy Call',
};

export const STATUS_LABELS: Record<ProgramStatus, string> = {
  draft: 'Draft',
  open: 'Open for enrollment',
  closed: 'Closed',
  archived: 'Archived',
};

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  reserved: 'Reserved — payment pending',
  paid: 'Paid',
  failed: 'Payment failed',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
};

/** Display the price string, considering early-bird window. */
export function formatProgramPrice(p: Pick<Program,
  'priceInr' | 'earlyBirdPriceInr' | 'earlyBirdUntil' | 'currency'
>): { current: string; original?: string; earlyBirdActive: boolean } {
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: p.currency || 'INR',
      maximumFractionDigits: 0,
    }).format(n);

  const earlyBirdActive =
    !!p.earlyBirdPriceInr &&
    !!p.earlyBirdUntil &&
    new Date(p.earlyBirdUntil).getTime() > Date.now();

  if (earlyBirdActive && p.earlyBirdPriceInr) {
    return {
      current: fmt(p.earlyBirdPriceInr),
      original: fmt(p.priceInr),
      earlyBirdActive: true,
    };
  }
  return { current: fmt(p.priceInr), earlyBirdActive: false };
}

/** Generate a new program id. Same pattern as ProjectUtils. */
export function generateProgramId(): string {
  return `prog-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function generateEnrollmentId(): string {
  return `enr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** snake_case row → camelCase API shape. Used by both public and admin APIs. */
export function transformProgramRow(row: Record<string, unknown>): Program {
  return {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    format: row.format as ProgramFormat,
    status: row.status as ProgramStatus,
    shortDescription: (row.short_description as string) || undefined,
    longDescription: (row.long_description as string) || undefined,
    coverImageUrl: (row.cover_image_url as string) || undefined,
    priceInr: Number(row.price_inr) || 0,
    earlyBirdPriceInr: row.early_bird_price_inr != null
      ? Number(row.early_bird_price_inr)
      : undefined,
    earlyBirdUntil: (row.early_bird_until as string) || undefined,
    currency: (row.currency as string) || 'INR',
    startsAt: (row.starts_at as string) || undefined,
    endsAt: (row.ends_at as string) || undefined,
    schedule: (row.schedule as ProgramScheduleEntry[]) || undefined,
    seatsTotal: row.seats_total != null ? Number(row.seats_total) : undefined,
    seatsTaken: Number(row.seats_taken) || 0,
    outcomes: (row.outcomes as string[]) || undefined,
    syllabus: (row.syllabus as SyllabusModule[]) || undefined,
    faq: (row.faq as FaqItem[]) || undefined,
    testimonials: (row.testimonials as Testimonial[]) || undefined,
    deliveryZoomUrl: (row.delivery_zoom_url as string) || undefined,
    deliveryWhatsappUrl: (row.delivery_whatsapp_url as string) || undefined,
    deliveryNotionUrl: (row.delivery_notion_url as string) || undefined,
    instructorName: (row.instructor_name as string) || undefined,
    instructorBio: (row.instructor_bio as string) || undefined,
    instructorImageUrl: (row.instructor_image_url as string) || undefined,
    paymentLinkUrl: (row.payment_link_url as string) || undefined,
    createdBy: (row.created_by as string) || undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function transformEnrollmentRow(row: Record<string, unknown>): Enrollment {
  return {
    id: row.id as string,
    programId: row.program_id as string,
    buyerName: row.buyer_name as string,
    buyerEmail: row.buyer_email as string,
    buyerPhone: (row.buyer_phone as string) || undefined,
    buyerCompany: (row.buyer_company as string) || undefined,
    buyerMessage: (row.buyer_message as string) || undefined,
    amountInr: Number(row.amount_inr) || 0,
    currency: (row.currency as string) || 'INR',
    razorpayPaymentId: (row.razorpay_payment_id as string) || undefined,
    razorpayOrderId: (row.razorpay_order_id as string) || undefined,
    status: row.status as EnrollmentStatus,
    paymentLinkSharedAt: (row.payment_link_shared_at as string) || undefined,
    paidAt: (row.paid_at as string) || undefined,
    inviteSentAt: (row.invite_sent_at as string) || undefined,
    completedAt: (row.completed_at as string) || undefined,
    notes: (row.notes as string) || undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
