-- ==========================================================================
-- FreakingMinds — Supabase schema snapshot
-- Generated 2026-08-10 from the live PostgREST OpenAPI spec.
--
-- WHY: 44 relations existed in production while only 3 migration files were
-- tracked in this repo. Everything else had been applied by hand in the
-- Supabase SQL editor and existed nowhere in version control. This file
-- closes that gap enough to answer "what does the schema look like?" from
-- the repo alone.
--
-- SCOPE — READ THIS BEFORE RELYING ON IT:
--   Captured:     table names, columns, Postgres types, NOT NULL, primary
--                 keys, and foreign keys.
--   NOT captured: DEFAULT values, CHECK constraints, UNIQUE indexes, other
--                 indexes, RLS policies, triggers, functions, sequences,
--                 and view SELECT bodies.
--
-- DO NOT run this file against an empty database and expect a working
-- system. It is a DOCUMENTATION and DISASTER-RECOVERY STARTING POINT, not
-- a substitute for `pg_dump --schema-only`. When you have the Postgres
-- connection string, run:
--
--   pg_dump --schema-only --no-owner --no-privileges "$DATABASE_URL" \
--     > migrations/2026-08-10-schema-full.sql
--
-- and commit that instead.
--
-- Tables: 42   Views: 2
-- ==========================================================================

-- ----------------------------------------------------------------------
-- admin_audit_log
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id                           text NOT NULL,
  user_id                      text,
  user_name                    text,
  action                       text NOT NULL,
  resource_type                text NOT NULL,
  resource_id                  text,
  details                      jsonb,
  ip_address                   text,
  created_at                   timestamp with time zone NOT NULL,
  PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------
-- admin_settings
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id                           text NOT NULL,
  profile                      jsonb NOT NULL,
  general                      jsonb NOT NULL,
  notifications                jsonb NOT NULL,
  security                     jsonb NOT NULL,
  privacy                      jsonb NOT NULL,
  appearance                   jsonb NOT NULL,
  integrations                 jsonb NOT NULL,
  updated_at                   timestamp with time zone,
  PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------
-- api_keys
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.api_keys (
  id                           uuid NOT NULL,
  name                         text NOT NULL,
  key_hash                     text NOT NULL,
  key_prefix                   text NOT NULL,
  permissions                  text[] NOT NULL,
  rate_limit                   integer NOT NULL,
  created_by                   text NOT NULL,
  last_used_at                 timestamp with time zone,
  expires_at                   timestamp with time zone,
  is_active                    boolean NOT NULL,
  created_at                   timestamp with time zone,
  updated_at                   timestamp with time zone,
  PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------
-- authorized_users
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.authorized_users (
  id                           text NOT NULL,
  mobile_number                text NOT NULL,
  name                         text NOT NULL,
  email                        text NOT NULL,
  role                         text NOT NULL,
  permissions                  text,
  status                       text,
  created_by                   text,
  last_login                   timestamp with time zone,
  notes                        text,
  created_at                   timestamp with time zone,
  updated_at                   timestamp with time zone,
  team_member_id               text,
  PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------
-- blog_posts
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id                           text NOT NULL,
  slug                         text NOT NULL,
  title                        text NOT NULL,
  excerpt                      text,
  cover_image_url              text,
  cover_image_alt              text,
  body_html                    text,
  body_tiptap                  jsonb,
  word_count                   integer NOT NULL,
  read_minutes                 integer NOT NULL,
  tags                         jsonb,
  category                     text,
  author_name                  text,
  author_id                    text,
  author_avatar_url            text,
  seo_title                    text,
  seo_description              text,
  canonical_url                text,
  og_image_url                 text,
  status                       text NOT NULL,
  featured                     boolean NOT NULL,
  published_at                 timestamp with time zone,
  scheduled_for                timestamp with time zone,
  source                       text NOT NULL,
  ai_assisted                  boolean NOT NULL,
  source_filename              text,
  created_at                   timestamp with time zone NOT NULL,
  updated_at                   timestamp with time zone NOT NULL,
  PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------
-- campaigns
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaigns (
  id                           text NOT NULL,
  client_id                    text,
  name                         text NOT NULL,
  type                         text,
  status                       text,
  budget                       numeric,
  spent                        numeric,
  start_date                   date,
  end_date                     date,
  description                  text,
  created_at                   timestamp with time zone,
  updated_at                   timestamp with time zone,
  PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------
-- client_credentials
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_credentials (
  id                           uuid NOT NULL,
  client_id                    text NOT NULL,
  platform                     text NOT NULL,
  credential_type              text NOT NULL,
  label                        text,
  credentials                  text NOT NULL,
  status                       text NOT NULL,
  notes                        text,
  added_by                     text NOT NULL,
  created_at                   timestamp with time zone NOT NULL,
  updated_at                   timestamp with time zone NOT NULL,
  PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------
-- client_documents
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_documents (
  id                           uuid NOT NULL,
  client_id                    text NOT NULL,
  name                         text NOT NULL,
  description                  text,
  file_url                     text NOT NULL,
  file_type                    text NOT NULL,
  file_size                    bigint,
  category                     text NOT NULL,
  uploaded_by                  text NOT NULL,
  created_at                   timestamp with time zone,
  updated_at                   timestamp with time zone,
  drive_file_id                text,
  drive_web_view_link          text,
  is_public                    boolean NOT NULL,
  client_visible               boolean NOT NULL,
  version                      integer NOT NULL,
  uploaded_by_name             text,
  project_id                   text,
  PRIMARY KEY (id)
);
--   FK: client_id -> clients.id
--   FK: project_id -> projects.id

-- ----------------------------------------------------------------------
-- client_messages
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_messages (
  id                           uuid NOT NULL,
  client_id                    text NOT NULL,
  sender_type                  text NOT NULL,
  sender_name                  text NOT NULL,
  subject                      text,
  message                      text NOT NULL,
  is_read                      boolean,
  read_at                      timestamp with time zone,
  created_at                   timestamp with time zone,
  PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------
-- client_sessions
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_sessions (
  id                           uuid NOT NULL,
  client_id                    text NOT NULL,
  email                        text NOT NULL,
  client_name                  text NOT NULL,
  expires_at                   timestamp with time zone NOT NULL,
  created_at                   timestamp with time zone,
  PRIMARY KEY (id)
);
--   FK: client_id -> clients.id

-- ----------------------------------------------------------------------
-- clients
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clients (
  id                           text NOT NULL,
  name                         text NOT NULL,
  email                        text NOT NULL,
  phone                        text,
  address                      text,
  city                         text,
  state                        text,
  zip_code                     text,
  country                      text,
  gst_number                   text,
  industry                     text,
  company_size                 text,
  website                      text,
  logo                         text,
  description                  text,
  status                       text,
  health                       text,
  account_manager              text,
  contract_type                text,
  contract_value               numeric,
  contract_start_date          date,
  contract_end_date            date,
  billing_cycle                text,
  services                     text[],
  tags                         text[],
  portal_password              text,
  total_value                  numeric,
  notes                        text,
  created_at                   timestamp with time zone,
  updated_at                   timestamp with time zone,
  onboarded_at                 timestamp with time zone,
  last_activity                timestamp with time zone,
  slug                         text NOT NULL,
  currency                     text NOT NULL,
  brand_name                   text,
  parent_client_id             text,
  is_brand_group               boolean,
  logo_url                     text,
  brand_colors                 text[],
  brand_fonts                  text[],
  tagline                      text,
  brand_voice                  jsonb,
  hashtag_sets                 jsonb,
  brand_guidelines_url         text,
  competitor_brands            text[],
  target_platforms             text[],
  drive_folder_id              text,
  storage_limit_mb             integer NOT NULL,
  content_events               jsonb,
  content_preferences          jsonb,
  competitor_social_urls       jsonb,
  content_pillars              jsonb,
  auto_invoice                 boolean,
  auto_invoice_day             integer,
  auto_invoice_send            boolean,
  auto_invoice_template        jsonb,
  auto_invoice_currency        character varying,
  auto_invoice_tax_rate        numeric,
  auto_invoice_notes           text,
  auto_invoice_terms           text,
  PRIMARY KEY (id)
);
--   FK: parent_client_id -> clients.id

-- ----------------------------------------------------------------------
-- content_calendar
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.content_calendar (
  id                           text NOT NULL,
  project_id                   text,
  client_id                    text NOT NULL,
  title                        text NOT NULL,
  description                  text,
  content                      text,
  type                         text,
  platform                     text,
  scheduled_date               date,
  published_date               timestamp with time zone,
  status                       text,
  approved_at                  timestamp with time zone,
  assigned_designer            text,
  assigned_writer              text,
  image_url                    text,
  video_url                    text,
  client_feedback              text,
  revision_notes               text,
  engagement                   jsonb,
  hashtags                     text[],
  mentions                     text[],
  tags                         text[],
  created_at                   timestamp with time zone,
  updated_at                   timestamp with time zone,
  files                        text[],
  author                       text,
  meta_post_id                 text,
  last_publish_error           text,
  ai_generated                 boolean,
  ai_generation_batch_id       text,
  generation_source            text,
  content_pillar               text,
  generation_metadata          jsonb,
  PRIMARY KEY (id)
);
--   FK: project_id -> projects.id
--   FK: client_id -> clients.id

-- ----------------------------------------------------------------------
-- contracts
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contracts (
  id                           text NOT NULL,
  client_id                    text NOT NULL,
  title                        text NOT NULL,
  contract_number              text,
  status                       text NOT NULL,
  services                     jsonb NOT NULL,
  total_value                  numeric NOT NULL,
  currency                     text NOT NULL,
  start_date                   date,
  end_date                     date,
  payment_terms                text,
  billing_cycle                text,
  terms_and_conditions         text,
  client_feedback              text,
  revision_notes               text,
  sent_at                      timestamp with time zone,
  accepted_at                  timestamp with time zone,
  rejected_at                  timestamp with time zone,
  created_at                   timestamp with time zone NOT NULL,
  updated_at                   timestamp with time zone NOT NULL,
  PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------
-- discovery_sessions
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.discovery_sessions (
  id                           text NOT NULL,
  client_id                    text,
  lead_id                      text,
  status                       text,
  current_section              integer,
  completed_sections           jsonb,
  assigned_to                  text,
  completed_at                 timestamp with time zone,
  company_fundamentals         jsonb,
  project_overview             jsonb,
  target_audience              jsonb,
  current_state                jsonb,
  goals_kpis                   jsonb,
  competition_market           jsonb,
  budget_resources             jsonb,
  technical_requirements       jsonb,
  content_creative             jsonb,
  next_steps                   jsonb,
  created_at                   timestamp with time zone,
  updated_at                   timestamp with time zone,
  PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------
-- enrollments
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.enrollments (
  id                           text NOT NULL,
  program_id                   text NOT NULL,
  buyer_name                   text NOT NULL,
  buyer_email                  text NOT NULL,
  buyer_phone                  text,
  buyer_company                text,
  buyer_message                text,
  amount_inr                   numeric NOT NULL,
  currency                     text NOT NULL,
  razorpay_payment_id          text,
  razorpay_order_id            text,
  status                       text NOT NULL,
  payment_link_shared_at       timestamp with time zone,
  paid_at                      timestamp with time zone,
  invite_sent_at               timestamp with time zone,
  completed_at                 timestamp with time zone,
  notes                        text,
  created_at                   timestamp with time zone NOT NULL,
  updated_at                   timestamp with time zone NOT NULL,
  PRIMARY KEY (id)
);
--   FK: program_id -> programs.id

-- ----------------------------------------------------------------------
-- invoice_sequences
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoice_sequences (
  id                           text NOT NULL,
  prefix                       text,
  current_counter              integer,
  current_year                 integer,
  updated_at                   timestamp with time zone,
  PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------
-- invoices
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
  id                           text NOT NULL,
  invoice_number               text NOT NULL,
  client_id                    text NOT NULL,
  client_name                  text NOT NULL,
  date                         date NOT NULL,
  due_date                     date NOT NULL,
  subtotal                     numeric,
  tax                          numeric,
  total                        numeric,
  status                       text,
  line_items                   jsonb,
  notes                        text,
  created_at                   timestamp with time zone,
  updated_at                   timestamp with time zone,
  client_email                 text,
  client_phone                 text,
  client_address               text,
  client_city                  text,
  client_state                 text,
  client_country               text,
  client_gst_number            text,
  tax_rate                     numeric,
  tax_amount                   numeric,
  terms                        text,
  currency                     text,
  cgst_amount                  numeric,
  sgst_amount                  numeric,
  igst_amount                  numeric,
  place_of_supply              text,
  company_gstin                text,
  auto_generated               boolean,
  PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------
-- leads
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leads (
  id                           text NOT NULL,
  name                         text NOT NULL,
  email                        text NOT NULL,
  phone                        text,
  company                      text NOT NULL,
  website                      text,
  job_title                    text,
  company_size                 text,
  industry                     text,
  project_type                 text,
  project_description          text NOT NULL,
  budget_range                 text,
  timeline                     text,
  primary_challenge            text NOT NULL,
  additional_challenges        jsonb,
  specific_requirements        text,
  status                       text,
  priority                     text,
  source                       text,
  lead_score                   integer,
  assigned_to                  text,
  next_action                  text,
  follow_up_date               timestamp with time zone,
  last_contact_date            timestamp with time zone,
  notes                        text,
  tags                         jsonb,
  custom_fields                jsonb,
  discovery_scheduled          boolean,
  discovery_completed_at       timestamp with time zone,
  proposal_sent_at             timestamp with time zone,
  converted_to_client_at       timestamp with time zone,
  client_id                    text,
  created_at                   timestamp with time zone,
  updated_at                   timestamp with time zone,
  PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------
-- notifications
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id                           text NOT NULL,
  recipient_type               text NOT NULL,
  recipient_id                 text,
  client_id                    text,
  type                         text NOT NULL,
  title                        text NOT NULL,
  message                      text NOT NULL,
  is_read                      boolean NOT NULL,
  priority                     text NOT NULL,
  action_url                   text,
  metadata                     jsonb,
  created_at                   timestamp with time zone NOT NULL,
  read_at                      timestamp with time zone,
  talent_id                    text,
  PRIMARY KEY (id)
);
--   FK: client_id -> clients.id

-- ----------------------------------------------------------------------
-- outgoing_webhook_deliveries
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.outgoing_webhook_deliveries (
  id                           uuid NOT NULL,
  webhook_id                   uuid,
  event_type                   text NOT NULL,
  payload                      jsonb NOT NULL,
  response_status              integer,
  response_body                text,
  attempt                      integer,
  delivered_at                 timestamp with time zone,
  error                        text,
  created_at                   timestamp with time zone,
  PRIMARY KEY (id)
);
--   FK: webhook_id -> outgoing_webhooks.id

-- ----------------------------------------------------------------------
-- outgoing_webhooks
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.outgoing_webhooks (
  id                           uuid NOT NULL,
  name                         text NOT NULL,
  url                          text NOT NULL,
  events                       text[] NOT NULL,
  secret                       text,
  is_active                    boolean,
  created_by                   text NOT NULL,
  created_at                   timestamp with time zone,
  updated_at                   timestamp with time zone,
  PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------
-- payment_events
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_events (
  id                           text NOT NULL,
  source                       text NOT NULL,
  event_type                   text NOT NULL,
  enrollment_id                text,
  razorpay_order_id            text,
  razorpay_payment_id          text,
  payload                      jsonb NOT NULL,
  processed_at                 timestamp with time zone NOT NULL,
  PRIMARY KEY (id)
);
--   FK: enrollment_id -> enrollments.id

-- ----------------------------------------------------------------------
-- programs
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.programs (
  id                           text NOT NULL,
  slug                         text NOT NULL,
  title                        text NOT NULL,
  format                       text NOT NULL,
  status                       text NOT NULL,
  short_description            text,
  long_description             text,
  cover_image_url              text,
  price_inr                    numeric NOT NULL,
  early_bird_price_inr         numeric,
  early_bird_until             timestamp with time zone,
  currency                     text NOT NULL,
  starts_at                    timestamp with time zone,
  ends_at                      timestamp with time zone,
  schedule                     jsonb,
  seats_total                  integer,
  seats_taken                  integer NOT NULL,
  outcomes                     jsonb,
  syllabus                     jsonb,
  faq                          jsonb,
  testimonials                 jsonb,
  delivery_zoom_url            text,
  delivery_whatsapp_url        text,
  delivery_notion_url          text,
  instructor_name              text,
  instructor_bio               text,
  instructor_image_url         text,
  payment_link_url             text,
  created_by                   text,
  created_at                   timestamp with time zone NOT NULL,
  updated_at                   timestamp with time zone NOT NULL,
  PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------
-- projects
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
  id                           text NOT NULL,
  client_id                    text NOT NULL,
  name                         text NOT NULL,
  description                  text,
  type                         text,
  status                       text,
  priority                     text,
  start_date                   date,
  end_date                     date,
  estimated_hours              numeric,
  actual_hours                 numeric,
  budget                       numeric,
  hourly_rate                  numeric,
  project_manager              text,
  assigned_talent              text[],
  progress                     integer,
  client_satisfaction          integer,
  content_requirements         jsonb,
  milestones                   jsonb,
  deliverables                 jsonb,
  tags                         text[],
  notes                        text,
  created_at                   timestamp with time zone,
  updated_at                   timestamp with time zone,
  discovery_id                 text,
  spent                        numeric,
  invoice_ids                  text[],
  PRIMARY KEY (id)
);
--   FK: client_id -> clients.id

-- ----------------------------------------------------------------------
-- proposal_sequences
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.proposal_sequences (
  id                           text NOT NULL,
  prefix                       text NOT NULL,
  current_counter              integer NOT NULL,
  current_year                 integer NOT NULL,
  updated_at                   timestamp with time zone,
  PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------
-- proposals
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.proposals (
  id                           text NOT NULL,
  proposal_number              text NOT NULL,
  title                        text NOT NULL,
  client_is_existing           boolean NOT NULL,
  client_id                    text,
  prospect_info                jsonb,
  service_packages             jsonb NOT NULL,
  custom_services              jsonb,
  timeline                     jsonb NOT NULL,
  investment                   jsonb NOT NULL,
  proposal_type                text NOT NULL,
  valid_until                  date NOT NULL,
  status                       text NOT NULL,
  executive_summary            text,
  problem_statement            text,
  proposed_solution            text,
  why_freaking_minds           text,
  next_steps                   text,
  terms_and_conditions         text,
  template                     text NOT NULL,
  brand_colors                 jsonb,
  include_case_studies         boolean,
  include_testimonials         boolean,
  created_by                   text NOT NULL,
  sent_at                      timestamp with time zone,
  viewed_at                    timestamp with time zone,
  approved_at                  timestamp with time zone,
  created_at                   timestamp with time zone,
  updated_at                   timestamp with time zone,
  client_feedback              text,
  declined_at                  timestamp with time zone,
  PRIMARY KEY (id)
);
--   FK: client_id -> clients.id

-- ----------------------------------------------------------------------
-- scrape_job_runs
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scrape_job_runs (
  id                           text NOT NULL,
  job_id                       text NOT NULL,
  status                       text NOT NULL,
  run_params                   jsonb NOT NULL,
  contacts_found               integer NOT NULL,
  contacts_imported            integer NOT NULL,
  contacts_skipped             integer NOT NULL,
  error_message                text,
  triggered_by                 text NOT NULL,
  started_at                   timestamp with time zone,
  completed_at                 timestamp with time zone,
  duration_seconds             integer,
  created_at                   timestamp with time zone NOT NULL,
  PRIMARY KEY (id)
);
--   FK: job_id -> scrape_jobs.id

-- ----------------------------------------------------------------------
-- scrape_jobs
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scrape_jobs (
  id                           text NOT NULL,
  name                         text NOT NULL,
  source_platform              text NOT NULL,
  params                       jsonb NOT NULL,
  schedule_type                text NOT NULL,
  is_active                    boolean NOT NULL,
  rotation_group_id            text,
  created_by                   text,
  last_run_at                  timestamp with time zone,
  next_run_at                  timestamp with time zone,
  created_at                   timestamp with time zone NOT NULL,
  updated_at                   timestamp with time zone NOT NULL,
  PRIMARY KEY (id)
);
--   FK: rotation_group_id -> scrape_rotation_config.id

-- ----------------------------------------------------------------------
-- scrape_rotation_config
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scrape_rotation_config (
  id                           text NOT NULL,
  name                         text NOT NULL,
  source_platform              text NOT NULL,
  countries                    jsonb NOT NULL,
  industries                   jsonb NOT NULL,
  current_country_index        integer NOT NULL,
  current_industry_index       integer NOT NULL,
  runs_per_day                 integer NOT NULL,
  is_active                    boolean NOT NULL,
  created_at                   timestamp with time zone NOT NULL,
  updated_at                   timestamp with time zone NOT NULL,
  PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------
-- scrape_source_config
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scrape_source_config (
  id                           text NOT NULL,
  source_platform              text NOT NULL,
  config                       jsonb NOT NULL,
  is_valid                     boolean NOT NULL,
  last_validated_at            timestamp with time zone,
  validation_error             text,
  created_at                   timestamp with time zone NOT NULL,
  updated_at                   timestamp with time zone NOT NULL,
  PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------
-- scraped_contacts
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scraped_contacts (
  id                           text NOT NULL,
  first_name                   text NOT NULL,
  last_name                    text NOT NULL,
  email                        text,
  phone                        text,
  mobile                       text,
  company_name                 text,
  category                     text,
  speciality                   text,
  website                      text,
  city                         text,
  state                        text,
  country                      text,
  address_full                 text,
  business_description         text,
  keywords                     text,
  social_links                 text,
  profile_url                  text,
  source_platform              text NOT NULL,
  source_file                  text,
  chapter_name                 text,
  membership_status            text,
  external_id                  text,
  status                       text NOT NULL,
  notes                        text,
  tags                         jsonb,
  linked_lead_id               text,
  created_at                   timestamp with time zone,
  updated_at                   timestamp with time zone,
  project_tag                  text,
  assigned_to                  text,
  PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------
-- share_links
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.share_links (
  id                           uuid NOT NULL,
  client_id                    text NOT NULL,
  token                        text NOT NULL,
  resource_type                text NOT NULL,
  resource_id                  text NOT NULL,
  label                        text,
  expires_at                   timestamp with time zone,
  created_at                   timestamp with time zone,
  PRIMARY KEY (id)
);
--   FK: client_id -> clients.id

-- ----------------------------------------------------------------------
-- social_accounts
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.social_accounts (
  id                           uuid NOT NULL,
  client_id                    text NOT NULL,
  platform                     text NOT NULL,
  page_id                      text NOT NULL,
  page_name                    text NOT NULL,
  instagram_account_id         text,
  access_token                 text NOT NULL,
  is_active                    boolean,
  connected_at                 timestamp with time zone,
  connected_by                 text,
  last_used_at                 timestamp with time zone,
  PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------
-- support_tickets
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id                           uuid NOT NULL,
  client_id                    text NOT NULL,
  title                        text NOT NULL,
  description                  text NOT NULL,
  status                       text NOT NULL,
  priority                     text NOT NULL,
  category                     text NOT NULL,
  assigned_to                  text,
  created_at                   timestamp with time zone,
  updated_at                   timestamp with time zone,
  PRIMARY KEY (id)
);
--   FK: client_id -> clients.id

-- ----------------------------------------------------------------------
-- talent_applications
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.talent_applications (
  id                           text NOT NULL,
  application_date             timestamp with time zone,
  status                       text,
  review_notes                 text,
  reviewed_by                  text,
  reviewed_at                  timestamp with time zone,
  personal_info                jsonb NOT NULL,
  professional_details         jsonb NOT NULL,
  portfolio_links              jsonb,
  social_media                 jsonb,
  availability                 jsonb,
  preferences                  jsonb,
  pricing                      jsonb,
  created_at                   timestamp with time zone,
  updated_at                   timestamp with time zone,
  PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------
-- talent_assignments
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.talent_assignments (
  id                           uuid NOT NULL,
  talent_id                    text NOT NULL,
  client_id                    text NOT NULL,
  project_id                   text,
  role                         text NOT NULL,
  status                       text NOT NULL,
  hours_allocated              numeric,
  start_date                   date,
  end_date                     date,
  notes                        text,
  created_at                   timestamp with time zone,
  updated_at                   timestamp with time zone,
  PRIMARY KEY (id)
);
--   FK: talent_id -> talent_profiles.id
--   FK: client_id -> clients.id
--   FK: project_id -> projects.id

-- ----------------------------------------------------------------------
-- talent_profiles
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.talent_profiles (
  id                           text NOT NULL,
  application_id               text,
  personal_info                jsonb NOT NULL,
  professional_details         jsonb NOT NULL,
  portfolio_links              jsonb,
  social_media                 jsonb,
  availability                 jsonb,
  preferences                  jsonb,
  pricing                      jsonb,
  ratings                      jsonb,
  status                       text,
  created_at                   timestamp with time zone,
  updated_at                   timestamp with time zone,
  profile_slug                 text,
  email                        text,
  portal_password              text,
  portal_email                 text,
  PRIMARY KEY (id)
);
--   FK: application_id -> talent_applications.id

-- ----------------------------------------------------------------------
-- talent_sessions
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.talent_sessions (
  id                           uuid NOT NULL,
  talent_id                    text NOT NULL,
  email                        text NOT NULL,
  expires_at                   timestamp with time zone NOT NULL,
  created_at                   timestamp with time zone NOT NULL,
  PRIMARY KEY (id)
);
--   FK: talent_id -> talent_profiles.id

-- ----------------------------------------------------------------------
-- team_assignments
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.team_assignments (
  id                           text NOT NULL,
  team_member_id               text NOT NULL,
  client_id                    text NOT NULL,
  project_id                   text,
  role                         text NOT NULL,
  start_date                   date NOT NULL,
  end_date                     date,
  hours_allocated              integer NOT NULL,
  is_lead                      boolean NOT NULL,
  status                       text NOT NULL,
  created_at                   timestamp with time zone,
  updated_at                   timestamp with time zone,
  PRIMARY KEY (id)
);
--   FK: team_member_id -> team_members.id
--   FK: client_id -> clients.id
--   FK: project_id -> projects.id

-- ----------------------------------------------------------------------
-- team_members
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.team_members (
  id                           text NOT NULL,
  name                         text NOT NULL,
  email                        text NOT NULL,
  phone                        text,
  avatar_url                   text,
  type                         text NOT NULL,
  status                       text NOT NULL,
  start_date                   date NOT NULL,
  end_date                     date,
  role                         text NOT NULL,
  department                   text NOT NULL,
  seniority                    text NOT NULL,
  skills                       text[],
  certifications               jsonb,
  compensation                 jsonb NOT NULL,
  work_type                    text NOT NULL,
  location                     text NOT NULL,
  capacity_hours               integer NOT NULL,
  assigned_client_ids          text[],
  current_project_ids          text[],
  workload                     integer,
  client_ratings               numeric,
  tasks_completed              integer,
  efficiency                   integer,
  documents                    jsonb,
  notes                        text,
  emergency_contact            jsonb,
  created_at                   timestamp with time zone,
  updated_at                   timestamp with time zone,
  talent_profile_id            text,
  PRIMARY KEY (id)
);

-- ----------------------------------------------------------------------
-- ticket_replies
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ticket_replies (
  id                           uuid NOT NULL,
  ticket_id                    uuid NOT NULL,
  sender_type                  text NOT NULL,
  sender_name                  text NOT NULL,
  message                      text NOT NULL,
  created_at                   timestamp with time zone,
  PRIMARY KEY (id)
);
--   FK: ticket_id -> support_tickets.id

-- ----------------------------------------------------------------------
-- webhook_logs
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id                           uuid NOT NULL,
  provider                     text NOT NULL,
  event_type                   text,
  payload                      jsonb NOT NULL,
  headers                      jsonb,
  signature_valid              boolean,
  processed                    boolean,
  error                        text,
  created_at                   timestamp with time zone,
  PRIMARY KEY (id)
);

-- ==========================================================================
-- VIEWS
--
-- Shape only — the SELECT bodies are not recoverable from the OpenAPI
-- spec. Both are defined in the tracked migrations listed below; consult
-- those for the authoritative definition.
-- ==========================================================================
--
-- blog_posts_public  (defined in migrations/2026-06-02-blog-cms.sql)
--   id                           text
--   slug                         text
--   title                        text
--   excerpt                      text
--   cover_image_url              text
--   cover_image_alt              text
--   body_html                    text
--   word_count                   integer
--   read_minutes                 integer
--   tags                         jsonb
--   category                     text
--   author_name                  text
--   author_avatar_url            text
--   seo_title                    text
--   seo_description              text
--   canonical_url                text
--   og_image_url                 text
--   featured                     boolean
--   published_at                 timestamp with time zone
--   created_at                   timestamp with time zone
--   updated_at                   timestamp with time zone
--
-- programs_public  (defined in migrations/2026-06-01-fm-academy.sql)
--   id                           text
--   slug                         text
--   title                        text
--   format                       text
--   status                       text
--   short_description            text
--   long_description             text
--   cover_image_url              text
--   price_inr                    numeric
--   early_bird_price_inr         numeric
--   early_bird_until             timestamp with time zone
--   currency                     text
--   starts_at                    timestamp with time zone
--   ends_at                      timestamp with time zone
--   schedule                     jsonb
--   seats_total                  integer
--   seats_taken                  integer
--   outcomes                     jsonb
--   syllabus                     jsonb
--   faq                          jsonb
--   testimonials                 jsonb
--   instructor_name              text
--   instructor_bio               text
--   instructor_image_url         text
--   payment_link_url             text
--   created_at                   timestamp with time zone
--   updated_at                   timestamp with time zone

