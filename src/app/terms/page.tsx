import { V2PageWrapper } from "@/components/layouts/V2PageWrapper";
import { FileText } from "lucide-react";

export default function TermsOfServicePage() {
  return (
    <V2PageWrapper>
      <section className="relative z-10 v2-section pt-40 pb-32">
        <div className="v2-container v2-container-narrow">
          {/* 3D Brain Decoration */}
          <div className="absolute right-8 lg:right-20 top-36 hidden lg:block" style={{ zIndex: 10 }}>
            <img
              src="/3dasset/brain-strategy.webp"
              alt="Terms & Conditions"
              loading="lazy"
              className="h-auto animate-v2-hero-float"
              style={{
                width: 'min(160px, 25vw)',
                filter: 'drop-shadow(0 20px 40px rgba(140,25,60,0.2))',
              }}
            />
          </div>

          <div className="max-w-3xl mx-auto" style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div className="v2-badge v2-badge-glass mb-6">
              <FileText className="w-4 h-4 v2-text-primary" />
              <span className="v2-text-primary">Legal</span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold v2-text-primary mb-6 leading-tight">
              Terms of Service
            </h1>
            <p className="text-lg v2-text-secondary">
              Last updated: February 15, 2026
            </p>
          </div>

          <div className="v2-paper rounded-3xl p-8 md:p-12 lg:p-16 space-y-10">
            <section>
              <h2 className="font-display text-2xl font-bold text-fm-neutral-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-fm-neutral-600 leading-relaxed">
                By accessing and using the Freaking Minds website and services, you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our website or services.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold text-fm-neutral-900 mb-4">2. Services</h2>
              <p className="text-fm-neutral-600 leading-relaxed mb-4">
                Freaking Minds provides marketing and creative services including but not limited to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-fm-neutral-600">
                <li>Search Engine Optimization (SEO)</li>
                <li>Social Media Marketing</li>
                <li>Pay-Per-Click (PPC) Advertising</li>
                <li>Creative Design &amp; Branding</li>
                <li>Website Design &amp; Development</li>
                <li>Content Marketing &amp; Video Production</li>
              </ul>
              <p className="text-fm-neutral-600 leading-relaxed mt-4">
                Specific services, deliverables, and timelines will be outlined in individual project agreements between Freaking Minds and the client.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold text-fm-neutral-900 mb-4">3. Client Obligations</h2>
              <p className="text-fm-neutral-600 leading-relaxed mb-4">
                As a client, you agree to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-fm-neutral-600">
                <li>Provide accurate and complete information necessary for service delivery</li>
                <li>Respond to requests for approval or feedback in a timely manner</li>
                <li>Ensure that all content and materials provided to us do not infringe on third-party rights</li>
                <li>Make payments according to the agreed-upon schedule</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold text-fm-neutral-900 mb-4">4. Intellectual Property</h2>
              <p className="text-fm-neutral-600 leading-relaxed mb-4">
                Upon full payment, clients receive ownership of the final deliverables created specifically for their project. Freaking Minds retains the right to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-fm-neutral-600">
                <li>Use the work in our portfolio and marketing materials</li>
                <li>Retain ownership of proprietary tools, templates, and methodologies used in service delivery</li>
                <li>Use pre-existing intellectual property incorporated into deliverables</li>
              </ul>
              <p className="text-fm-neutral-600 leading-relaxed mt-4">
                All content on the Freaking Minds website, including text, graphics, logos, and software, is the property of Freaking Minds and is protected by applicable intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold text-fm-neutral-900 mb-4">5. Payment Terms</h2>
              <p className="text-fm-neutral-600 leading-relaxed">
                Payment terms will be specified in individual project agreements. Unless otherwise agreed, invoices are due within 15 days of issuance. Late payments may be subject to a service charge. Freaking Minds reserves the right to suspend services for overdue accounts.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold text-fm-neutral-900 mb-4">6. Confidentiality</h2>
              <p className="text-fm-neutral-600 leading-relaxed">
                Both parties agree to maintain the confidentiality of any proprietary or sensitive information shared during the course of the engagement. This obligation survives the termination of the business relationship.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold text-fm-neutral-900 mb-4">7. Limitation of Liability</h2>
              <p className="text-fm-neutral-600 leading-relaxed">
                To the maximum extent permitted by law, Freaking Minds shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of our services or website. Our total liability shall not exceed the amount paid by you for the specific services giving rise to the claim.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold text-fm-neutral-900 mb-4">8. Disclaimer of Warranties</h2>
              <p className="text-fm-neutral-600 leading-relaxed">
                While we strive to deliver high-quality results, Freaking Minds does not guarantee specific outcomes such as search engine rankings, social media follower counts, or revenue increases. Marketing results depend on many factors beyond our control. Our services are provided on an &quot;as is&quot; basis.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold text-fm-neutral-900 mb-4">9. Termination</h2>
              <p className="text-fm-neutral-600 leading-relaxed">
                Either party may terminate the service agreement with 30 days written notice. Upon termination, the client is responsible for payment of all services rendered up to the termination date. Freaking Minds will provide all completed deliverables upon receipt of final payment.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold text-fm-neutral-900 mb-4">10. Governing Law</h2>
              <p className="text-fm-neutral-600 leading-relaxed">
                These Terms of Service shall be governed by and construed in accordance with the laws of India. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts in Bhopal, Madhya Pradesh, India.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold text-fm-neutral-900 mb-4">11. Changes to Terms</h2>
              <p className="text-fm-neutral-600 leading-relaxed">
                Freaking Minds reserves the right to modify these Terms of Service at any time. Changes will be effective immediately upon posting to this page. Continued use of our services after changes constitutes acceptance of the modified terms.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold text-fm-neutral-900 mb-4">12. Contact Information</h2>
              <p className="text-fm-neutral-600 leading-relaxed">
                For questions about these Terms of Service, please contact us:
              </p>
              <div className="mt-4 p-6 bg-fm-neutral-50 rounded-xl">
                <p className="text-fm-neutral-800 font-semibold">Freaking Minds</p>
                <p className="text-fm-neutral-600">Email: freakingmindsdigital@gmail.com</p>
                <p className="text-fm-neutral-600">Phone: +91 98332 57659</p>
                <p className="text-fm-neutral-600">Address: India</p>
              </div>
            </section>
          </div>
        </div>
      </section>
    </V2PageWrapper>
  );
}
