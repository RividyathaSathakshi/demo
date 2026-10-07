import { describe, expect, it } from 'vitest';
import { computeCycle, dayInfo, phaseRanges } from './cycle';
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
    expect(c.phase).toBe('follicular');
    expect(c.inFertileWindow).toBe(true);
  });

  it('predicts all four phases across a cycle', () => {
    const c = computeCycle(profile, [], '2026-03-01')!;
    expect(phaseRanges(c.window).map((r) => [r.phase, r.startDay, r.endDay])).toEqual([
      ['menstrual', 1, 5],
      ['follicular', 6, 13],
      ['ovulation', 14, 16],
      ['luteal', 17, 28],
    ]);
    expect(dayInfo('2026-03-03', profile, ['2026-03-01']).phase).toBe('menstrual');
    expect(dayInfo('2026-03-15', profile, ['2026-03-01']).phase).toBe('ovulation');
    expect(dayInfo('2026-03-20', profile, ['2026-03-01']).phase).toBe('luteal');
    // The next cycle is projected, so its period is predicted.
    expect(dayInfo('2026-03-30', profile, ['2026-03-01']).period).toBe('predicted');
  });

  it('uses the real length of a cycle between two logged periods', () => {
    const p = { ...profile, lastPeriodDate: '2026-04-01' };
    const d = dayInfo('2026-03-20', p, ['2026-03-01', '2026-04-01']);
    expect(d.cycleDay).toBe(20);
    // 31-day cycle: ovulation on day 18, so day 20 is luteal.
    expect(d.phase).toBe('luteal');
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
