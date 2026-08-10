import { describe, it, expect } from 'vitest';
import { DIMENSIONS, QUESTIONS, RECOMMENDATIONS } from '../questions';
import { bandFor, isComplete, scoreDimension, scoreScorecard } from '../scoring';
import type { AnswerMap, Band } from '../types';

/** Build an answer map picking the option with the given score everywhere. */
function answersScoring(score: 0 | 1 | 2 | 3): AnswerMap {
  const map: AnswerMap = {};
  for (const q of QUESTIONS) {
    const opt = q.options.find((o) => o.score === score);
    if (opt) map[q.id] = opt.value;
  }
  return map;
}

const ALL_BANDS: Band[] = ['at_risk', 'patchy', 'solid', 'strong'];

describe('question set integrity', () => {
  it('every question belongs to a declared dimension', () => {
    const ids = new Set(DIMENSIONS.map((d) => d.id));
    for (const q of QUESTIONS) expect(ids.has(q.dimension)).toBe(true);
  });

  it('every dimension has at least one question', () => {
    for (const d of DIMENSIONS) {
      expect(QUESTIONS.filter((q) => q.dimension === d.id).length).toBeGreaterThan(0);
    }
  });

  it('question ids are unique', () => {
    const ids = QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('option values are unique within each question', () => {
    for (const q of QUESTIONS) {
      const values = q.options.map((o) => o.value);
      expect(new Set(values).size, `duplicate option in ${q.id}`).toBe(values.length);
    }
  });

  it('every question offers the full 0-3 range', () => {
    // Otherwise a dimension silently cannot reach 0 or 100 and the bands lie.
    for (const q of QUESTIONS) {
      expect(q.options.map((o) => o.score).sort(), `bad range in ${q.id}`).toEqual([0, 1, 2, 3]);
    }
  });

  it('every dimension has a recommendation for every band', () => {
    // This is the check that catches an edit to questions.ts that adds a
    // dimension but forgets the copy — the report would render blank advice.
    for (const d of DIMENSIONS) {
      for (const band of ALL_BANDS) {
        const copy = RECOMMENDATIONS[d.id]?.[band];
        expect(copy, `missing ${d.id}/${band}`).toBeTruthy();
      }
    }
  });

  it('stays short enough to actually finish', () => {
    expect(QUESTIONS.length).toBeLessThanOrEqual(12);
  });
});

describe('bandFor', () => {
  it('maps the boundaries exactly', () => {
    expect(bandFor(0)).toBe('at_risk');
    expect(bandFor(39)).toBe('at_risk');
    expect(bandFor(40)).toBe('patchy');
    expect(bandFor(59)).toBe('patchy');
    expect(bandFor(60)).toBe('solid');
    expect(bandFor(79)).toBe('solid');
    expect(bandFor(80)).toBe('strong');
    expect(bandFor(100)).toBe('strong');
  });
});

describe('scoreScorecard', () => {
  it('scores the worst possible answers as 0', () => {
    const r = scoreScorecard(answersScoring(0));
    expect(r.overall).toBe(0);
    expect(r.band).toBe('at_risk');
  });

  it('scores the best possible answers as 100', () => {
    const r = scoreScorecard(answersScoring(3));
    expect(r.overall).toBe(100);
    expect(r.band).toBe('strong');
  });

  it('reports every dimension regardless of answers given', () => {
    const r = scoreScorecard({});
    expect(r.dimensions).toHaveLength(DIMENSIONS.length);
  });

  it('orders dimensions worst-first so the report leads with the real problem', () => {
    const answers = answersScoring(3);
    // Make measurement the weak spot.
    for (const q of QUESTIONS.filter((q) => q.dimension === 'measurement')) {
      answers[q.id] = q.options.find((o) => o.score === 0)!.value;
    }
    const r = scoreScorecard(answers);
    expect(r.dimensions[0].id).toBe('measurement');
  });

  it('weights measurement above paid — a point lost there costs more', () => {
    const weakMeasurement = answersScoring(3);
    for (const q of QUESTIONS.filter((q) => q.dimension === 'measurement')) {
      weakMeasurement[q.id] = q.options.find((o) => o.score === 0)!.value;
    }
    const weakPaid = answersScoring(3);
    for (const q of QUESTIONS.filter((q) => q.dimension === 'paid')) {
      weakPaid[q.id] = q.options.find((o) => o.score === 0)!.value;
    }
    expect(scoreScorecard(weakMeasurement).overall).toBeLessThan(
      scoreScorecard(weakPaid).overall
    );
  });

  it('attaches the recommendation matching the band actually scored', () => {
    const r = scoreScorecard(answersScoring(0));
    const measurement = r.dimensions.find((d) => d.id === 'measurement')!;
    expect(measurement.band).toBe('at_risk');
    expect(measurement.recommendation).toBe(RECOMMENDATIONS.measurement.at_risk);
  });

  it('counts how many questions were answered', () => {
    const partial: AnswerMap = { [QUESTIONS[0].id]: QUESTIONS[0].options[0].value };
    const r = scoreScorecard(partial);
    expect(r.answered).toBe(1);
    expect(r.total).toBe(QUESTIONS.length);
  });
});

describe('hostile and partial input', () => {
  it('treats an unrecognised option value as unanswered, not as zero', () => {
    // A stale cached form or a tampered payload must not be able to
    // manufacture a bad diagnosis for someone.
    const q = QUESTIONS[0];
    const bogus: AnswerMap = { [q.id]: 'no-such-option' };
    expect(scoreDimension(q.dimension, bogus).answered).toBe(0);
    expect(isComplete(bogus)).toBe(false);
  });

  it('ignores answers to questions that do not exist', () => {
    const answers = { ...answersScoring(3), 'question-that-was-removed': 'whatever' };
    expect(scoreScorecard(answers).overall).toBe(100);
  });

  it('ignores non-string answer values', () => {
    const answers = { ...answersScoring(3) } as Record<string, unknown>;
    answers[QUESTIONS[0].id] = { nested: 'object' };
    const r = scoreScorecard(answers as AnswerMap);
    expect(r.answered).toBe(QUESTIONS.length - 1);
  });

  it('excludes unanswered dimensions from the average rather than scoring them 0', () => {
    // Answer only the foundation questions, perfectly.
    const answers: AnswerMap = {};
    for (const q of QUESTIONS.filter((q) => q.dimension === 'foundation')) {
      answers[q.id] = q.options.find((o) => o.score === 3)!.value;
    }
    // If unanswered dimensions counted as zero this would be ~17, not 100.
    expect(scoreScorecard(answers).overall).toBe(100);
  });

  it('does not divide by zero on an empty submission', () => {
    const r = scoreScorecard({});
    expect(r.overall).toBe(0);
    expect(Number.isNaN(r.overall)).toBe(false);
  });
});

describe('isComplete', () => {
  it('is true only when every question has a valid answer', () => {
    expect(isComplete(answersScoring(2))).toBe(true);
    const missingOne = answersScoring(2);
    delete missingOne[QUESTIONS[0].id];
    expect(isComplete(missingOne)).toBe(false);
  });
});
