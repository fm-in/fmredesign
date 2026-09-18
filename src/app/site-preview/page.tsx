import type { Metadata } from 'next';
import { SiteShell } from '@/components/site/SiteShell';
import { ThemeToggle } from '@/components/site/ThemeToggle';
import { Container, Display, Label, Rule, Section, Text } from '@/components/site/primitives';

/**
 * The foundation, rendered.
 *
 * Not a marketing page and not linked from anywhere — it exists so the token
 * layer can be reviewed in a browser before any real route depends on it, and
 * so a broken token is obvious rather than silent. Deleted at the end of the
 * migration, along with the old system.
 *
 * `/diagnostic` was the previous version of this idea and it shipped to
 * production returning 200, hidden only by robots.txt. This one is noindex
 * AND excluded in robots.ts AND deleted in Phase 9.
 */
export const metadata: Metadata = {
  title: 'Site foundation preview',
  robots: { index: false, follow: false },
  alternates: { canonical: '/site-preview' },
};

const SWATCHES = [
  ['Ground', 'var(--site-ground)'],
  ['Raised', 'var(--site-raised)'],
  ['Text', 'var(--site-text)'],
  ['Muted', 'var(--site-muted)'],
  ['Accent', 'var(--site-accent)'],
] as const;

export default function SitePreviewPage() {
  return (
    <SiteShell>
      <Section>
        <Container>
          <div className="flex items-start justify-between gap-6">
            <div>
              <Label>Foundation</Label>
              <Display level="h1" className="mt-4">
                Ideas that move markets.
              </Display>
            </div>
            <ThemeToggle />
          </div>

          <Text size="lead" muted className="mt-8 max-w-2xl">
            Instrument Serif for display, DM Sans for text. Warm bone paper by default; ink behind
            the toggle. Every colour, size and rhythm value on this page comes from a token, and
            dark mode changes nothing but those tokens.
          </Text>
        </Container>
      </Section>

      <Section tone="raised">
        <Container>
          <Label>Type scale</Label>
          <Rule className="mt-4 mb-10" />
          <Display level="display">Display</Display>
          <Display level="h1" className="mt-6">
            Heading one
          </Display>
          <Display level="h2" className="mt-6">
            Heading two
          </Display>
          <Display level="h3" className="mt-6">
            Heading three
          </Display>
          <Text size="lead" className="mt-6">
            Lead paragraph — the size that carries a section opener.
          </Text>
          <Text className="mt-4 max-w-2xl">
            Body copy. This is the size that has been rendering in the operating system&rsquo;s
            default sans on every page of the live site, because the unlayered{' '}
            <code>body</code> rule resolved to Tailwind&rsquo;s default stack rather than the
            loaded webfont.
          </Text>
        </Container>
      </Section>

      <Section>
        <Container>
          <Label>Palette</Label>
          <Rule className="mt-4 mb-10" />
          <div className="flex flex-wrap gap-6">
            {SWATCHES.map(([name, value]) => (
              <div key={name}>
                <div
                  className="h-24 w-32 rounded-site-md"
                  style={{ background: value, border: '1px solid var(--site-line)' }}
                />
                <Label className="mt-3 block">{name}</Label>
              </div>
            ))}
          </div>
        </Container>
      </Section>
    </SiteShell>
  );
}
