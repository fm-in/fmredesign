/**
 * Marketing health scorecard — the question set and its weighting.
 *
 * THIS FILE IS THE PRODUCT. Editing it changes what the scorecard diagnoses,
 * what it recommends, and who it qualifies. Treat a change here the way you
 * would a change to pricing, and ship it via PR.
 *
 * Principles this set is built to:
 *
 *  1. It has to be useful to someone who never contacts us. A quiz that only
 *     works as a lead trap gets abandoned and never shared.
 *  2. Every question must be answerable from memory in a few seconds. No
 *     "what is your CAC" — a small business owner does not know and asking
 *     makes them feel stupid, which loses the submission.
 *  3. No question has a "correct" answer that is just "hire an agency".
 *     Several top-band answers are things the owner can do themselves.
 *  4. Scores are 0-3 everywhere so weighting lives in the dimension, not
 *     smuggled into inconsistent per-question ranges.
 */

import type { Dimension, Question } from './types';

export const DIMENSIONS: Dimension[] = [
  {
    id: 'foundation',
    label: 'Foundation',
    weight: 1.0,
    description: 'Whether the basics work — a site that loads and an obvious way to get in touch.',
  },
  {
    id: 'discoverability',
    label: 'Getting Found',
    weight: 1.2,
    description: 'Whether someone looking for what you sell can actually find you.',
  },
  {
    id: 'content',
    label: 'Content',
    weight: 0.9,
    description: 'Whether you publish anything that gives people a reason to pay attention.',
  },
  {
    id: 'paid',
    label: 'Paid Reach',
    weight: 0.8,
    description: 'Whether money spent on ads is buying something you can point to.',
  },
  {
    id: 'measurement',
    label: 'Measurement',
    weight: 1.3,
    description: 'Whether you know what is working. Almost every other fix depends on this one.',
  },
  {
    id: 'followup',
    label: 'Follow-up',
    weight: 1.1,
    description: 'What happens to an enquiry after it arrives. The cheapest growth there is.',
  },
];

export const QUESTIONS: Question[] = [
  // ---------------------------------------------------------------- foundation
  {
    id: 'f1',
    dimension: 'foundation',
    prompt: 'When someone opens your website on a phone, what happens?',
    hint: 'Most of your visitors are on a phone, so this is the version that matters.',
    options: [
      { value: 'none', label: "We don't have a website", score: 0 },
      { value: 'clunky', label: 'It loads, but it is awkward to use on a phone', score: 1 },
      { value: 'works', label: 'It works fine, though I have never checked the speed', score: 2 },
      { value: 'fast', label: 'It is fast and was built for phones first', score: 3 },
    ],
  },
  {
    id: 'f2',
    dimension: 'foundation',
    prompt: 'How easily can a new customer find a way to contact you?',
    options: [
      { value: 'hunt', label: 'They would have to hunt for it', score: 0 },
      { value: 'footer', label: 'There is a number in the footer somewhere', score: 1 },
      { value: 'visible', label: 'A form or WhatsApp link is visible on most pages', score: 2 },
      { value: 'obvious', label: 'Several obvious routes, and someone always replies', score: 3 },
    ],
  },

  // ----------------------------------------------------------- discoverability
  {
    id: 'd1',
    dimension: 'discoverability',
    prompt: 'Search what you sell plus your city on Google. Where do you come up?',
    hint: 'Genuinely try it — the answer is often not the one people expect.',
    options: [
      { value: 'absent', label: 'Not on the first page', score: 0 },
      { value: 'page1', label: 'Somewhere on page one', score: 1 },
      { value: 'top3', label: 'Top few results, or in the map pack', score: 2 },
      { value: 'dominant', label: 'Top few consistently, and for related searches too', score: 3 },
    ],
  },
  {
    id: 'd2',
    dimension: 'discoverability',
    prompt: 'Is your Google Business Profile claimed and looked after?',
    hint: 'The panel that appears on the right when someone searches your name.',
    options: [
      { value: 'none', label: 'We do not have one, or I am not sure', score: 0 },
      { value: 'stale', label: 'Claimed, but nobody has touched it in months', score: 1 },
      { value: 'current', label: 'Photos and opening hours are current', score: 2 },
      { value: 'active', label: 'Current, with recent posts and replies to reviews', score: 3 },
    ],
  },

  // ------------------------------------------------------------------- content
  {
    id: 'c1',
    dimension: 'content',
    prompt: 'How often does something new go out — a post, a video, an article?',
    options: [
      { value: 'never', label: 'Rarely, or never', score: 0 },
      { value: 'adhoc', label: 'Whenever somebody remembers', score: 1 },
      { value: 'weekly', label: 'Roughly every week', score: 2 },
      { value: 'planned', label: 'To a calendar we plan in advance', score: 3 },
    ],
  },
  {
    id: 'c2',
    dimension: 'content',
    prompt: 'Where does that content come from?',
    options: [
      { value: 'reposted', label: 'We mostly forward or repost what we find', score: 0 },
      { value: 'owner', label: 'The owner writes it when there is time', score: 1 },
      { value: 'owned', label: 'Someone specific is responsible for it', score: 2 },
      { value: 'demand', label: 'Planned around what customers ask and search for', score: 3 },
    ],
  },

  // ---------------------------------------------------------------------- paid
  {
    id: 'p1',
    dimension: 'paid',
    prompt: 'Do you spend money on ads?',
    options: [
      { value: 'no', label: 'No', score: 0 },
      { value: 'boost', label: 'We boost a post now and then', score: 1 },
      { value: 'campaigns', label: 'We run campaigns, but cannot tell what they return', score: 2 },
      { value: 'tracked', label: 'We run campaigns and know the cost per enquiry', score: 3 },
    ],
  },

  // --------------------------------------------------------------- measurement
  {
    id: 'm1',
    dimension: 'measurement',
    prompt: 'Could you say where your last ten customers came from?',
    hint: 'This one question predicts more than any other in the scorecard.',
    options: [
      { value: 'no', label: 'Honestly, no', score: 0 },
      { value: 'guess', label: 'I could guess at it', score: 1 },
      { value: 'most', label: 'For most of them', score: 2 },
      { value: 'recorded', label: 'Exactly — it is written down', score: 3 },
    ],
  },
  {
    id: 'm2',
    dimension: 'measurement',
    prompt: 'What measurement is installed on your website?',
    options: [
      { value: 'none', label: 'None, or I do not know', score: 0 },
      { value: 'installed', label: 'Something was set up once, nobody looks at it', score: 1 },
      { value: 'analytics', label: 'Analytics, which we check now and then', score: 2 },
      { value: 'conversions', label: 'Analytics plus enquiry tracking, reviewed monthly', score: 3 },
    ],
  },

  // ------------------------------------------------------------------ followup
  {
    id: 'r1',
    dimension: 'followup',
    prompt: 'An enquiry arrives. How long before someone replies?',
    options: [
      { value: 'missed', label: 'We sometimes miss them altogether', score: 0 },
      { value: 'days', label: 'Within a few days', score: 1 },
      { value: 'sameday', label: 'Same day', score: 2 },
      { value: 'fast', label: 'Within the hour, and we can prove it', score: 3 },
    ],
  },
  {
    id: 'r2',
    dimension: 'followup',
    prompt: 'What happens to someone who enquires but does not buy straight away?',
    options: [
      { value: 'nothing', label: 'Nothing', score: 0 },
      { value: 'maybe', label: 'We might chase once if we remember', score: 1 },
      { value: 'list', label: 'They go on a list and we follow up', score: 2 },
      { value: 'sequence', label: 'They enter a follow-up sequence that runs itself', score: 3 },
    ],
  },
];

/**
 * Recommendation shown for each dimension at each band.
 *
 * Written as an instruction the reader could act on this week. Deliberately
 * free of "talk to us" — the report earns the conversation by being right,
 * and a report that sells in every line gets closed.
 */
export const RECOMMENDATIONS: Record<string, Record<string, string>> = {
  foundation: {
    at_risk:
      'Start here before anything else. Ads and posts sent to a site that fails on a phone waste every rupee behind them. Get a working mobile page with one clear way to make contact.',
    patchy:
      'The basics exist but leak. Open your own site on your phone on mobile data and time how long it takes to load — anything past three seconds is costing you enquiries.',
    solid:
      'Foundation is sound. Next gain is speed: compress your images and check your slowest page. It is the cheapest conversion improvement available.',
    strong:
      'Nothing to fix here. Keep an eye on load speed after any redesign — it is usually where performance quietly regresses.',
  },
  discoverability: {
    at_risk:
      'You are effectively invisible to people already looking for what you sell. Claim your Google Business Profile today — it is free, takes an afternoon, and for a local business it usually outperforms the website itself.',
    patchy:
      'You appear, but not where the clicks are. Fill out every field on your Business Profile, add real photos, and ask your last ten happy customers for a review.',
    solid:
      'You are findable for your main search. Now go after the next tier — the specific questions people ask before they buy, not just your category name.',
    strong:
      'Strong position. Protect it: keep reviews coming and watch whether competitors start outranking you on your secondary terms.',
  },
  content: {
    at_risk:
      'Nothing you publish means nothing to find and no reason to return. One useful post a week beats a burst of ten and then silence.',
    patchy:
      'Irregular publishing is close to no publishing, because nobody learns to expect it. Pick a cadence you can actually sustain and hold it for three months.',
    solid:
      'Good rhythm. The upgrade is direction — write down the ten questions customers ask before buying and answer one a week.',
    strong:
      'Well run. Start measuring which pieces actually bring enquiries, then make more of those and stop making the rest.',
  },
  paid: {
    at_risk:
      'No ad spend is a perfectly reasonable position, and far better than spending badly. Fix measurement and getting found first — paid amplifies whatever you already have, including the problems.',
    patchy:
      'Boosting posts is the most expensive way to buy attention and the hardest to learn from. Move to a proper campaign with a single goal before spending more.',
    solid:
      'You are spending without knowing the return, which means you cannot tell a good month from a lucky one. Add conversion tracking before increasing budget.',
    strong:
      'You know what a lead costs. That is the position from which scaling spend is safe rather than hopeful.',
  },
  measurement: {
    at_risk:
      'This is the most expensive gap on this page. Without it every other decision is a guess, and you will keep paying for whatever was loudest rather than whatever worked. Start crudely: a spreadsheet asking every new customer how they found you beats perfect analytics you never install.',
    patchy:
      'A rough guess feels like knowing and is not. Ask every enquiry how they found you and write the answer down for one month — the result usually surprises people.',
    solid:
      'You have most of the picture. Close it by tracking enquiries as conversions, so you can see which channel produced them rather than only how many visitors arrived.',
    strong:
      'You can attribute revenue to channel. Almost nobody your size can. Use it to cut whatever is not paying and move that budget.',
  },
  followup: {
    at_risk:
      'You are losing customers you already paid to attract, which is the most expensive way to lose one. Getting to every enquiry within a day would likely do more for revenue than any new campaign.',
    patchy:
      'A few days is usually too late — most buyers go with whoever answers first. Same-day replies are worth more than most marketing spend.',
    solid:
      'Same-day is a good standard. The gap now is the people who do not buy immediately: a simple follow-up a fortnight later recovers more than most expect.',
    strong:
      'Fast and followed up. This is the part most businesses never get right — it compounds with everything else on this page.',
  },
};
