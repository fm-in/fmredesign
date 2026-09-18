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
  title: 'Terms of Service',
  alternates: { canonical: '/terms' },
};

export default function TermsOfServicePage() {
  return (
    <SiteShell>
      <SiteHeader />
      <main id="main-content">
        <Section as="div" className="pb-0">
          <Container width="narrow">
            <Label>Legal</Label>
            <Display level="h1" className="mt-5">
              Terms of Service
            </Display>
            <Text muted className="mt-6">
              Last updated: February 15, 2026
            </Text>
            <Rule soft className="mt-12" />
          </Container>
        </Section>

        <Section>
          <Container width="narrow">
            <Prose>
<section>
              <h2>1. Acceptance of Terms</h2>
              <p>
                By accessing and using the Freaking Minds website and services, you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our website or services.
              </p>
            </section>

            <section>
              <h2>2. Services</h2>
              <p>
                Freaking Minds provides marketing and creative services including but not limited to:
              </p>
              <ul>
                <li>Search Engine Optimization (SEO)</li>
                <li>Social Media Marketing</li>
                <li>Pay-Per-Click (PPC) Advertising</li>
                <li>Creative Design &amp; Branding</li>
                <li>Website Design &amp; Development</li>
                <li>Content Marketing &amp; Video Production</li>
              </ul>
              <p>
                Specific services, deliverables, and timelines will be outlined in individual project agreements between Freaking Minds and the client.
              </p>
            </section>

            <section>
              <h2>3. Client Obligations</h2>
              <p>
                As a client, you agree to:
              </p>
              <ul>
                <li>Provide accurate and complete information necessary for service delivery</li>
                <li>Respond to requests for approval or feedback in a timely manner</li>
                <li>Ensure that all content and materials provided to us do not infringe on third-party rights</li>
                <li>Make payments according to the agreed-upon schedule</li>
              </ul>
            </section>

            <section>
              <h2>4. Intellectual Property</h2>
              <p>
                Upon full payment, clients receive ownership of the final deliverables created specifically for their project. Freaking Minds retains the right to:
              </p>
              <ul>
                <li>Use the work in our portfolio and marketing materials</li>
                <li>Retain ownership of proprietary tools, templates, and methodologies used in service delivery</li>
                <li>Use pre-existing intellectual property incorporated into deliverables</li>
              </ul>
              <p>
                All content on the Freaking Minds website, including text, graphics, logos, and software, is the property of Freaking Minds and is protected by applicable intellectual property laws.
              </p>
            </section>

            <section>
              <h2>5. Payment Terms</h2>
              <p>
                Payment terms will be specified in individual project agreements. Unless otherwise agreed, invoices are due within 15 days of issuance. Late payments may be subject to a service charge. Freaking Minds reserves the right to suspend services for overdue accounts.
              </p>
            </section>

            <section>
              <h2>6. Confidentiality</h2>
              <p>
                Both parties agree to maintain the confidentiality of any proprietary or sensitive information shared during the course of the engagement. This obligation survives the termination of the business relationship.
              </p>
            </section>

            <section>
              <h2>7. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, Freaking Minds shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of our services or website. Our total liability shall not exceed the amount paid by you for the specific services giving rise to the claim.
              </p>
            </section>

            <section>
              <h2>8. Disclaimer of Warranties</h2>
              <p>
                While we strive to deliver high-quality results, Freaking Minds does not guarantee specific outcomes such as search engine rankings, social media follower counts, or revenue increases. Marketing results depend on many factors beyond our control. Our services are provided on an &quot;as is&quot; basis.
              </p>
            </section>

            <section>
              <h2>9. Termination</h2>
              <p>
                Either party may terminate the service agreement with 30 days written notice. Upon termination, the client is responsible for payment of all services rendered up to the termination date. Freaking Minds will provide all completed deliverables upon receipt of final payment.
              </p>
            </section>

            <section>
              <h2>10. Governing Law</h2>
              <p>
                These Terms of Service shall be governed by and construed in accordance with the laws of India. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts in Bhopal, Madhya Pradesh, India.
              </p>
            </section>

            <section>
              <h2>11. Changes to Terms</h2>
              <p>
                Freaking Minds reserves the right to modify these Terms of Service at any time. Changes will be effective immediately upon posting to this page. Continued use of our services after changes constitutes acceptance of the modified terms.
              </p>
            </section>

            <section>
              <h2>12. Contact Information</h2>
              <p>
                For questions about these Terms of Service, please contact us:
              </p>
              <div>
                <p>Freaking Minds</p>
                <p>Email: freakingmindsdigital@gmail.com</p>
                <p>Phone: +91 98332 57659</p>
                <p>Address: India</p>
              </div>
            </section>
            </Prose>
          </Container>
        </Section>
      </main>
      <SiteFooter />
    </SiteShell>
  );
}
