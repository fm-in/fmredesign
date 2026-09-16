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

  it('renders a header band in the brand magenta carrying the wordmark, linked home, with alt text', () => {
    const html = renderShell(baseInput);
    expect(html).toContain('bgcolor="#a82548"');
    expect(html).toContain('src="https://www.freakingminds.in/email/logo.png"');
    expect(html).toContain('alt="FreakingMinds"');
    expect(html).toContain('width="150"');
    expect(html).toMatch(/<a href="https:\/\/www\.freakingminds\.in"[^>]*>\s*<img/);
  });

  it('lays out a 600px table', () => {
    const html = renderShell(baseInput);
    expect(html).toMatch(/<table[^>]*width="600"/);
    expect(html).toContain('max-width:600px');
  });

  it('renders the CTA as a padded, background-coloured table cell rather than a styled anchor', () => {
    const html = renderShell(baseInput);
    expect(html).toMatch(/<td[^>]*bgcolor="#a82548"[^>]*>\s*<a href="https:\/\/cal\.com\/fm-in\/15min"[^>]*>Book a call<\/a>/);
  });

  it('sets body copy in 16px/1.6 on white with the neutral-700 colour', () => {
    const html = renderShell(baseInput);
    expect(html).toMatch(/bgcolor="#ffffff"[^>]*style="[^"]*font-size:16px;line-height:1\.6;color:#2d2d2d/);
  });

  it('carries the company address in the footer when COMPANY_ADDRESS is set', () => {
    process.env.COMPANY_ADDRESS = '123 Example Street, Bhopal';
    const html = renderShell(baseInput);
    expect(html).toContain('123 Example Street, Bhopal');
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
    expect(html).toContain('<a href="https://www.freakingminds.in/work" style="color:#a82548">https://www.freakingminds.in/work</a>');
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

  it('sets explicit bgcolor and background colours on every structural element so dark mode cannot invert it', () => {
    const html = renderShell(baseInput);
    const bgcolorCount = (html.match(/bgcolor="/g) ?? []).length;
    const backgroundStyleCount = (html.match(/background(-color)?:#/g) ?? []).length;
    // header, body, cta cell, footer at minimum
    expect(bgcolorCount).toBeGreaterThanOrEqual(4);
    expect(backgroundStyleCount).toBeGreaterThanOrEqual(4);
  });
});
