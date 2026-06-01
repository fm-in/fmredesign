import { V2PageWrapper } from "@/components/layouts/V2PageWrapper";
import { Shield } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <V2PageWrapper>
      <section className="relative z-10 v2-section pt-40 pb-32">
        <div className="v2-container v2-container-narrow">
          {/* 3D Brain Decoration */}
          <div className="absolute left-8 lg:left-20 top-36 hidden lg:block" style={{ zIndex: 10 }}>
            <img
              src="/3dasset/brain-learning.webp"
              alt="Your Privacy Matters"
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
              <Shield className="w-4 h-4 v2-text-primary" />
              <span className="v2-text-primary">Your Privacy Matters</span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold v2-text-primary mb-6 leading-tight">
              Privacy Policy
            </h1>
            <p className="text-lg v2-text-secondary">
              Last updated: February 15, 2026
            </p>
          </div>

          <div className="v2-paper rounded-3xl p-8 md:p-12 lg:p-16 space-y-10">
            <section>
              <h2 className="font-display text-2xl font-bold text-fm-neutral-900 mb-4">1. Information We Collect</h2>
              <p className="text-fm-neutral-600 leading-relaxed mb-4">
                We collect information you provide directly to us when you use our services, including:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-fm-neutral-600">
                <li><strong className="text-fm-neutral-800">Contact Information:</strong> Name, email address, phone number, and company name when you fill out forms or contact us.</li>
                <li><strong className="text-fm-neutral-800">Project Details:</strong> Information about your project requirements, budget, timeline, and business challenges submitted through our Get Started form.</li>
                <li><strong className="text-fm-neutral-800">Talent Applications:</strong> Professional details, portfolio links, and availability submitted through our CreativeMinds talent network.</li>
                <li><strong className="text-fm-neutral-800">Usage Data:</strong> Information about how you interact with our website, including pages visited, time spent, and referral sources.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold text-fm-neutral-900 mb-4">2. How We Use Your Information</h2>
              <p className="text-fm-neutral-600 leading-relaxed mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-fm-neutral-600">
                <li>Respond to your inquiries and provide the services you request</li>
                <li>Send you proposals, project updates, and relevant communications</li>
                <li>Improve our website and services</li>
                <li>Analyze website usage and trends</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold text-fm-neutral-900 mb-4">3. Cookies & Tracking Technologies</h2>
              <p className="text-fm-neutral-600 leading-relaxed mb-4">
                We use cookies and similar tracking technologies to enhance your experience on our website. These include:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-fm-neutral-600">
                <li><strong className="text-fm-neutral-800">Essential Cookies:</strong> Required for the website to function properly.</li>
                <li><strong className="text-fm-neutral-800">Analytics Cookies:</strong> Help us understand how visitors interact with our website (e.g., Google Analytics).</li>
                <li><strong className="text-fm-neutral-800">Preference Cookies:</strong> Remember your settings and preferences.</li>
              </ul>
              <p className="text-fm-neutral-600 leading-relaxed mt-4">
                You can manage cookie preferences through your browser settings. Disabling certain cookies may affect website functionality.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold text-fm-neutral-900 mb-4">4. Third-Party Services</h2>
              <p className="text-fm-neutral-600 leading-relaxed mb-4">
                We may use third-party services that collect, monitor, and analyze information. These include:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-fm-neutral-600">
                <li><strong className="text-fm-neutral-800">Google Analytics:</strong> For website traffic analysis and reporting.</li>
                <li><strong className="text-fm-neutral-800">Google Sheets API:</strong> For securely storing form submissions and managing client data.</li>
              </ul>
              <p className="text-fm-neutral-600 leading-relaxed mt-4">
                These third-party service providers have their own privacy policies governing the use of your information.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold text-fm-neutral-900 mb-4">5. Data Security</h2>
              <p className="text-fm-neutral-600 leading-relaxed">
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold text-fm-neutral-900 mb-4">6. Data Retention</h2>
              <p className="text-fm-neutral-600 leading-relaxed">
                We retain your personal information only for as long as necessary to fulfill the purposes outlined in this policy, unless a longer retention period is required or permitted by law. Project inquiry data is retained for the duration of any business relationship and for a reasonable period afterward.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold text-fm-neutral-900 mb-4">7. Your Rights</h2>
              <p className="text-fm-neutral-600 leading-relaxed mb-4">
                You have the right to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-fm-neutral-600">
                <li>Access the personal information we hold about you</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Opt out of marketing communications</li>
                <li>Withdraw consent where processing is based on consent</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold text-fm-neutral-900 mb-4">8. Children&apos;s Privacy</h2>
              <p className="text-fm-neutral-600 leading-relaxed">
                Our services are not directed to individuals under the age of 18. We do not knowingly collect personal information from children. If you believe we have inadvertently collected such information, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold text-fm-neutral-900 mb-4">9. Changes to This Policy</h2>
              <p className="text-fm-neutral-600 leading-relaxed">
                We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the &quot;Last updated&quot; date. We encourage you to review this policy periodically.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold text-fm-neutral-900 mb-4">10. Contact Us</h2>
              <p className="text-fm-neutral-600 leading-relaxed">
                If you have any questions about this Privacy Policy or our data practices, please contact us at:
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
