import type { Metadata } from 'next';
import { SiteShell } from '@/components/site/SiteShell';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { Prose } from '@/components/site/Prose';
import { Container, Display, Label, Rule, Section, Text } from '@/components/site/primitives';

/**
 * Legal copy, carried over verbatim. The markup changed; not one word did.
 *
 * Every `className` was stripped from the body — headings, lists and emphasis
 * are styled by `[data-prose]` in the token layer now, so this file holds text
 * and structure only.
 */
export const metadata: Metadata = {
  title: 'Privacy Policy',
  alternates: { canonical: '/privacy' },
};

/** Built from the body below, so it cannot fall out of step with it. */
const CONTENTS = [
  '1. Information We Collect',
  '2. How We Use Your Information',
  '3. Cookies & Tracking Technologies',
  '4. Third-Party Services',
  '5. Data Security',
  '6. Data Retention',
  '7. Your Rights',
  '8. Children&apos;s Privacy',
  '9. Changes to This Policy',
  '10. Contact Us',
] as const;

export default function PrivacyPolicyPage() {
  return (
    <SiteShell>
      <SiteHeader />
      <main id="main-content">
        <Section as="div" className="pb-0">
          <Container width="narrow">
            <Label>Your privacy matters</Label>
            <Display level="h1" className="mt-5">
              Privacy Policy
            </Display>
            <Text muted className="mt-6">
              Last updated: February 15, 2026
            </Text>
            <Rule soft className="mt-12" />
          </Container>
        </Section>

        <Section>
          <Container>
            {/* A contents rail. Legal copy has a genuine reading measure, but
                that is a reason to put something useful beside it — not to
                leave half the page empty. */}
            <div className="lay-rail">
              <nav aria-label="On this page" className="lg:sticky lg:top-28 lg:self-start">
                <span className="tag">On this page</span>
                <ol style={{ listStyle: 'none', margin: '18px 0 0', padding: 0 }}>
                  {CONTENTS.map((item) => (
                    <li key={item} className="py-1.5 font-site-sans text-site-label text-site-muted">
                      {item}
                    </li>
                  ))}
                </ol>
              </nav>
            <Prose className="lay-measure">
<section>
              <h2>1. Information We Collect</h2>
              <p>
                We collect information you provide directly to us when you use our services, including:
              </p>
              <ul>
                <li><strong>Contact Information:</strong> Name, email address, phone number, and company name when you fill out forms or contact us.</li>
                <li><strong>Project Details:</strong> Information about your project requirements, budget, timeline, and business challenges submitted through our Get Started form.</li>
                <li><strong>Talent Applications:</strong> Professional details, portfolio links, and availability submitted through our CreativeMinds talent network.</li>
                <li><strong>Usage Data:</strong> Information about how you interact with our website, including pages visited, time spent, and referral sources.</li>
              </ul>
            </section>

            <section>
              <h2>2. How We Use Your Information</h2>
              <p>
                We use the information we collect to:
              </p>
              <ul>
                <li>Respond to your inquiries and provide the services you request</li>
                <li>Send you proposals, project updates, and relevant communications</li>
                <li>Improve our website and services</li>
                <li>Analyze website usage and trends</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2>3. Cookies & Tracking Technologies</h2>
              <p>
                We use cookies and similar tracking technologies to enhance your experience on our website. These include:
              </p>
              <ul>
                <li><strong>Essential Cookies:</strong> Required for the website to function properly.</li>
                <li><strong>Analytics Cookies:</strong> Help us understand how visitors interact with our website (e.g., Google Analytics).</li>
                <li><strong>Preference Cookies:</strong> Remember your settings and preferences.</li>
              </ul>
              <p>
                You can manage cookie preferences through your browser settings. Disabling certain cookies may affect website functionality.
              </p>
            </section>

            <section>
              <h2>4. Third-Party Services</h2>
              <p>
                We may use third-party services that collect, monitor, and analyze information. These include:
              </p>
              <ul>
                <li><strong>Google Analytics:</strong> For website traffic analysis and reporting.</li>
                <li><strong>Google Sheets API:</strong> For securely storing form submissions and managing client data.</li>
              </ul>
              <p>
                These third-party service providers have their own privacy policies governing the use of your information.
              </p>
            </section>

            <section>
              <h2>5. Data Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2>6. Data Retention</h2>
              <p>
                We retain your personal information only for as long as necessary to fulfill the purposes outlined in this policy, unless a longer retention period is required or permitted by law. Project inquiry data is retained for the duration of any business relationship and for a reasonable period afterward.
              </p>
            </section>

            <section>
              <h2>7. Your Rights</h2>
              <p>
                You have the right to:
              </p>
              <ul>
                <li>Access the personal information we hold about you</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Opt out of marketing communications</li>
                <li>Withdraw consent where processing is based on consent</li>
              </ul>
            </section>

            <section>
              <h2>8. Children&apos;s Privacy</h2>
              <p>
                Our services are not directed to individuals under the age of 18. We do not knowingly collect personal information from children. If you believe we have inadvertently collected such information, please contact us immediately.
              </p>
            </section>

            <section>
              <h2>9. Changes to This Policy</h2>
              <p>
                We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the &quot;Last updated&quot; date. We encourage you to review this policy periodically.
              </p>
            </section>

            <section>
              <h2>10. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy or our data practices, please contact us at:
              </p>
              <div>
                <p>Freaking Minds</p>
                <p>Email: freakingmindsdigital@gmail.com</p>
                <p>Phone: +91 98332 57659</p>
                <p>Address: India</p>
              </div>
            </section>
            </Prose>
            </div>
          </Container>
        </Section>
      </main>
      <SiteFooter />
    </SiteShell>
  );
}
