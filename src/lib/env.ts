/**
 * Environment Variable Validation
 * Validates required environment variables at import time.
 * Fails fast with clear error messages instead of cryptic runtime crashes.
 */

import { z } from 'zod';

const envSchema = z.object({
  // Supabase (required for all data operations)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // Admin authentication
  ADMIN_PASSWORD: z.string().min(8, 'ADMIN_PASSWORD must be at least 8 characters'),

  // Site URL
  NEXT_PUBLIC_SITE_URL: z.string().optional(),

  // Google Tag Manager container (GTM-XXXXXXX). Unset = no analytics loads.
  NEXT_PUBLIC_GTM_ID: z.string().regex(/^GTM-[A-Z0-9]{4,12}$/).optional(),

  // Company info (moved from source code)
  COMPANY_PAN: z.string().optional(),
  COMPANY_MSME: z.string().optional(),
  COMPANY_ADDRESS: z.string().optional(),

  // Resend (Email notifications — optional so builds don't break)
  RESEND_API_KEY: z.string().min(1).optional(),
  NOTIFICATION_EMAIL: z.string().email().optional(),

  // Meta Graph API (social media publishing — optional)
  META_TOKEN_SECRET: z.string().min(32).optional(),

  // Inngest (durable job queue — optional for development)
  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),

  // Sales automation (optional — each integration stays off until configured)
  SALES_LINK_SECRET: z.string().min(16).optional(),
  SALES_REPLY_TO: z.string().email().optional(),
  SALES_FROM_EMAIL: z.string().optional(),
  RESEND_WEBHOOK_SECRET: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_LEADS_VERIFY_TOKEN: z.string().optional(),
  GOOGLE_ADS_LEAD_KEY: z.string().optional(),
  CALCOM_WEBHOOK_SECRET: z.string().optional(),
  LEAD_CONNECTOR_SECRET: z.string().optional(),
  WHATSAPP_APP_SECRET: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_WABA_ID: z.string().optional(),

  // n8n webhook URLs (AI content generation — optional)
  N8N_WEBHOOK_MONTHLY_CONTENT: z.string().url().optional(),
  N8N_WEBHOOK_HOLIDAY_CONTENT: z.string().url().optional(),

  // Google Sheets (legacy — optional)
  GOOGLE_SHEETS_PRIVATE_KEY: z.string().optional(),
  GOOGLE_SHEETS_CLIENT_EMAIL: z.string().optional(),
  GOOGLE_SHEETS_SPREADSHEET_ID: z.string().optional(),

  // Google Drive (document storage — optional)
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().email().optional(),
  GOOGLE_SERVICE_ACCOUNT_KEY: z.string().optional(),
  GOOGLE_SERVICE_ACCOUNT_KEY_BASE64: z.string().optional(),
  GOOGLE_DRIVE_ROOT_FOLDER_ID: z.string().optional(),
  GOOGLE_DRIVE_IMPERSONATE_EMAIL: z.string().email().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues.map(
      (issue) => `  - ${issue.path.join('.')}: ${issue.message}`
    );

    console.error(
      '\n❌ Environment variable validation failed:\n' +
      errors.join('\n') +
      '\n\nPlease check your .env.local file.\n'
    );

    // In development, throw to make the error obvious
    // In production builds, some vars may be set at deploy time
    if (process.env.NODE_ENV === 'development') {
      throw new Error(`Missing or invalid environment variables:\n${errors.join('\n')}`);
    }
  }

  return result.success ? result.data : (process.env as unknown as Env);
}

export const env = validateEnv();
