/**
 * Calendar-based cycle estimates. These are population-average estimates
 * (ovulation ~14 days before the next period; fertile window = the 5 days
 * before ovulation plus the day of ovulation), refined by a recent LH surge
 * when one has been recorded. They are wellness estimates, not predictions
 * suitable for contraception or medical decisions.
 */
import { addDays, diffDays, isoToDateKey } from './dates';
import type { OpkRecord, Profile, TestRecord } from '../store/types';

export interface CycleInfo {
  cycleStart: string;
  cycleDay: number;
  cycleLength: number;
  nextPeriod: string;
  daysUntilNextPeriod: number;
  ovulation: string;
  fertileStart: string;
  fertileEnd: string;
  /** Whether the estimate was refined by a recorded LH surge in this cycle. */
  refinedByLh: boolean;
  surgeDate: string | null;
  phase: 'period' | 'follicular' | 'fertile' | 'luteal';
}

export function averageCycleLength(periodStarts: string[], fallback: number): number {
  if (periodStarts.length < 2) return fallback;
  const lens: number[] = [];
  for (let i = 1; i < periodStarts.length; i++) {
    const d = diffDays(periodStarts[i], periodStarts[i - 1]);
    if (d >= 18 && d <= 45) lens.push(d);
  }
  if (!lens.length) return fallback;
  return Math.round(lens.reduce((a, b) => a + b, 0) / lens.length);
}

export function computeCycle(profile: Profile | null, records: TestRecord[], today: string, periodStarts: string[] = []): CycleInfo | null {
  if (!profile?.lastPeriodDate) return null;
  const cycleLength = Math.min(45, Math.max(18, averageCycleLength(periodStarts, profile.cycleLength)));
  const elapsed = diffDays(today, profile.lastPeriodDate);
  // Project forward if the logged period is more than one cycle ago.
  const cyclesPassed = elapsed >= 0 ? Math.floor(elapsed / cycleLength) : 0;
  const cycleStart = addDays(profile.lastPeriodDate, cyclesPassed * cycleLength);
  const cycleDay = diffDays(today, cycleStart) + 1;
  const nextPeriod = addDays(cycleStart, cycleLength);
  let ovulation = addDays(nextPeriod, -14);

  const surge = records
    .filter((r): r is OpkRecord => r.type === 'opk' && r.category === 'peak')
    .map((r) => isoToDateKey(r.createdAt))
    .filter((d) => diffDays(d, cycleStart) >= 0 && diffDays(nextPeriod, d) > 0)
    .sort()[0] ?? null;
  // Ovulation commonly follows an LH surge within about 12-36 hours.
  if (surge) ovulation = addDays(surge, 1);

  const fertileStart = addDays(ovulation, -5);
  const fertileEnd = addDays(ovulation, 1);
  let phase: CycleInfo['phase'] = 'luteal';
  if (cycleDay <= profile.periodLength) phase = 'period';
  else if (diffDays(today, fertileStart) >= 0 && diffDays(fertileEnd, today) >= 0) phase = 'fertile';
  else if (diffDays(fertileStart, today) > 0) phase = 'follicular';

  return {
    cycleStart,
    cycleDay,
    cycleLength,
    nextPeriod,
    daysUntilNextPeriod: diffDays(nextPeriod, today),
    ovulation,
    fertileStart,
    fertileEnd,
    refinedByLh: !!surge,
    surgeDate: surge,
    phase,
  };
}

/** Period / fertile-window predictions for an arbitrary date (calendar view). */
export function dayMarkers(
  date: string,
  profile: Profile | null,
  periodStarts: string[],
): { period: 'logged' | 'predicted' | null; fertile: boolean; ovulation: boolean } {
  const out = { period: null as 'logged' | 'predicted' | null, fertile: false, ovulation: false };
  if (!profile) return out;
  const periodLength = profile.periodLength;
  for (const s of periodStarts) {
    const d = diffDays(date, s);
    if (d >= 0 && d < periodLength) out.period = 'logged';
  }
  const anchor = periodStarts[periodStarts.length - 1] ?? profile.lastPeriodDate;
  if (!anchor) return out;
  const cycleLength = averageCycleLength(periodStarts, profile.cycleLength);
  const offset = diffDays(date, anchor);
  if (offset < 0) return out;
  const k = Math.floor(offset / cycleLength);
  const start = addDays(anchor, k * cycleLength);
  const dayInCycle = diffDays(date, start);
  if (!out.period && k >= 1 && dayInCycle < periodLength) out.period = 'predicted';
  const ovu = cycleLength - 14;
  if (dayInCycle >= ovu - 5 && dayInCycle <= ovu + 1) out.fertile = true;
  if (dayInCycle === ovu) out.ovulation = true;
  return out;
}
