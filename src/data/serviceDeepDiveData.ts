/**
 * Service detail, rendered inline on `/services`.
 *
 * The lucide icons were stripped when `ServiceDeepDiveModal` was deleted —
 * they were decorative there and unused here, and importing them pulled React
 * components into what is now a pure data module.
 *
 * NOTE: `resultsCTA.metrics` is retained by the type but deliberately NOT
 * rendered. Those eighteen figures ("150%+ average traffic increase", "3x more
 * qualified leads", "100+ brands transformed") are hardcoded with nothing
 * behind them. They stay here only so deleting them is a separate, visible
 * decision rather than a silent one.
 */
// ─── Types ──────────────────────────────────────────────────────

export interface HookData {
  headline: string;
  tagline: string;
  problemStatement: string;
  stat: string;
  statLabel: string;
}

export interface Pillar {
  name: string;
  deliverables: string[];
}

export interface WhatWeDoData {
  intro: string;
  pillars: [Pillar, Pillar, Pillar];
}

export interface Persona {
  title: string;
  description: string;
  painPoint: string;
}

export interface WhoItsForData {
  intro: string;
  personas: Persona[];
}

export interface Step {
  title: string;
  description: string;
  duration: string;
}

export interface HowItWorksData {
  intro: string;
  steps: [Step, Step, Step, Step];
}

export interface Metric {
  value: string;
  label: string;
}

export interface ResultsCTAData {
  metrics: [Metric, Metric, Metric];
  ctaText: string;
  ctaDescription: string;
}

export interface ServiceDeepDive {
  serviceId: string;
  title: string;
  colorClass: string;
  accentColorRgb: string;
  hook: HookData;
  whatWeDo: WhatWeDoData;
  whoItsFor: WhoItsForData;
  howItWorks: HowItWorksData;
  resultsCTA: ResultsCTAData;
}

// ─── Data ───────────────────────────────────────────────────────

export const serviceDeepDiveData: ServiceDeepDive[] = [
  // ── SEO ─────────────────────────────────────────────────────
  {
    serviceId: 'seo',
    title: 'Search Engine Optimization',
    colorClass: 'v2-gradient-seo',
    accentColorRgb: '224, 77, 125',
    hook: {
      headline: 'Be Found When It Matters Most',
      tagline: 'Get found. Get chosen.',
      problemStatement:
        'Your competitors are ranking above you — stealing clicks, leads, and revenue every single day. Without a strategic SEO plan, your website is invisible to the people actively searching for what you offer.',
      stat: '93%',
      statLabel: 'of online experiences begin with a search engine',
    },
    whatWeDo: {
      intro:
        'We build SEO strategies that compound over time — turning organic search into your most reliable growth channel.',
      pillars: [
        {
          name: 'Technical Foundation',
          deliverables: [
            'Site architecture audit',
            'Core Web Vitals optimization',
            'Schema markup implementation',
            'Crawl & indexation fixes',
          ],
        },
        {
          name: 'Content & Keywords',
          deliverables: [
            'Keyword gap analysis',
            'Content calendar creation',
            'On-page optimization',
            'Featured snippet targeting',
          ],
        },
        {
          name: 'Authority Building',
          deliverables: [
            'Backlink acquisition',
            'Digital PR campaigns',
            'Local citation building',
            'Competitor link analysis',
          ],
        },
      ],
    },
    whoItsFor: {
      intro:
        'SEO works for every business that wants sustainable, long-term organic growth.',
      personas: [
        {
          title: 'E-commerce Brands',
          description: 'Product pages that rank and convert organic shoppers.',
          painPoint: 'Lost in a sea of competitors on page 2+',
        },
        {
          title: 'Local Businesses',
          description: 'Dominate local search and Google Maps in your area.',
          painPoint: 'Invisible to nearby customers searching right now',
        },
        {
          title: 'B2B Companies',
          description: 'Capture high-intent decision-makers researching solutions.',
          painPoint: 'Relying solely on paid ads for leads',
        },
        {
          title: 'Startups & Scale-ups',
          description: 'Build organic visibility from day one for compounding growth.',
          painPoint: 'Zero organic traffic and brand awareness',
        },
      ],
    },
    howItWorks: {
      intro:
        'A proven four-phase approach that delivers measurable results at every stage.',
      steps: [
        {
          title: 'Deep Audit',
          description:
            'We crawl every page, analyze competitors, and uncover the technical and content gaps holding you back.',
          duration: 'Week 1-2',
        },
        {
          title: 'Strategy & Roadmap',
          description:
            'Prioritized keyword targets, content plan, and technical fixes mapped to your business goals.',
          duration: 'Week 2-3',
        },
        {
          title: 'Execute & Optimize',
          description:
            'On-page fixes, content creation, link building, and technical improvements — rolled out systematically.',
          duration: 'Month 1-3',
        },
        {
          title: 'Measure & Scale',
          description:
            'Monthly reporting, rank tracking, and strategy refinements to keep momentum building.',
          duration: 'Ongoing',
        },
      ],
    },
    resultsCTA: {
      metrics: [
        { value: '150%+', label: 'Average traffic increase' },
        { value: 'Top 10', label: 'Rankings for target keywords' },
        { value: '3x', label: 'More qualified leads' },
      ],
      ctaText: 'Get Your Free SEO Audit',
      ctaDescription:
        'Discover exactly what\'s holding your rankings back — and how to fix it.',
    },
  },

  // ── Social Media ────────────────────────────────────────────
  {
    serviceId: 'social',
    title: 'Social Media Marketing',
    colorClass: 'v2-gradient-social',
    accentColorRgb: '236, 117, 160',
    hook: {
      headline: 'Stop Posting. Start Connecting.',
      tagline: 'Build communities, not just followers.',
      problemStatement:
        'Posting without a strategy is just noise. Your audience scrolls past generic content every day. Without genuine engagement and strategic storytelling, your social presence is a missed opportunity.',
      stat: '4.9B',
      statLabel: 'people use social media worldwide',
    },
    whatWeDo: {
      intro:
        'We turn social channels into engines for community, brand love, and measurable business growth.',
      pillars: [
        {
          name: 'Strategy & Planning',
          deliverables: [
            'Platform-specific strategy',
            'Audience research & personas',
            'Content calendar design',
            'Competitor benchmarking',
          ],
        },
        {
          name: 'Content Creation',
          deliverables: [
            'Scroll-stopping visuals',
            'Short-form video (Reels/Shorts)',
            'Copywriting & captions',
            'Story & carousel design',
          ],
        },
        {
          name: 'Growth & Engagement',
          deliverables: [
            'Community management',
            'Influencer collaborations',
            'Paid social amplification',
            'UGC campaigns',
          ],
        },
      ],
    },
    whoItsFor: {
      intro:
        'Social media is for brands that want real connection — not vanity metrics.',
      personas: [
        {
          title: 'D2C Brands',
          description: 'Build brand loyalty and drive direct sales through social.',
          painPoint: 'Low engagement despite posting regularly',
        },
        {
          title: 'Restaurants & Hospitality',
          description: 'Showcase your vibe and drive foot traffic.',
          painPoint: 'Inconsistent posting with no clear strategy',
        },
        {
          title: 'Personal Brands',
          description: 'Position yourself as a thought leader in your space.',
          painPoint: 'No time to create and manage content',
        },
        {
          title: 'E-commerce Stores',
          description: 'Turn followers into buyers with shoppable content.',
          painPoint: 'High follower count but low conversions',
        },
      ],
    },
    howItWorks: {
      intro:
        'From strategy to execution — here\'s how we grow your social presence.',
      steps: [
        {
          title: 'Social Audit',
          description:
            'We analyze your current presence, audience demographics, and competitor landscape to find opportunities.',
          duration: 'Week 1',
        },
        {
          title: 'Content Production',
          description:
            'Our creative team produces a month\'s worth of platform-optimized content — visuals, copy, and video.',
          duration: 'Week 2-3',
        },
        {
          title: 'Launch & Engage',
          description:
            'We publish on schedule, engage with your community, and amplify top-performing content.',
          duration: 'Month 1+',
        },
        {
          title: 'Analyze & Iterate',
          description:
            'Monthly performance reports and strategy tweaks to continuously improve results.',
          duration: 'Ongoing',
        },
      ],
    },
    resultsCTA: {
      metrics: [
        { value: '300%+', label: 'Engagement rate increase' },
        { value: '10x', label: 'Follower growth' },
        { value: '-45%', label: 'Cost per lead reduction' },
      ],
      ctaText: 'Get Your Social Strategy',
      ctaDescription:
        'Let\'s build a social media presence that actually drives business results.',
    },
  },

  // ── PPC ─────────────────────────────────────────────────────
  {
    serviceId: 'performance',
    title: 'Pay-Per-Click Advertising',
    colorClass: 'v2-gradient-performance',
    accentColorRgb: '140, 29, 74',
    hook: {
      headline: 'Every Rupee. Maximum Impact.',
      tagline: 'Targeted ads that deliver ROI.',
      problemStatement:
        'Without expert management, paid ads burn budget fast. Poor targeting, weak copy, and unoptimized landing pages mean you\'re paying for clicks that never convert.',
      stat: '65%',
      statLabel: 'of high-intent searches result in an ad click',
    },
    whatWeDo: {
      intro:
        'We engineer paid campaigns that turn ad spend into predictable, profitable growth.',
      pillars: [
        {
          name: 'Search Ads',
          deliverables: [
            'Google Ads management',
            'Keyword bidding strategy',
            'Ad copy A/B testing',
            'Quality Score optimization',
          ],
        },
        {
          name: 'Social Ads',
          deliverables: [
            'Facebook & Instagram Ads',
            'LinkedIn B2B campaigns',
            'Lookalike audience targeting',
            'Creative testing frameworks',
          ],
        },
        {
          name: 'Optimization',
          deliverables: [
            'Conversion tracking setup',
            'Landing page optimization',
            'Remarketing campaigns',
            'Budget allocation modeling',
          ],
        },
      ],
    },
    whoItsFor: {
      intro:
        'PPC is for businesses that want fast, measurable results from their ad spend.',
      personas: [
        {
          title: 'E-commerce Brands',
          description: 'Drive product sales with Shopping and search campaigns.',
          painPoint: 'High ad spend but low ROAS',
        },
        {
          title: 'Lead-Gen Businesses',
          description: 'Fill your pipeline with qualified leads at scale.',
          painPoint: 'Inconsistent lead flow and high CPL',
        },
        {
          title: 'Funded Startups',
          description: 'Scale user acquisition with data-driven paid growth.',
          painPoint: 'Need rapid growth but burning through budget',
        },
        {
          title: 'Service Businesses',
          description: 'Capture local demand and book more appointments.',
          painPoint: 'Competitors outbidding you on every keyword',
        },
      ],
    },
    howItWorks: {
      intro:
        'A disciplined process that maximizes every rupee of your ad budget.',
      steps: [
        {
          title: 'Account Audit',
          description:
            'We tear apart your existing campaigns (or start fresh) to find wasted spend and missed opportunities.',
          duration: 'Week 1',
        },
        {
          title: 'Campaign Architecture',
          description:
            'We build a structured account with tight ad groups, compelling copy, and optimized landing pages.',
          duration: 'Week 2-3',
        },
        {
          title: 'Launch & Test',
          description:
            'Campaigns go live with rigorous A/B testing and daily bid management.',
          duration: 'Week 3-4',
        },
        {
          title: 'Scale Profitably',
          description:
            'We scale what works, cut what doesn\'t, and continuously optimize for better ROAS.',
          duration: 'Ongoing',
        },
      ],
    },
    resultsCTA: {
      metrics: [
        { value: '4.5x', label: 'Average ROAS achieved' },
        { value: '-40%', label: 'Cost per lead reduction' },
        { value: '200%+', label: 'Conversion rate improvement' },
      ],
      ctaText: 'Get Your PPC Audit',
      ctaDescription:
        'Find out exactly where your ad budget is being wasted — and how to fix it.',
    },
  },

  // ── Branding ────────────────────────────────────────────────
  {
    serviceId: 'branding',
    title: 'Creative Design & Branding',
    colorClass: 'v2-gradient-brand',
    accentColorRgb: '224, 77, 125',
    hook: {
      headline: 'Look Unforgettable.',
      tagline: 'Brands that leave a mark.',
      problemStatement:
        'A weak or inconsistent brand makes you forgettable. In a crowded market, your visual identity is often the first — and sometimes only — chance to make an impression.',
      stat: '0.05s',
      statLabel: 'is all it takes to form a brand impression',
    },
    whatWeDo: {
      intro:
        'We craft brand identities that are impossible to ignore — from strategy to every visual touchpoint.',
      pillars: [
        {
          name: 'Brand Strategy',
          deliverables: [
            'Brand positioning & messaging',
            'Audience & competitor analysis',
            'Brand voice & tone guide',
            'Mission & values framework',
          ],
        },
        {
          name: 'Visual Identity',
          deliverables: [
            'Logo design & variations',
            'Color palette & typography',
            'Brand guidelines document',
            'Icon & illustration system',
          ],
        },
        {
          name: 'Marketing Design',
          deliverables: [
            'Social media templates',
            'Business card & stationery',
            'Packaging design',
            'Presentation decks',
          ],
        },
      ],
    },
    whoItsFor: {
      intro:
        'Branding is for anyone who wants to be remembered — not just recognized.',
      personas: [
        {
          title: 'Startups',
          description: 'Launch with a brand that looks established from day one.',
          painPoint: 'DIY branding that looks amateur',
        },
        {
          title: 'Rebranding Companies',
          description: 'Refresh your identity to match your evolved business.',
          painPoint: 'Outdated brand that no longer represents you',
        },
        {
          title: 'Product Brands',
          description: 'Stand out on shelves and screens with cohesive design.',
          painPoint: 'Inconsistent visuals across touchpoints',
        },
        {
          title: 'Personal Brands',
          description: 'Build a professional visual identity for your personal brand.',
          painPoint: 'No cohesive look across platforms',
        },
      ],
    },
    howItWorks: {
      intro:
        'A collaborative process that translates your vision into a living brand system.',
      steps: [
        {
          title: 'Discovery Workshop',
          description:
            'Deep dive into your brand DNA — values, audience, competitive landscape, and aspirations.',
          duration: 'Week 1',
        },
        {
          title: 'Concept Development',
          description:
            'We present 2-3 distinct creative directions with mood boards, logo concepts, and color explorations.',
          duration: 'Week 2-3',
        },
        {
          title: 'Refinement & Systems',
          description:
            'Your chosen direction is refined into a complete brand system with guidelines and templates.',
          duration: 'Week 3-5',
        },
        {
          title: 'Launch Kit Delivery',
          description:
            'You receive all brand assets, guidelines, and templates — ready for immediate use.',
          duration: 'Week 5-6',
        },
      ],
    },
    resultsCTA: {
      metrics: [
        { value: '85%', label: 'Brand recognition improvement' },
        { value: '2x', label: 'Customer trust increase' },
        { value: '100+', label: 'Brands transformed' },
      ],
      ctaText: 'Start Your Brand Journey',
      ctaDescription:
        'Let\'s create a brand identity that makes your competition jealous.',
    },
  },

  // ── Web Development ─────────────────────────────────────────
  {
    serviceId: 'web',
    title: 'Website Design & Development',
    colorClass: 'v2-gradient-web',
    accentColorRgb: '90, 26, 56',
    hook: {
      headline: 'Fast. Beautiful. Converting.',
      tagline: 'Websites that work as hard as you do.',
      problemStatement:
        'A slow, outdated, or poorly designed website isn\'t just embarrassing — it\'s costing you customers. Every second of load time, every confusing layout, drives potential buyers straight to competitors.',
      stat: '88%',
      statLabel: 'of users won\'t return after a bad website experience',
    },
    whatWeDo: {
      intro:
        'We build websites that look stunning, load fast, and convert visitors into customers.',
      pillars: [
        {
          name: 'Design & UX',
          deliverables: [
            'Custom UI/UX design',
            'Wireframing & prototyping',
            'Mobile-first responsive design',
            'Conversion-focused layouts',
          ],
        },
        {
          name: 'Development',
          deliverables: [
            'Next.js / React development',
            'CMS integration',
            'E-commerce functionality',
            'API & third-party integrations',
          ],
        },
        {
          name: 'Performance',
          deliverables: [
            'Core Web Vitals optimization',
            'SEO-ready architecture',
            'Security hardening',
            'Analytics & tracking setup',
          ],
        },
      ],
    },
    whoItsFor: {
      intro:
        'A great website is the foundation of every digital strategy.',
      personas: [
        {
          title: 'Outdated Websites',
          description: 'Modernize your site to match your brand and goals.',
          painPoint: 'Website looks like it\'s from 2015',
        },
        {
          title: 'E-commerce Businesses',
          description: 'Build a store that handles traffic spikes and converts.',
          painPoint: 'Cart abandonment rates through the roof',
        },
        {
          title: 'Startups',
          description: 'Launch fast with a site that scales with your growth.',
          painPoint: 'Need a professional web presence quickly',
        },
        {
          title: 'B2B Companies',
          description: 'Generate and nurture leads with a high-authority site.',
          painPoint: 'Website doesn\'t generate any leads',
        },
      ],
    },
    howItWorks: {
      intro:
        'A structured build process that delivers on time and exceeds expectations.',
      steps: [
        {
          title: 'Research & Planning',
          description:
            'We audit your current site, research competitors, and define information architecture and user flows.',
          duration: 'Week 1-2',
        },
        {
          title: 'Design & Prototype',
          description:
            'High-fidelity designs and interactive prototypes — approved before a single line of code is written.',
          duration: 'Week 2-4',
        },
        {
          title: 'Development & Testing',
          description:
            'Clean, performant code built with modern frameworks. Rigorous cross-browser and device testing.',
          duration: 'Week 4-7',
        },
        {
          title: 'Launch & Support',
          description:
            'Smooth deployment, SEO checks, analytics setup, and 30 days of post-launch support.',
          duration: 'Week 7-8',
        },
      ],
    },
    resultsCTA: {
      metrics: [
        { value: '<2s', label: 'Average page load time' },
        { value: '60%+', label: 'Conversion rate improvement' },
        { value: '95+', label: 'PageSpeed Insights score' },
      ],
      ctaText: 'Get Your Website Quote',
      ctaDescription:
        'Let\'s build a website that becomes your hardest-working salesperson.',
    },
  },

  // ── Content Marketing ───────────────────────────────────────
  {
    serviceId: 'content',
    title: 'Content Marketing & Video Production',
    colorClass: 'v2-gradient-content',
    accentColorRgb: '255, 160, 122',
    hook: {
      headline: 'Stories That Sell.',
      tagline: 'Content that earns attention.',
      problemStatement:
        'Your audience is drowning in ads and tuning out promotional messages. The brands winning today are the ones creating genuinely valuable content that educates, entertains, and builds trust.',
      stat: '70%',
      statLabel: 'of consumers prefer learning through content over ads',
    },
    whatWeDo: {
      intro:
        'We create content ecosystems that attract, engage, and convert — across every format and channel.',
      pillars: [
        {
          name: 'Content Strategy',
          deliverables: [
            'Content audit & gap analysis',
            'Editorial calendar creation',
            'SEO content mapping',
            'Distribution strategy',
          ],
        },
        {
          name: 'Written Content',
          deliverables: [
            'Blog posts & articles',
            'Case studies & whitepapers',
            'Email sequences',
            'Website copywriting',
          ],
        },
        {
          name: 'Video & Visual',
          deliverables: [
            'Brand videos & ads',
            'Social media reels',
            'Infographics & visuals',
            'Motion graphics',
          ],
        },
      ],
    },
    whoItsFor: {
      intro:
        'Content marketing works for any brand ready to invest in long-term audience growth.',
      personas: [
        {
          title: 'B2B Companies',
          description: 'Establish thought leadership and nurture leads with content.',
          painPoint: 'Long sales cycles with no content to support them',
        },
        {
          title: 'E-commerce Brands',
          description: 'Drive organic traffic and reduce ad dependency with content.',
          painPoint: '100% reliant on paid traffic for sales',
        },
        {
          title: 'Personal Brands',
          description: 'Build authority and grow your audience with consistent content.',
          painPoint: 'Great expertise but no content to show for it',
        },
        {
          title: 'Service Businesses',
          description: 'Attract local customers with helpful, trust-building content.',
          painPoint: 'No online content to differentiate from competitors',
        },
      ],
    },
    howItWorks: {
      intro:
        'From strategy to publishing — a content engine that runs like clockwork.',
      steps: [
        {
          title: 'Content Audit',
          description:
            'We evaluate your existing content, identify gaps, and research what your audience actually wants.',
          duration: 'Week 1',
        },
        {
          title: 'Editorial Calendar',
          description:
            'A strategic content plan with topics, formats, keywords, and publishing schedule.',
          duration: 'Week 2',
        },
        {
          title: 'Create & Publish',
          description:
            'Our writers, designers, and videographers produce and publish high-quality content on schedule.',
          duration: 'Month 1+',
        },
        {
          title: 'Measure & Optimize',
          description:
            'Track performance, double down on winners, and continuously refine the content strategy.',
          duration: 'Ongoing',
        },
      ],
    },
    resultsCTA: {
      metrics: [
        { value: '5x', label: 'More qualified leads' },
        { value: '200%+', label: 'Organic traffic growth' },
        { value: '-80%', label: 'Cost per lead vs paid ads' },
      ],
      ctaText: 'Get Your Content Strategy',
      ctaDescription:
        'Let\'s build a content engine that drives leads while you sleep.',
    },
  },
];
