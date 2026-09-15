/** Request bodies for the admin sales APIs. */

import { z } from 'zod';
import type { LeadStatus } from '@/lib/admin/lead-types';
import { isLeadStatus } from '@/lib/sales/types';

export const leadPatchSchema = z
  .object({
    status: z.custom<LeadStatus>((value) => isLeadStatus(value), 'Choose a valid stage').optional(),
    lostReason: z.string().trim().min(3, 'Give a short reason').max(500).optional(),
    ownerId: z.string().min(1).nullable().optional(),
    dealValue: z.number().nonnegative().max(1_000_000_000).nullable().optional(),
    currency: z.enum(['INR', 'USD', 'GBP', 'AED', 'EUR']).optional(),
  })
  .refine((body) => body.status !== 'lost' || Boolean(body.lostReason), {
    message: 'Give a reason when marking a lead lost',
    path: ['lostReason'],
  });

export const noteSchema = z.object({
  body: z.string().trim().min(1, 'Write a note first').max(5000, 'Keep notes under 5,000 characters'),
});

export const sequenceActionSchema = z.object({ action: z.literal('stop') });

export const taskPatchSchema = z.object({ status: z.enum(['done', 'skipped']) });

export const meetingPatchSchema = z.object({ status: z.enum(['completed', 'no_show']) });

export const salesSettingsSchema = z.object({
  automationEnabled: z.boolean().optional(),
  bookingLink: z
    .string()
    .trim()
    .regex(/^[\w-]+\/[\w-]+$/, 'Use the Cal.com team/event path, for example fm-in/15min')
    .optional(),
  rotation: z.array(z.string().min(1)).max(50).optional(),
});

/** First validation message, for a 400 response. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Invalid request';
}
