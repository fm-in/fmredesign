import { describe, it, expect } from 'vitest';
import { captureFirstTouch, FIRST_TOUCH_KEY, parseAttribution, readFirstTouch, type KeyValueStore } from '../attribution';

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { values: Map<string, string> } {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

describe('parseAttribution', () => {
  it('reads UTM parameters, click ids and the landing path', () => {
    expect(
      parseAttribution(
        'https://www.freakingminds.in/services?utm_source=google&utm_medium=cpc&utm_campaign=seo-pune&gclid=g1&fbclid=f1',
        ''
      )
    ).toEqual({
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'seo-pune',
      gclid: 'g1',
      fbclid: 'f1',
      landingPage: '/services',
    });
  });

  it('keeps an external referrer and drops an internal one', () => {
    expect(parseAttribution('https://www.freakingminds.in/', 'https://www.linkedin.com/feed/?x=1').referrer).toBe(
      'https://www.linkedin.com/feed/'
    );
    expect(parseAttribution('https://www.freakingminds.in/', 'https://www.freakingminds.in/work').referrer).toBeUndefined();
    expect(parseAttribution('https://www.freakingminds.in/', 'not a url').referrer).toBeUndefined();
  });
});

describe('first touch', () => {
  it('records only the first visit', () => {
    const store = memoryStore();
    captureFirstTouch(store, 'https://www.freakingminds.in/?utm_source=meta', '');
    captureFirstTouch(store, 'https://www.freakingminds.in/?utm_source=google', '');
    expect(readFirstTouch(store)?.utmSource).toBe('meta');
  });

  it('ignores junk in storage', () => {
    expect(readFirstTouch(memoryStore({ [FIRST_TOUCH_KEY]: 'not json' }))).toBeUndefined();
    expect(readFirstTouch(memoryStore({ [FIRST_TOUCH_KEY]: '{"utmSource": 42}' }))).toEqual({});
  });
});
