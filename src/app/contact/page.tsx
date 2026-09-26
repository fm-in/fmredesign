import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteShell } from '@/components/site/SiteShell';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { BrainMark } from '@/components/site/BrainMark';
import { ContactForm } from './ContactForm';
import { COMPANY_PHONE_DISPLAY, COMPANY_WHATSAPP_URL } from '@/lib/company';

/**
 * Contact.
 *
 * A server component again: the form is the only interactive part and it now
 * lives in its own client file. The page previously carried the form state,
 * an accordion and a map embed in one 535-line client component.
 *
 * Composition follows the rest of the site — the form is the subject, the
 * details sit beside it as a list, and the FAQ is a plain definition list
 * rather than an accordion. An accordion hides four short answers behind four
 * clicks for no gain.
 */
export const metadata: Metadata = {
  title: 'Contact Us — Start a Conversation',
  description:
    'Tell us what you are trying to move — a number, a launch, a problem. Email, WhatsApp or send a brief and we reply within 24 hours. Serving brands worldwide.',
  alternates: { canonical: '/contact' },
};

const DETAILS = [
  ['Email', 'freakingmindsdigital@gmail.com', 'mailto:freakingmindsdigital@gmail.com'],
  ['WhatsApp', COMPANY_PHONE_DISPLAY, COMPANY_WHATSAPP_URL],
  ['Hours', 'Mon–Fri 9:00–19:00 · Sat 10:00–17:00', null],
  ['Where', 'Bhopal, India. Working with brands worldwide', null],
] as const;

const FAQ = [
  [
    'How long does it take to see results from digital marketing?','It depends on the channel. Paid ads show results within days, social media usually within 1–3 months, and SEO within 3–6 months.',
  ],
  [
    'Do you work with businesses outside of India?',
    'Yes. We work with clients across India and abroad, and plan calls and reviews around your time zone.',
  ],
  ["What's included in your monthly reporting?",
    'The numbers we agreed to track, how each campaign performed, what it returned, what competitors did, and what we will change next month.',
  ],
  [
    'Can you work with our existing marketing team?',
    'Yes, often. We can train your team, advise it, or take on the parts of the work it does not have time for.',
  ],
] as const;

export default function ContactPage() {
  return (
    <SiteShell>
      <SiteHeader />
      <main id="main-content">
        <section className="sec" style={{ paddingBottom: 0 }}>
          {/* The headline is capped at 18ch, so the right of this section is
              empty at desktop widths and the render has somewhere to sit
              without crowding anything. Hidden below lg, where there is no
              such gap. `.sec` is already position:relative. */}
          <div className="absolute right-8 top-32 hidden lg:block lg:right-20">
            <BrainMark pose="support" width={190} />
          </div>
          <div className="wrap">
            <div className="eyebrow">
              <span className="tag tag--a">Contact</span>
            </div>
            <h1 className="d" style={{ maxWidth: '18ch' }}>
              Tell us what you are trying to move.
            </h1>
            <p className="lede" style={{ marginTop: 'clamp(22px, 2.6vw, 34px)' }}>
              A number, a launch, a problem you have been circling for months. We reply within 24
              hours &mdash; and if we are not the right people for it, we will say so.
            </p>
          </div>
        </section>

        <section className="sec">
          <div className="wrap">
            <div className="grid gap-12 lg:grid-cols-[1.4fr_0.6fr] lg:gap-20">
              <ContactForm />

              {/* A div, not <aside>: a complementary landmark must not sit inside <main>. */}
              <div>
                <div className="tag">Direct</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0 0' }}>
                  {DETAILS.map(([label, value, href]) => (
                    <li
                      key={label}
                      style={{ borderTop: '1px solid var(--site-line-soft)', padding: '14px 0' }}
                    >
                      <span className="tag" style={{ display: 'block', marginBottom: 6 }}>
                        {label}
                      </span>
                      {href ? (
                        <a href={href} style={{ color: 'var(--site-text)' }}>
                          {value}
                        </a>
                      ) : (
                        <span style={{ color: 'var(--site-muted)' }}>{value}</span>
                      )}
                    </li>
                  ))}
                </ul>

                <div className="mt-10">
                  <Link className="link-u" href="/get-started">
                    Prefer a step-by-step brief? <span aria-hidden>&rarr;</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="sec" id="faq">
          <div className="wrap">
            <div className="sec-head">
              <div className="eyebrow">
                <span className="tag">Questions</span>
              </div>
              <h2 className="d" data-mask style={{ fontSize: 'clamp(2rem, 4.4vw, 3.8rem)' }}>
                Asked often enough to answer here.
              </h2>
            </div>

            {/* A list, not an accordion: four short answers behind four clicks
                is friction with no benefit, and it hides the text from search. */}
            <dl className="cap" style={{ margin: 0 }}>
              {FAQ.map(([question, answer]) => (
                <div
                  key={question}
                  className="grid gap-3 py-8 sm:grid-cols-[minmax(0,32ch)_1fr] sm:gap-12"
                  style={{ borderBottom: '1px solid var(--site-line)' }}
                >
                  <dt className="h3">{question}</dt>
                  <dd style={{ margin: 0, color: 'var(--site-muted)' }}>{answer}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>
      <SiteFooter />
    </SiteShell>
  );
}
