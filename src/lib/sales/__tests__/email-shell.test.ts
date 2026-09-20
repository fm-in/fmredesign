import { createHash } from 'node:crypto';
import { describe, it, expect, afterEach } from 'vitest';
import { renderShell } from '../email-shell';

const baseInput = {
  preheader: 'A quick note about your enquiry.',
  paragraphs: ['Hi Priya,', 'Some body copy with a link: https://www.freakingminds.in/work'],
  cta: { label: 'Book a call', url: 'https://cal.com/fm-in/15min' },
  ownerName: 'Asha Rao',
  unsubscribeUrl: 'https://www.freakingminds.in/unsubscribe?t=abc',
};

describe('renderShell', () => {
  afterEach(() => {
    delete process.env.COMPANY_ADDRESS;
  });

  it('renders the wordmark on white above the card, linked home, with alt text', () => {
    // Was a magenta header band carrying a white-on-transparent logo. The
    // full-colour mark reads on white unaided, so the band is now a single
    // flat accent rule and the mark sits on the paper.
    const html = renderShell(baseInput);
    expect(html).toContain('src="https://www.freakingminds.in/logo.png"');
    expect(html).toContain('alt="FreakingMinds"');
    expect(html).toContain('width="132"');
    expect(html).toMatch(/<a href="https:\/\/www\.freakingminds\.in"[^>]*>\s*<img/);
    expect(html).toContain('bgcolor="#c9325d"');
    expect(html).not.toContain('#a82548');
  });

  it('lays out a 600px table', () => {
    const html = renderShell(baseInput);
    expect(html).toMatch(/<table[^>]*width="600"/);
    expect(html).toContain('max-width:600px');
  });

  it('renders the CTA as a padded, background-coloured table cell rather than a styled anchor', () => {
    const html = renderShell(baseInput);
    expect(html).toMatch(/<td[^>]*bgcolor="#c9325d"[^>]*>\s*<a href="https:\/\/cal\.com\/fm-in\/15min"[^>]*>Book a call<\/a>/);
  });

  it('sets body copy in 15px/1.6 on white in the shared body ink', () => {
    const html = renderShell(baseInput);
    expect(html).toMatch(/bgcolor="#ffffff"[^>]*style="[^"]*font-size:15px;line-height:1\.6;color:#2e2926/);
  });

  it('carries the company address in the footer of mail that can be unsubscribed from', () => {
    // A commercial email offering an unsubscribe is expected to carry a
    // postal address — CAN-SPAM, and it helps deliverability.
    process.env.COMPANY_ADDRESS = '123 Example Street, Bhopal';
    const html = renderShell(baseInput);
    expect(html).toContain('123 Example Street, Bhopal');
  });

  it('leaves the address off a receipt, which is neither commercial nor unsubscribable', () => {
    process.env.COMPANY_ADDRESS = '123 Example Street, Bhopal';
    const { unsubscribeUrl: _drop, ...transactional } = baseInput;
    const html = renderShell(transactional);
    expect(html).not.toContain('123 Example Street, Bhopal');
    expect(html).not.toContain('Bhopal');
  });

  it('describes the company the way the WhatsApp profile does', () => {
    expect(renderShell(baseInput)).toContain(
      'The marketing and digital partner for brands that intend to grow.',
    );
  });

  it('omits the address line cleanly when COMPANY_ADDRESS is unset', () => {
    delete process.env.COMPANY_ADDRESS;
    const html = renderShell(baseInput);
    expect(html).not.toContain('undefined');
    expect(html).not.toContain('null');
  });

  it('carries the owner name and "FreakingMinds" in the footer', () => {
    const html = renderShell(baseInput);
    expect(html).toContain('Asha Rao');
    expect(html).toContain('FreakingMinds');
  });

  it('includes the unsubscribe link', () => {
    const html = renderShell(baseInput);
    expect(html).toContain(baseInput.unsubscribeUrl);
    expect(html).toMatch(/Unsubscribe/);
  });

  it('renders a sales email byte-for-byte', () => {
    /*
     * A deliberate lock on the exact bytes of an outbound sales email, so
     * that touching the shell for one caller cannot quietly restyle mail
     * already in flight to strangers. Re-pinned when the shell moved onto
     * the shared brand (magenta header band -> masthead on white, the
     * palette in @/lib/email/brand). Changing these hashes is fine when the
     * change was intended; being surprised by them is the point.
     */
    delete process.env.COMPANY_ADDRESS;
    expect(sha256(renderShell(baseInput))).toBe('b4d6c6dce9ed99de964fe35481ed2c209571dad8c0ac0bf9a927c851ca82067f');
    process.env.COMPANY_ADDRESS = '123 Example Street, Bhopal';
    expect(sha256(renderShell(baseInput))).toBe('f81df617a2e9ab280df34eed72d833dfdefc053f19c7f9c25b8bcc8b83d2b674');
  });

  describe('without an unsubscribe link (transactional mail)', () => {
    const transactional = {
      preheader: baseInput.preheader,
      paragraphs: baseInput.paragraphs,
      cta: baseInput.cta,
      ownerName: baseInput.ownerName,
    };

    function footerOf(html: string): string {
      return html.slice(html.lastIndexOf('<tr><td bgcolor="#ffffff"'));
    }

    it.each([
      ['with an address set', '123 Example Street, Bhopal'],
      ['with none set', undefined],
    ])('omits the unsubscribe line cleanly %s, ending the footer on its last real line', (_label, address) => {
      if (address) process.env.COMPANY_ADDRESS = address;
      else delete process.env.COMPANY_ADDRESS;

      const html = renderShell(transactional);
      const footer = footerOf(html);

      expect(html).not.toMatch(/unsubscribe/i);
      expect(html).not.toContain('You are receiving this');
      expect(html).not.toContain('undefined');
      expect(footer).not.toMatch(/<p[^>]*>\s*<\/p>/);
      expect(footer).toContain('<p style="margin:0 0 4px;padding:0;color:#13110f;">Asha Rao</p>');
      // The last paragraph carries no bottom margin, so no gap is left where
      // the line was. On a receipt that last line is always the description.
      expect(footer).toMatch(
        /<p style="margin:0;padding:0;color:#6b635c;">The marketing and digital partner[^<]*<\/p><\/td><\/tr>/,
      );
    });
  });

  it('escapes a paragraph containing markup or ampersands', () => {
    const html = renderShell({ ...baseInput, paragraphs: ['<script>alert(1)</script> & co'] });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&amp; co');
  });

  it('escapes the owner name, cta label/url and unsubscribe url', () => {
    const html = renderShell({
      ...baseInput,
      ownerName: '<b>Asha</b>',
      cta: { label: '<i>Go</i>', url: 'https://example.com/?a=1&b=2' },
      unsubscribeUrl: 'https://example.com/u?x=1&y=2',
    });
    expect(html).not.toContain('<b>Asha</b>');
    expect(html).toContain('&lt;b&gt;Asha&lt;/b&gt;');
    expect(html).not.toContain('<i>Go</i>');
    expect(html).toContain('&lt;i&gt;Go&lt;/i&gt;');
    expect(html).toContain('https://example.com/?a=1&amp;b=2');
    expect(html).toContain('https://example.com/u?x=1&amp;y=2');
  });

  it('linkifies bare URLs inside paragraphs the same way the old plain renderer did', () => {
    const html = renderShell(baseInput);
    expect(html).toContain('<a href="https://www.freakingminds.in/work" style="color:#c9325d">https://www.freakingminds.in/work</a>');
  });

  it('does not swallow sentence punctuation after a link', () => {
    const html = renderShell({
      ...baseInput,
      paragraphs: [
        'See our work: https://www.freakingminds.in/work. Then reply.',
        'Message us (https://wa.me/919833257659?text=Hi), or call: https://cal.com/fm-in/15min, https://x.in/a; https://x.in/b: https://x.in/c! https://x.in/d?',
      ],
    });
    expect(html).toContain('<a href="https://www.freakingminds.in/work" style="color:#c9325d">https://www.freakingminds.in/work</a>. Then reply.');
    expect(html).toContain('(<a href="https://wa.me/919833257659?text=Hi" style="color:#c9325d">https://wa.me/919833257659?text=Hi</a>),');
    expect(html).toContain('<a href="https://cal.com/fm-in/15min" style="color:#c9325d">https://cal.com/fm-in/15min</a>,');
    expect(html).toContain('<a href="https://x.in/a" style="color:#c9325d">https://x.in/a</a>;');
    expect(html).toContain('<a href="https://x.in/b" style="color:#c9325d">https://x.in/b</a>:');
    expect(html).toContain('<a href="https://x.in/c" style="color:#c9325d">https://x.in/c</a>!');
    expect(html).toContain('<a href="https://x.in/d" style="color:#c9325d">https://x.in/d</a>?');
  });

  it('puts a hidden preheader as the first element in the body, carrying the given text', () => {
    const html = renderShell(baseInput);
    const bodyIndex = html.indexOf('<body');
    const firstTableIndex = html.indexOf('<table');
    const preheaderDivIndex = html.indexOf('<div');
    expect(preheaderDivIndex).toBeGreaterThan(bodyIndex);
    expect(preheaderDivIndex).toBeLessThan(firstTableIndex);

    const preheaderMatch = html.match(/<div[^>]*>([^<]*)<\/div>/);
    expect(preheaderMatch).not.toBeNull();
    const [fullTag, text] = preheaderMatch as unknown as [string, string];
    expect(text).toBe(baseInput.preheader);
    expect(fullTag).toMatch(/opacity:\s*0/);
    expect(fullTag).toMatch(/(max-height|height):\s*0/);
    expect(fullTag).toMatch(/overflow:\s*hidden/);
  });

  it('declares utf-8 so em dashes survive clients that sniff the document instead of the transport header', () => {
    const html = renderShell(baseInput);
    expect(html).toContain('<meta charset="utf-8">');
    const headIndex = html.indexOf('<head');
    const metaIndex = html.indexOf('<meta charset="utf-8">');
    const bodyIndex = html.indexOf('<body');
    expect(metaIndex).toBeGreaterThan(headIndex);
    expect(metaIndex).toBeLessThan(bodyIndex);
  });

  it('sets explicit bgcolor and background colours on every structural element so dark mode cannot invert it', () => {
    const html = renderShell(baseInput);
    const bgcolorCount = (html.match(/bgcolor="/g) ?? []).length;
    const backgroundStyleCount = (html.match(/background(-color)?:#/g) ?? []).length;
    // header, body, cta cell, footer at minimum
    expect(bgcolorCount).toBeGreaterThanOrEqual(4);
    expect(backgroundStyleCount).toBeGreaterThanOrEqual(4);
  });
});

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
