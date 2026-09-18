import Link from 'next/link';
import { SERVICES, serviceHref } from '@/lib/services-catalogue';
import { Container, Label, Rule } from './primitives';

/**
 * The public site's footer.
 *
 * Services come from the one catalogue, so the footer cannot drift from the
 * header and the services page the way the old one did — it listed four
 * services under names that existed nowhere else, pointing at anchor ids
 * `/services` had to plant hidden shim elements to catch.
 *
 * No newsletter field. The old one had no form, no handler and no endpoint;
 * anything typed into it was discarded silently.
 */

const COMPANY = [
  { label: 'Work', href: '/work' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'CreativeMinds', href: '/creativeminds' },
] as const;

const MORE = [
  { label: 'FM Academy', href: '/academy' },
  { label: 'Freakquency', href: '/freakquency' },
  { label: 'Growth Scorecard', href: '/scorecard' },
  { label: 'Start a project', href: '/get-started' },
] as const;

const SOCIAL = [
  { label: 'Instagram', href: 'https://www.instagram.com/freakingminds' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/freaking-minds' },
] as const;

function Column({ title, links }: { title: string; links: readonly { label: string; href: string }[] }) {
  return (
    <div>
      <Label>{title}</Label>
      <ul className="mt-5 space-y-3" style={{ listStyle: 'none', padding: 0, margin: '1.25rem 0 0' }}>
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="font-site-sans text-site-body transition-opacity hover:opacity-100"
              style={{ color: 'var(--site-text)', opacity: 0.68 }}
              {...(link.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="pb-12 pt-site-section">
      <Container>
        <Rule soft />
        <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <Column
            title="Services"
            links={SERVICES.map((s) => ({ label: s.name, href: serviceHref(s.id) }))}
          />
          <Column title="Company" links={COMPANY} />
          <Column title="More" links={MORE} />
          <div>
            <Label>Get in touch</Label>
            <ul className="mt-5 space-y-3" style={{ listStyle: 'none', padding: 0, margin: '1.25rem 0 0' }}>
              <li>
                <a
                  href="mailto:freakingmindsdigital@gmail.com"
                  className="font-site-sans text-site-body"
                  style={{ color: 'var(--site-text)', opacity: 0.68 }}
                >
                  freakingmindsdigital@gmail.com
                </a>
              </li>
              <li>
                <a
                  href="tel:+919833257659"
                  className="font-site-sans text-site-body"
                  style={{ color: 'var(--site-text)', opacity: 0.68 }}
                >
                  +91 98332 57659
                </a>
              </li>
              {SOCIAL.map((s) => (
                <li key={s.href}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-site-sans text-site-body"
                    style={{ color: 'var(--site-text)', opacity: 0.68 }}
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-site-sans text-site-label uppercase text-site-muted">
            &copy; {year} Freaking Minds
          </span>
          <span className="flex gap-6">
            <Link
              href="/privacy"
              className="font-site-sans text-site-label uppercase text-site-muted"
            >
              Privacy
            </Link>
            <Link href="/terms" className="font-site-sans text-site-label uppercase text-site-muted">
              Terms
            </Link>
          </span>
        </div>
      </Container>
    </footer>
  );
}
