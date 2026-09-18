import { describe, it, expect } from 'vitest';
import {
  generateSalesId,
  isSalesSource,
  SALES_SOURCES,
  STAGES_BEYOND_CONTACTED,
} from '../types';

describe('generateSalesId', () => {
  it('builds prefix_base36time_random ids', () => {
    expect(generateSalesId('act')).toMatch(/^act_[0-9a-z]+_[0-9a-z]{1,5}$/);
  });

  it('does not repeat across rapid calls', () => {
    const ids = new Set(Array.from({ length: 200 }, () => generateSalesId('t')));
    expect(ids.size).toBe(200);
  });
});

describe('isSalesSource', () => {
  it('accepts every declared source', () => {
    for (const source of SALES_SOURCES) expect(isSalesSource(source)).toBe(true);
  });

  it('rejects unknown values', () => {
    expect(isSalesSource('tiktok')).toBe(false);
    expect(isSalesSource(undefined)).toBe(false);
    expect(isSalesSource(42)).toBe(false);
  });
});

describe('STAGES_BEYOND_CONTACTED', () => {
  it('excludes new and contacted, includes discovery_scheduled', () => {
    expect(STAGES_BEYOND_CONTACTED).not.toContain('new');
    expect(STAGES_BEYOND_CONTACTED).not.toContain('contacted');
    expect(STAGES_BEYOND_CONTACTED).toContain('discovery_scheduled');
  });
});
