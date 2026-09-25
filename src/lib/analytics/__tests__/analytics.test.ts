import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { track, academyEcommerce, contactMethodFor, ANALYTICS_EVENT_NAMES } from '../events';
import {
  CONSENT_KEY,
  CONSENT_REQUIRED_REGIONS,
  gtmBootstrap,
  isValidContainerId,
  readConsent,
  saveConsent,
} from '../consent';

/** gtag pushes `arguments` objects; normalise everything to arrays or plain objects. */
function layer(): unknown[] {
  return (window.dataLayer ?? []).map((entry) =>
    Object.prototype.toString.call(entry) === '[object Arguments]'
      ? Array.from(entry as unknown as ArrayLike<unknown>)
      : entry
  );
}

function memoryStore(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  };
}

beforeEach(() => {
  delete window.dataLayer;
  window.localStorage.clear();
});

describe('track', () => {
  it('clears ecommerce before every event so items never leak between events', () => {
    track({ event: 'contact_click', method: 'whatsapp', link_location: '/contact' });
    expect(layer()).toEqual([
      { ecommerce: null },
      { event: 'contact_click', method: 'whatsapp', link_location: '/contact' },
    ]);
  });

  it('trims and caps search terms', () => {
    track({ event: 'search', search_term: `  ${'x'.repeat(300)}  ` });
    const pushed = layer()[1] as { search_term: string };
    expect(pushed.search_term).toHaveLength(100);
  });

  it('never throws, even when the dataLayer is unusable', () => {
    Object.defineProperty(window, 'dataLayer', {
      configurable: true,
      get: () => ({ push: () => { throw new Error('blocked'); } }),
    });
    expect(() => track({ event: 'talent_apply' })).not.toThrow();
    // Restore a normal property for the other tests.
    Object.defineProperty(window, 'dataLayer', { configurable: true, writable: true, value: undefined });
  });
});

describe('academyEcommerce', () => {
  const program = { id: 'prog-1', title: 'Creator Program', amountInr: 4999 };

  it('builds a GA4 item in rupees', () => {
    expect(academyEcommerce(program)).toEqual({
      currency: 'INR',
      value: 4999,
      items: [{ item_id: 'prog-1', item_name: 'Creator Program', item_category: 'academy', price: 4999, quantity: 1 }],
    });
  });

  it('adds the transaction id for a purchase', () => {
    expect(academyEcommerce(program, 'order_abc').transaction_id).toBe('order_abc');
  });
});

describe('contactMethodFor', () => {
  it.each([
    ['https://wa.me/916268112515', 'whatsapp'],
    ['https://wa.me/916268112515?text=Hi', 'whatsapp'],
    ['https://api.whatsapp.com/send?phone=1', 'whatsapp'],
    ['mailto:freakingmindsdigital@gmail.com', 'email'],
    ['/contact', null],
    ['https://example.com/wa.me/1', null],
  ])('%s -> %s', (href, expected) => {
    expect(contactMethodFor(href)).toBe(expected);
  });
});

describe('consent', () => {
  it('reads only the two valid choices', () => {
    expect(readConsent(memoryStore({ [CONSENT_KEY]: 'granted' }))).toBe('granted');
    expect(readConsent(memoryStore({ [CONSENT_KEY]: 'denied' }))).toBe('denied');
    expect(readConsent(memoryStore({ [CONSENT_KEY]: 'accepted' }))).toBeNull();
    expect(readConsent(memoryStore())).toBeNull();
  });

  it('saves the choice and sends a gtag consent update as an arguments object', () => {
    const store = memoryStore();
    saveConsent(store, 'denied');
    expect(store.data[CONSENT_KEY]).toBe('denied');
    expect(Object.prototype.toString.call(window.dataLayer![0])).toBe('[object Arguments]');
    expect(layer()).toEqual([
      [
        'consent',
        'update',
        { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' },
      ],
    ]);
  });

  it('validates container ids', () => {
    expect(isValidContainerId('GTM-ABC1234')).toBe(true);
    expect(isValidContainerId('G-WRBTEE11SH')).toBe(false);
    expect(isValidContainerId('gtm-abc1234')).toBe(false);
    expect(isValidContainerId(undefined)).toBe(false);
  });
});

describe('gtmBootstrap', () => {
  function run(stored?: string) {
    if (stored) window.localStorage.setItem(CONSENT_KEY, stored);
    document.head.innerHTML = '<script></script>';
    new Function(gtmBootstrap('GTM-TEST123'))();
  }

  it('sets regional defaults, then applies a stored choice, all before GTM starts', () => {
    run('denied');
    const entries = layer();
    const [regional, global, update, start] = entries as [unknown[], unknown[], unknown[], Record<string, unknown>];

    expect(regional[0]).toBe('consent');
    expect(regional[1]).toBe('default');
    expect(regional[2]).toMatchObject({ analytics_storage: 'denied', region: [...CONSENT_REQUIRED_REGIONS] });

    expect(global).toEqual([
      'consent',
      'default',
      { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' },
    ]);

    expect(update).toEqual([
      'consent',
      'update',
      { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' },
    ]);

    expect(start.event).toBe('gtm.js');
    expect(entries).toHaveLength(4);
  });

  it('sends no update when there is no stored choice', () => {
    run();
    expect(layer()).toHaveLength(3);
  });

  it('loads the named container', () => {
    run();
    const script = document.head.querySelector('script[src]');
    expect(script?.getAttribute('src')).toBe('https://www.googletagmanager.com/gtm.js?id=GTM-TEST123');
  });

  it('covers the EEA, the UK and Switzerland', () => {
    expect(CONSENT_REQUIRED_REGIONS).toContain('GB');
    expect(CONSENT_REQUIRED_REGIONS).toContain('CH');
    expect(CONSENT_REQUIRED_REGIONS).toContain('DE');
    expect(CONSENT_REQUIRED_REGIONS).not.toContain('IN');
  });
});

describe('GTM container file', () => {
  const container = JSON.parse(
    readFileSync(join(process.cwd(), 'docs/analytics/gtm-container.json'), 'utf8')
  );

  it('fires on exactly the events the site sends', () => {
    const trigger = container.containerVersion.trigger[0];
    const pattern: string = trigger.customEventFilter[0].parameter[1].value;
    const listed = pattern.replace(/^\^\(|\)\$$/g, '').split('|').sort();
    expect(listed).toEqual([...ANALYTICS_EVENT_NAMES].sort());
  });

  it('points at the production GA4 property', () => {
    const id = container.containerVersion.variable.find((v: { name: string }) => v.name === 'GA4 Measurement ID');
    expect(id.parameter[0].value).toBe('G-WRBTEE11SH');
  });
});
