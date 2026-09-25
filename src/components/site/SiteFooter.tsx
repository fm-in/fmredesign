import Link from 'next/link';
import Image from 'next/image';
import { SERVICES, serviceHref } from '@/lib/services-catalogue';
import { COMPANY_EMAIL, COMPANY_PHONE_DISPLAY, COMPANY_WHATSAPP_URL } from '@/lib/company';

/**
 * The public site's footer, as approved: brand block plus three columns —
 * Services, Systems, Company.
 *
 * "Systems" is the in-house software. It is a column here rather than a
 * footnote because building our own tools is part of the positioning, not a
 * side project.
 *
 * Services come from the one catalogue, so this cannot drift from the header
 * and `/services` the way the old footer did. No newsletter field: the old one
 * had no form, no handler and no endpoint.
 */

const SYSTEMS = [
  { label: 'Freakquency', href: '/freakquency' },
  { label: 'Growth Scorecard', href: '/scorecard' },
  { label: 'CreativeMinds', href: '/creativeminds' },
  { label: 'FM Academy', href: '/academy' },
] as const;

const COMPANY = [
  { label: 'About', href: '/about' },
  { label: 'Work', href: '/work' },
  { label: 'Contact', href: '/contact' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
] as const;

function Column({ title, links }: { title: string; links: readonly { label: string; href: string }[] }) {
  return (
    <div className="foot-col">
      {/* h3, not h4: the page's last section heading is an h2, and skipping
          a level breaks the outline screen readers navigate by. */}
      <h3 className="tag">{title}</h3>
      <ul>
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href}>{link.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot-grid">
          <div className="foot-brand">
            <span className="logo">
              <Image className="on-light" src="/logo.png" alt="Freaking Minds" width={88} height={55} />
              <Image className="on-dark" src="/logo-white.png" alt="" aria-hidden width={88} height={55} />
            </span>
            <p>
              The marketing and digital partner for brands that intend to grow. India, and
              worldwide.
            </p>
            {/* Every page ends here, so the two ways people actually reach us
                belong here too — not only on /contact. */}
            <ul className="foot-contact">
              <li>
                <a href={COMPANY_WHATSAPP_URL}>WhatsApp &middot; {COMPANY_PHONE_DISPLAY}</a>
              </li>
              <li>
                <a href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>
              </li>
            </ul>
          </div>

          <Column
            title="Services"
            links={SERVICES.map((s) => ({ label: s.name, href: serviceHref(s.id) }))}
          />
          <Column title="Systems" links={SYSTEMS} />
          <Column title="Company" links={COMPANY} />
        </div>

        <div className="foot-fine">
          <span className="tag">&copy; {new Date().getFullYear()} Freaking Minds</span>
          <span className="tag">Marketing &amp; digital partner</span>
        </div>
      </div>
    </footer>
  );
}
