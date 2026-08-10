import { describe, it, expect } from 'vitest';
import { scorecardReportEmail } from '../send';
import { scoreScorecard, BAND_LABELS } from '@/lib/scorecard/scoring';
import { QUESTIONS } from '@/lib/scorecard/questions';
import type { AnswerMap } from '@/lib/scorecard/types';

/** Real result object, so the template is tested against real shapes. */
function resultFor(score: 0 | 1 | 2 | 3) {
  const answers: AnswerMap = {};
  for (const q of QUESTIONS) {
    const opt = q.options.find((o) => o.score === score);
    if (opt) answers[q.id] = opt.value;
  }
  return scoreScorecard(answers);
}

function render(score: 0 | 1 | 2 | 3) {
  const result = resultFor(score);
  return {
    result,
    ...scorecardReportEmail({
      name: 'Priya',
      overall: result.overall,
      bandLabel: BAND_LABELS[result.band],
      dimensions: result.dimensions.map((d) => ({
        label: d.label,
        score: d.score,
        band: d.band,
        recommendation: d.recommendation,
      })),
    }),
  };
}

describe('scorecardReportEmail', () => {
  it('puts the score in the subject so it is visible in the inbox list', () => {
    expect(render(0).subject).toBe('Your marketing health score: 0/100');
    expect(render(3).subject).toBe('Your marketing health score: 100/100');
  });

  it('addresses the recipient by name', () => {
    expect(render(1).html).toContain('Hi Priya');
  });

  it('includes every dimension and its recommendation', () => {
    const { html, result } = render(1);
    for (const d of result.dimensions) {
      expect(html, `missing label ${d.label}`).toContain(d.label);
      expect(html, `missing advice for ${d.label}`).toContain(d.recommendation);
    }
  });

  it('marks the weakest dimension as the one to fix first', () => {
    const { html } = render(1);
    expect(html).toContain('Fix this first');
    // The badge must appear before the second dimension's label, i.e. it is
    // attached to the first card rather than floating anywhere in the doc.
    const { result } = render(1);
    expect(html.indexOf('Fix this first')).toBeLessThan(
      html.indexOf(result.dimensions[1].label)
    );
  });

  it('emits a complete HTML document mail clients can render', () => {
    const { html } = render(2);
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('</html>');
    // Table-based layout only — flexbox and grid do not survive Outlook.
    expect(html).not.toMatch(/display:\s*(flex|grid)/);
  });

  it('keeps bar widths within 0-100% at both extremes', () => {
    for (const score of [0, 3] as const) {
      const widths = [...render(score).html.matchAll(/<table width="(\d+)%"/g)].map((m) =>
        Number(m[1])
      );
      for (const w of widths) {
        expect(w).toBeGreaterThanOrEqual(0);
        expect(w).toBeLessThanOrEqual(100);
      }
    }
  });

  it('does not leak an undefined band colour into the markup', () => {
    // A band the colour map does not know must fall back, not render
    // "background:undefined" into a paying customer's inbox.
    const html = scorecardReportEmail({
      name: 'Test',
      overall: 50,
      bandLabel: 'Patchy',
      dimensions: [
        { label: 'Made Up', score: 50, band: 'not_a_real_band', recommendation: 'Do a thing.' },
      ],
    }).html;
    expect(html).not.toContain('undefined');
  });
});
