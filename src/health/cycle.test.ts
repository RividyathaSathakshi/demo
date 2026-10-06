import { describe, expect, it } from 'vitest';
import { computeCycle } from './cycle';
import type { Profile } from '../store/types';

const profile: Profile = { tracking: 'both', age: 30, lastPeriodDate: '2026-03-01', cycleLength: 28, periodLength: 5, goal: 'general' };

describe('cycle estimates', () => {
  it('computes cycle day, next period and fertile window', () => {
    const c = computeCycle(profile, [], '2026-03-10')!;
    expect(c.cycleDay).toBe(10);
    expect(c.nextPeriod).toBe('2026-03-29');
    expect(c.ovulation).toBe('2026-03-15');
    expect(c.fertileStart).toBe('2026-03-10');
    expect(c.fertileEnd).toBe('2026-03-16');
    expect(c.phase).toBe('fertile');
  });

  it('projects forward when the last period was several cycles ago', () => {
    const c = computeCycle(profile, [], '2026-04-02')!;
    expect(c.cycleStart).toBe('2026-03-29');
    expect(c.cycleDay).toBe(5);
  });

  it('refines ovulation with a recorded LH surge', () => {
    const c = computeCycle(
      profile,
      [{ id: 'a', type: 'opk', createdAt: new Date(2026, 2, 12, 9).toISOString(), source: 'manual', productId: 'opk-standard', ratio: 1.2, category: 'peak' }],
      '2026-03-12',
    )!;
    expect(c.refinedByLh).toBe(true);
    expect(c.ovulation).toBe('2026-03-13');
  });
});
