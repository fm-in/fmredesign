import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteShell } from '@/components/site/SiteShell';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { ContactForm } from './ContactForm';
import { COMPANY_PHONE_DISPLAY, COMPANY_PHONE_HREF } from '@/lib/company';

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
  title: 'Contact',
  description:
    `Tell us what you are trying to move. We reply within 24 hours — or call ${COMPANY_PHONE_DISPLAY}.`,
  alternates: { canonical: '/contact' },
};

const DETAILS = [
  ['Email', 'freakingmindsdigital@gmail.com', 'mailto:freakingmindsdigital@gmail.com'],
  ['Phone', COMPANY_PHONE_DISPLAY, COMPANY_PHONE_HREF],
  ['Hours', 'Mon–Fri 9:00–19:00 · Sat 10:00–17:00', null],
  ['Where', 'India-based, serving brands worldwide', null],
] as const;

const FAQ = [
  [
    'How long does it take to see results from digital marketing?',"Results vary by service, but typically you'll see initial improvements in 3-6 months for SEO, immediate results for PPC, and 1-3 months for social media marketing.",
  ],
  [
    'Do you work with businesses outside of India?',
    'Yes! We work with clients across India and internationally. Our team collaborates seamlessly across time zones through digital tools.',
  ],
  ["What's included in your monthly reporting?",
    'Our reports include key metrics, campaign performance, ROI analysis, competitor insights, and strategic recommendations for the next month.',
  ],
  [
    'Can you work with our existing marketing team?',
    'Absolutely! We often collaborate with in-house teams and can provide training, consultation, or handle specific aspects of your marketing strategy.',
  ],
] as const;

export default function ContactPage() {
  return (
    <SiteShell>
      <SiteHeader />
      <main id="main-content">
        <section className="sec" style={{ paddingBottom: 0 }}>
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

              <aside>
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
                    Prefer a guided brief? <span aria-hidden>&rarr;</span>
                  </Link>
                </div>
              </aside>
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
