/**
 * Seed the first FM Academy program: Freaking Minds Creator Program.
 *
 * One cohort, 45 days, six modules in the syllabus (Digital Marketing,
 * Performance Marketing, Graphic Design, Video Editing, AI Filmmaking,
 * Website Designing).
 *
 * Run after applying migrations/2026-06-01-fm-academy.sql:
 *   npx tsx scripts/seed-creator-program.ts
 *
 * Re-runnable — UPSERTs on slug. Safe to run again after edits.
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });
config({ path: '.env' });

const SLUG = 'freaking-minds-creator-program';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // 45-day cohort starting June 5
  const startsAt = new Date('2026-06-05T15:30:00+05:30').toISOString();  // 9:00 PM IST kick-off
  const endsAt = new Date('2026-07-20T15:30:00+05:30').toISOString();
  const earlyBirdUntil = new Date('2026-06-04T18:30:00+05:30').toISOString();

  const program = {
    id: 'prog-creator-2026-06',
    slug: SLUG,
    title: 'Freaking Minds Creator Program',
    format: 'cohort',
    status: 'open',

    short_description:
      'A 45-day, agency-led program covering digital marketing, performance ads, graphic design, video editing, AI filmmaking and website design — built for students, freelancers, and anyone who wants to work in the creative & digital industry.',

    long_description: `The digital world is moving fast — and the people who know how to create, market, design, edit, and build online are the ones leading the future.

The Freaking Minds Creator Program is designed for students, freelancers, aspiring creators, working professionals, entrepreneurs, and anyone who wants to build a career in the creative and digital industry.

This is not a regular classroom course. It's a practical, industry-driven learning experience by Freaking Minds, a full-fledged creative and digital marketing agency with years of experience working with Indian and international brands.

You will learn how brands create content, how social media campaigns are planned, how creatives are designed professionally, how videos are edited for impact, how websites are built, how AI tools are used in modern content creation, and how digital marketing actually works in the real world.

Our focus is simple: Skill-based learning. Practical exposure. Career-ready training.`,

    price_inr: 29999,
    early_bird_price_inr: 24999,
    early_bird_until: earlyBirdUntil,
    currency: 'INR',

    starts_at: startsAt,
    ends_at: endsAt,
    seats_total: 40,

    outcomes: [
      'Plan and run a social media presence end-to-end for a brand',
      'Set up and manage performance ad campaigns on Meta & Google',
      'Design professional creatives, posters, and brand assets',
      'Edit reels, YouTube videos and brand films that hold attention',
      'Use AI tools for ideation, scripting and visual content creation',
      'Plan and structure modern websites that actually convert',
      'Walk into freelancing, internships, or your own venture with a real portfolio',
    ],

    syllabus: [
      {
        title: 'Digital Marketing',
        durationLabel: 'Module 1',
        items: [
          'How brands grow online — strategy & positioning',
          'Social media planning, content calendars & community building',
          'SEO basics for visibility & search ranking',
          'Online presence building, analytics & reporting',
          'Digital growth strategies used by real agencies',
        ],
      },
      {
        title: 'Performance Marketing',
        durationLabel: 'Module 2',
        items: [
          'Foundations of paid advertising & lead generation',
          'Meta Ads — campaign setup, audiences, creatives',
          'Google Ads — search, display & shopping basics',
          'Budgeting, targeting & ad creative principles',
          'Reporting & result tracking — what good performance looks like',
        ],
      },
      {
        title: 'Graphic Design',
        durationLabel: 'Module 3',
        items: [
          'Design fundamentals — layout, typography, colour, hierarchy',
          'Creating social media posts, posters & ad creatives',
          'Branding basics & visual consistency',
          'Presentation design for pitches & campaigns',
          'Building a brand-style design portfolio',
        ],
      },
      {
        title: 'Video Editing',
        durationLabel: 'Module 4',
        items: [
          'Editing flow — cuts, transitions, pacing',
          'Reels, YouTube long-form & ad cut-downs',
          'Audio syncing, captions & sound design basics',
          'Storytelling for short-form content',
          'Exporting & publishing for every platform',
        ],
      },
      {
        title: 'AI Filmmaking',
        durationLabel: 'Module 5',
        items: [
          'How AI is changing content creation & filmmaking',
          'AI-based visual creation & concept generation',
          'Script support, creative prompts & ideation workflows',
          'Hands-on with modern AI video tools',
          'Building short AI-assisted films & creator content',
        ],
      },
      {
        title: 'Website Designing',
        durationLabel: 'Module 6',
        items: [
          'Planning & structuring websites for real businesses',
          'Sections, layouts & content flow',
          'Mobile responsiveness & user experience basics',
          'Landing pages that drive action',
          'How websites support marketing & growth',
        ],
      },
    ],

    faq: [
      {
        q: 'Do I need any prior experience?',
        a: 'No prior experience is required. You just need curiosity, consistency, and willingness to learn. Beginners are welcome.',
      },
      {
        q: 'Who is this program for?',
        a: 'Students looking for career skills, freelancers wanting to upgrade, working professionals planning a career shift, business owners who want to grow online, content creators, and anyone interested in creative, marketing, or digital careers.',
      },
      {
        q: 'How long is the program?',
        a: 'The program runs for 45 days. It is structured to help you learn quickly, practice consistently, and apply your skills professionally.',
      },
      {
        q: 'Is it online or offline?',
        a: 'Sessions are live and online so anyone across India can join. You will receive a WhatsApp group invite and session links after enrolling.',
      },
      {
        q: 'Will I get a certificate?',
        a: 'Yes — every participant who completes the program receives a Freaking Minds Creator Program certificate.',
      },
      {
        q: 'What is the refund policy?',
        a: 'You can request a full refund within the first 3 days of the program if it is not the right fit for you. Reach out to hello@freakingminds.in.',
      },
    ],

    instructor_name: 'The Freaking Minds Team',
    instructor_bio:
      'Led by the founders and senior creators at Freaking Minds — an agency working on real brand campaigns, design, video and digital marketing every single day. You learn from people doing this for clients, not lecturers reading from slides.',
  };

  // UPSERT — re-runnable. Conflict on `slug` (UNIQUE).
  const { data, error } = await supabase
    .from('programs')
    .upsert(program, { onConflict: 'slug' })
    .select()
    .single();

  if (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }

  console.log('✓ Creator Program seeded:');
  console.log(`  id   : ${data.id}`);
  console.log(`  slug : ${data.slug}`);
  console.log(`  URL  : https://freakingminds.in/academy/${data.slug}`);
  console.log(`  price: ₹${data.price_inr}  (early-bird ₹${data.early_bird_price_inr} until ${earlyBirdUntil})`);
  console.log(`  start: ${startsAt}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
