import { describe, it, expect } from 'vitest';
import { bandsFor, findBand, PRICING_MODELS, toPricingInfo } from '../pricing-bands';
import { COUNTRIES, countryFromHeaders, DEFAULT_COUNTRY, localeFor } from '../locale';

describe('pricing bands', () => {
  it('gives a different scale per model — an hourly range is not a retainer range', () => {
    // The old form asked for min/max against all three against one scale,
    // which is why its numbers never meant anything.
    const hourly = bandsFor('hourly', 'INR');
    const retainer = bandsFor('retainer', 'INR');
    expect(hourly[0].max).not.toBe(retainer[0].max);
  });

  it('gives rupee bands to India and dollar bands to everyone else', () => {
    expect(bandsFor('project', 'INR')[0].label).toContain('₹');
    expect(bandsFor('project', 'USD')[0].label).toContain('$');
  });

  it('ends every scale open at the top', () => {
    for (const model of PRICING_MODELS) {
      for (const currency of ['INR', 'USD']) {
        const bands = bandsFor(model.id, currency);
        expect(bands[bands.length - 1].max).toBeNull();
      }
    }
  });

  it('leaves no gaps or overlaps in a scale', () => {
    // A gap means a real rate that cannot be selected.
    for (const model of PRICING_MODELS) {
      for (const currency of ['INR', 'USD']) {
        const bands = bandsFor(model.id, currency);
        bands.slice(0, -1).forEach((band, i) => {
          expect(band.max).toBe(bands[i + 1].min);
        });
      }
    }
  });

  it('finds a band by id, and refuses one from another scale', () => {
    expect(findBand('project', 'INR', 'p3')).not.toBeNull();
    // `h1` belongs to the hourly scale.
    expect(findBand('project', 'INR', 'h1')).toBeNull();
  });
});

describe('toPricingInfo', () => {
  it('fills only the model chosen, leaving the others at zero', () => {
    const band = findBand('project', 'INR', 'p3')!;
    const pricing = toPricingInfo('project', band);

    expect(pricing.projectRate).toEqual({ min: 25000, max: 50000 });
    expect(pricing.hourlyRate).toEqual({ min: 0, max: 0 });
    expect(pricing.retainerRate).toEqual({ min: 0, max: 0 });
  });

  it('writes an open-ended band as a zero maximum, which every reader treats as absent', () => {
    const band = findBand('project', 'INR', 'p6')!;
    expect(toPricingInfo('project', band).projectRate).toEqual({ min: 300000, max: 0 });
  });

  it('keeps the shape the admin grid and public profile already read', () => {
    const pricing = toPricingInfo('hourly', findBand('hourly', 'USD', 'h2')!);
    expect(Object.keys(pricing).sort()).toEqual(
      ['hourlyRate', 'openToNegotiation', 'projectRate', 'retainerRate'].sort()
    );
  });
});

describe('country locale', () => {
  it('derives currency and dial code from the country', () => {
    expect(localeFor('IN')).toMatchObject({ dialCode: '+91', currency: 'INR' });
    expect(localeFor('GB')).toMatchObject({ dialCode: '+44', currency: 'GBP' });
  });

  it('falls back rather than guessing for a country we do not list', () => {
    // Someone in Kenya is still welcome; a wrong currency would be worse.
    expect(localeFor('KE').code).toBe(DEFAULT_COUNTRY);
    expect(localeFor(null).code).toBe(DEFAULT_COUNTRY);
    expect(localeFor(undefined).code).toBe(DEFAULT_COUNTRY);
  });

  it('is case-insensitive about the header', () => {
    expect(localeFor('gb').currency).toBe('GBP');
  });

  it('reads the country Vercel attached, and ignores one we do not know', () => {
    expect(countryFromHeaders(new Headers({ 'x-vercel-ip-country': 'GB' }))).toBe('GB');
    expect(countryFromHeaders(new Headers({ 'x-vercel-ip-country': 'ZZ' }))).toBe(DEFAULT_COUNTRY);
    expect(countryFromHeaders(new Headers())).toBe(DEFAULT_COUNTRY);
  });

  it('gives every listed country a currency with bands behind it', () => {
    for (const country of COUNTRIES) {
      expect(bandsFor('project', country.currency).length).toBeGreaterThan(0);
    }
  });
});
