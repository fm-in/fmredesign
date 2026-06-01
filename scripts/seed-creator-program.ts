/**
 * Seed FM Academy — Creator Program lineup.
 *
 * 6 individual in-person courses + 1 bundle program covering all six.
 * Each is a cohort starting 5 June 2026, 45 days, taught by the Freaking
 * Minds team at the Bhopal studio.
 *
 * Pricing:
 *   - Each course   : ₹29,999 regular / ₹24,999 early-bird (until 4 Jun)
 *   - Full bundle   : ₹149,999 regular / ₹129,999 early-bird
 *
 * Re-runnable — UPSERT on slug. Safe to re-run after edits.
 *
 *   npx tsx scripts/seed-creator-program.ts
 *
 * Deletes the old single 'prog-creator-2026-06' if present so the listing
 * shows the new lineup cleanly.
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });
config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Shared metadata ──────────────────────────────────────────────────────
const STARTS_AT = new Date('2026-06-05T15:30:00+05:30').toISOString();   // 9:00 PM IST kick-off
const ENDS_AT = new Date('2026-07-20T15:30:00+05:30').toISOString();
const EARLY_BIRD_UNTIL = new Date('2026-06-04T18:30:00+05:30').toISOString();
const SEATS_PER_COURSE = 25;
const SEATS_BUNDLE = 15;

const INSTRUCTOR_NAME = 'The Freaking Minds Team';
const INSTRUCTOR_BIO =
  "Led by the founders and senior creators at Freaking Minds — an agency working on real brand campaigns, design, video and digital marketing every single day. You'll learn from people doing this for clients right now, not lecturers reading from slides.";

const COMMON_FAQ = [
  { q: 'Do I need any prior experience?', a: 'No prior experience is required. You just need curiosity, consistency, and willingness to learn. Beginners are welcome.' },
  { q: 'Is this online or in-person?', a: 'This is an in-person program held at the Freaking Minds studio in Bhopal. You learn alongside a small batch in an actual agency environment.' },
  { q: 'How long is the program?', a: '45 days. Structured for fast, hands-on learning with practical assignments throughout.' },
  { q: 'Will I get a certificate?', a: 'Yes — every participant who completes the program receives a Freaking Minds Creator Program certificate.' },
  { q: 'What is the refund policy?', a: 'Full refund within the first 3 days of the program if it is not the right fit. Reach out to freakingmindsdigital@gmail.com.' },
];

const BUNDLE_FAQ = [
  ...COMMON_FAQ,
  { q: 'How is the bundle different from individual courses?', a: 'The bundle gets you all six modules taught back-to-back over the same 45-day batch. You save ₹30,000 vs buying them individually, get a single integrated certificate, and benefit from cross-module projects that combine skills.' },
  { q: 'Can I switch between courses later?', a: 'Yes — once enrolled in the bundle you have access to every module. If you start in a single course and later upgrade to the bundle, we credit your paid amount against the bundle price.' },
];

// ─── Programs ────────────────────────────────────────────────────────────
interface CourseSeed {
  slug: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  outcomes: string[];
  syllabus: { title: string; durationLabel?: string; items: string[] }[];
}

const COURSES: CourseSeed[] = [
  {
    slug: 'digital-marketing',
    title: 'Digital Marketing',
    shortDescription:
      'Learn how brands grow online — strategy, social, SEO, content planning, analytics and digital growth — taught from an agency floor in Bhopal.',
    longDescription:
      `Learn how brands grow online through social media, content strategy, SEO basics, campaign planning, online presence building, analytics, and digital growth strategies.

Perfect for students, business owners, freelancers, and anyone who wants to understand how marketing works in today's digital world. You'll see the same workflows we use for real client brands — not theory, real practice.`,
    outcomes: [
      'Plan a social media presence end-to-end for a brand',
      'Build a content strategy that actually grows audience',
      'Understand SEO basics and improve search visibility',
      'Read analytics dashboards and report on growth',
      'Speak the language of marketers, founders and agencies',
    ],
    syllabus: [
      { title: 'Foundations of brand growth online', durationLabel: 'Week 1', items: ['What digital marketing really does for a brand', 'Positioning, audience & brand voice', 'Choosing the right platforms for your goals'] },
      { title: 'Social media & content strategy', durationLabel: 'Week 2-3', items: ['Building monthly content calendars', 'Hooks, formats & what makes a post work', 'Community management & engagement loops'] },
      { title: 'SEO basics & search visibility', durationLabel: 'Week 4', items: ['How search engines see your site', 'Keyword research the easy way', 'On-page basics & local SEO for Indian businesses'] },
      { title: 'Campaign planning & analytics', durationLabel: 'Week 5-6', items: ['Setting goals that translate to numbers', 'Reading the metrics that matter', 'Reporting & client storytelling'] },
    ],
  },
  {
    slug: 'performance-marketing',
    title: 'Performance Marketing',
    shortDescription:
      'Hands-on paid ads — Meta Ads, Google Ads, lead generation, targeting, budgets and reporting — using live campaigns and real budgets.',
    longDescription:
      `Learn the basics of paid advertising, lead generation, Meta Ads, Google Ads, campaign setup, targeting, budgeting, creatives, reporting, and result tracking.

This course is ideal for people who want to run ads for brands, businesses, clients, or their own ventures. You'll get hands-on with actual ad accounts and learn the patterns that separate ads that waste money from ads that convert.`,
    outcomes: [
      'Set up Meta Ads & Google Ads campaigns from scratch',
      'Build audiences, lookalikes and retargeting flows',
      'Write ad copy and brief creative that converts',
      'Manage budgets, bids and pacing across campaigns',
      'Read ad reports and optimise for actual results',
    ],
    syllabus: [
      { title: 'How paid ads actually work', durationLabel: 'Week 1', items: ['The ad auction & what you pay for', 'Funnel basics — cold to warm to hot', 'Goal-setting & what numbers actually matter'] },
      { title: 'Meta Ads — Facebook & Instagram', durationLabel: 'Week 2-3', items: ['Campaign structure & objectives', 'Audiences, lookalikes & retargeting', 'Creative strategy & ad formats', 'Budgeting, bidding & scaling'] },
      { title: 'Google Ads — Search, Display, Shopping', durationLabel: 'Week 4-5', items: ['Search vs Display vs Performance Max', 'Keywords, match types & negative lists', 'Quality score & landing page basics'] },
      { title: 'Reporting & optimisation', durationLabel: 'Week 6', items: ['Reading the right dashboards', 'When to kill, when to scale', 'Client-friendly reporting templates'] },
    ],
  },
  {
    slug: 'graphic-design',
    title: 'Graphic Designing',
    shortDescription:
      'Master design fundamentals — layout, typography, colour, branding — and build a portfolio of work that brands actually use.',
    longDescription:
      `Learn how to create professional designs for social media, branding, posters, ads, presentations, and digital campaigns.

You will understand design basics, layouts, typography, colour combinations, brand consistency, and creative thinking — guided by our in-house design team working on live brand briefs.`,
    outcomes: [
      'Design social media posts & ad creatives that look professional',
      'Create posters, presentations & brand collateral',
      'Understand typography, colour theory and visual hierarchy',
      'Build & maintain brand consistency across surfaces',
      'Take a creative brief and execute it end-to-end',
    ],
    syllabus: [
      { title: 'Design fundamentals', durationLabel: 'Week 1', items: ['Layout, grid & visual hierarchy', 'Typography — pairing, weight, spacing', 'Colour theory & emotion in design'] },
      { title: 'Tools & workflow', durationLabel: 'Week 2', items: ['Hands-on with Figma, Canva & Photoshop', 'Working with assets, mockups & exports', 'File organisation like a pro'] },
      { title: 'Social, ads & brand design', durationLabel: 'Week 3-4', items: ['Designing social posts that stop the scroll', 'Static & video ad creative', 'Building brand consistency across surfaces'] },
      { title: 'Portfolio & live brief', durationLabel: 'Week 5-6', items: ['Live brief from a real brand', 'Portfolio building & presentation', 'Feedback rounds with the FM design team'] },
    ],
  },
  {
    slug: 'video-editing',
    title: 'Video Editing',
    shortDescription:
      'Edit reels, YouTube, ads and brand films — cuts, transitions, sound, captions, storytelling — all the way to publish-ready output.',
    longDescription:
      `Learn how to edit videos for reels, YouTube, ads, brand content, event videos, and social media campaigns.

You'll learn editing flow, cuts, transitions, audio syncing, captions, effects, storytelling, and how to make videos engaging — using the same workflow we use for client deliveries every week.`,
    outcomes: [
      'Edit reels and short-form for Instagram, YouTube & TikTok',
      'Cut longer YouTube videos with pacing & storytelling',
      'Sync audio, add captions and design sound for emotion',
      'Use transitions, effects and colour without overdoing it',
      'Export and publish for every major platform spec',
    ],
    syllabus: [
      { title: 'Editing flow & first cuts', durationLabel: 'Week 1-2', items: ['Premiere Pro / CapCut basics', 'Building a rough cut', 'Pacing, rhythm & where to cut'] },
      { title: 'Short-form for social', durationLabel: 'Week 3', items: ['Reels & shorts — the 7-second rule', 'Hooks, captions & on-screen text', 'Vertical-first thinking'] },
      { title: 'Sound, transitions & effects', durationLabel: 'Week 4', items: ['Audio syncing & sound design basics', 'Transitions that actually work', 'Colour basics & looks'] },
      { title: 'Story, delivery & publish', durationLabel: 'Week 5-6', items: ['Telling a story in 60 seconds vs 10 minutes', 'Export presets for every platform', 'Final brand project: ad cut + reel + long-form'] },
    ],
  },
  {
    slug: 'ai-filmmaking',
    title: 'AI Filmmaking',
    shortDescription:
      'New-wave filmmaking — AI video, scripting, concept generation, prompts and modern storytelling tools changing the industry.',
    longDescription:
      `Learn how AI tools are changing the future of content creation and filmmaking.

This course will introduce you to AI-based visual creation, script support, concept generation, AI video tools, creative prompts, and modern storytelling methods. You'll graduate with the ability to produce content that took studios weeks — solo.`,
    outcomes: [
      'Use AI video tools to generate cinematic shots',
      'Write scripts and concepts with AI as a creative partner',
      'Craft prompts that get you what you actually want',
      'Combine AI footage with traditional editing for finished films',
      'Stay ahead of the curve in a fast-moving industry',
    ],
    syllabus: [
      { title: 'The new filmmaking stack', durationLabel: 'Week 1', items: ['What AI changes (and what it doesn\'t) in film', 'Mapping the tools — Runway, Sora, Pika, Kling, Veo', 'Picking the right tool for the shot'] },
      { title: 'Concepting & scripting with AI', durationLabel: 'Week 2', items: ['Idea generation that goes beyond clichés', 'Script structure for short-form AI films', 'Storyboarding in AI workflows'] },
      { title: 'Prompts, characters & consistency', durationLabel: 'Week 3-4', items: ['Anatomy of a great prompt', 'Keeping characters consistent across shots', 'Lighting, lens & camera language in prompts'] },
      { title: 'Final film build', durationLabel: 'Week 5-6', items: ['End-to-end short film project', 'Compositing AI footage with traditional edit', 'Releasing your film to the world'] },
    ],
  },
  {
    slug: 'website-designing',
    title: 'Website Designing',
    shortDescription:
      'Plan and design real-world websites — sections, layouts, UX, mobile, landing pages — for brands, businesses and portfolios.',
    longDescription:
      `Learn how to plan, structure, and design websites for brands, businesses, portfolios, and landing pages.

You'll understand website sections, user experience, content flow, layout planning, mobile responsiveness, and how websites help businesses grow. Taught by the team that ships dozens of brand sites a year.`,
    outcomes: [
      'Plan a website that solves the business goal',
      'Structure pages around clear user journeys',
      'Design sections, layouts and components that scale',
      'Make sites that look right on every device',
      'Build landing pages that drive measurable action',
    ],
    syllabus: [
      { title: 'Thinking like a website strategist', durationLabel: 'Week 1', items: ['What websites actually do for a business', 'Reading a brief & asking the right questions', 'Sitemaps, journeys & priorities'] },
      { title: 'Design fundamentals for the web', durationLabel: 'Week 2-3', items: ['Hero, sections & visual rhythm', 'Typography, colour & component thinking', 'Mobile-first, responsive design'] },
      { title: 'Landing pages that convert', durationLabel: 'Week 4', items: ['Anatomy of a high-converting landing page', 'Copy + design = conversion', 'A/B thinking & iteration'] },
      { title: 'Portfolio project', durationLabel: 'Week 5-6', items: ['Real brand brief — design end-to-end in Figma', 'Hand-off & development considerations', 'Presenting your work like a designer'] },
    ],
  },
];

const BUNDLE_LONG_DESCRIPTION = `The complete in-person Freaking Minds Creator Program — all six courses (Digital Marketing, Performance Marketing, Graphic Design, Video Editing, AI Filmmaking and Website Designing) taught back-to-back across the same 45-day batch at our Bhopal studio.

The bundle is for people who don't want to choose. If you want to walk out as a complete digital creator with real exposure to every part of how modern brands are built online — content, ads, design, video, AI and websites — this is it.

You save ₹30,000 vs buying the courses individually, get a single integrated Creator Program certificate, and your work across modules connects into one portfolio you can show employers, clients or your own audience.`;

// ─── Run ─────────────────────────────────────────────────────────────────
async function main() {
  // Clean up: remove the old single-program seed if it still exists.
  await supabase.from('programs').delete().eq('id', 'prog-creator-2026-06');

  const rows: Array<Record<string, unknown>> = [];

  // 6 individual courses
  for (const c of COURSES) {
    rows.push({
      id: `prog-${c.slug}-2026-06`,
      slug: c.slug,
      title: c.title,
      format: 'cohort',
      status: 'open',
      short_description: c.shortDescription,
      long_description: c.longDescription,
      price_inr: 29999,
      early_bird_price_inr: 24999,
      early_bird_until: EARLY_BIRD_UNTIL,
      currency: 'INR',
      starts_at: STARTS_AT,
      ends_at: ENDS_AT,
      seats_total: SEATS_PER_COURSE,
      outcomes: c.outcomes,
      syllabus: c.syllabus,
      faq: COMMON_FAQ,
      instructor_name: INSTRUCTOR_NAME,
      instructor_bio: INSTRUCTOR_BIO,
    });
  }

  // 1 bundle
  rows.push({
    id: 'prog-creator-program-full-2026-06',
    slug: 'creator-program-full',
    title: 'Freaking Minds Creator Program — Full Bundle',
    format: 'cohort',
    status: 'open',
    short_description:
      'All 6 courses in one — digital marketing, performance ads, graphic design, video editing, AI filmmaking and website design. 45 days, in-person at our Bhopal studio. Save ₹30,000 vs buying individually.',
    long_description: BUNDLE_LONG_DESCRIPTION,
    price_inr: 149999,
    early_bird_price_inr: 129999,
    early_bird_until: EARLY_BIRD_UNTIL,
    currency: 'INR',
    starts_at: STARTS_AT,
    ends_at: ENDS_AT,
    seats_total: SEATS_BUNDLE,
    outcomes: [
      'Walk out as a complete digital creator — content, design, video, ads, AI and web',
      'Build a cross-module portfolio that ties everything together',
      'Get the integrated Creator Program certificate (one, not six)',
      'Save ₹30,000 vs buying each course separately',
      'Smaller bundle batch = more attention from senior FM creators',
    ],
    syllabus: COURSES.map((c) => ({
      title: c.title,
      durationLabel: 'Included module',
      items: [c.shortDescription],
    })),
    faq: BUNDLE_FAQ,
    instructor_name: INSTRUCTOR_NAME,
    instructor_bio: INSTRUCTOR_BIO,
  });

  const { error } = await supabase.from('programs').upsert(rows, { onConflict: 'slug' });
  if (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }

  console.log(`✓ Seeded ${rows.length} programs:\n`);
  for (const r of rows) {
    console.log(`  • ${r.title}`);
    console.log(`    slug : ${r.slug}`);
    console.log(`    price: ₹${r.price_inr}  (EB ₹${r.early_bird_price_inr})`);
    console.log(`    URL  : https://freakingminds.in/academy/${r.slug}`);
    console.log('');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
