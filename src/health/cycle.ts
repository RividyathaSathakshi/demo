/**
 * Calendar-based cycle estimates. These are population-average estimates:
 * ovulation ~14 days before the next period; the fertile window is the 5 days
 * before ovulation plus the day of ovulation. A recorded LH surge refines the
 * cycle it falls in. They are wellness estimates, not predictions suitable for
 * contraception or medical decisions.
 *
 * Four phases are predicted for every day:
 *   menstrual   days 1 .. period length
 *   follicular  after the period until the ovulation phase
 *   ovulation   the day before, of, and after estimated ovulation
 *   luteal      after the ovulation phase until the next period
 */
import { addDays, diffDays, isoToDateKey } from './dates';
import type { OpkRecord, Profile, TestRecord } from '../store/types';

export type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';
export const CYCLE_PHASES: CyclePhase[] = ['menstrual', 'follicular', 'ovulation', 'luteal'];

export interface CycleWindow {
  /** First day of the cycle (YYYY-MM-DD). */
  start: string;
  length: number;
  periodLength: number;
  /** 1-based cycle day of estimated ovulation. */
  ovulationDay: number;
  /** True when this cycle is projected forward rather than started by a logged period. */
  projected: boolean;
  refinedByLh: boolean;
  surgeDate: string | null;
}

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
  phase: CyclePhase;
  inFertileWindow: boolean;
  window: CycleWindow;
}

export interface PhaseRange {
  phase: CyclePhase;
  startDay: number;
  endDay: number;
  start: string;
  end: string;
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

function allStarts(profile: Profile, periodStarts: string[]): string[] {
  const set = new Set(periodStarts);
  if (profile.lastPeriodDate) set.add(profile.lastPeriodDate);
  return [...set].sort();
}

function surgeIn(records: TestRecord[], start: string, length: number): string | null {
  return (
    records
      .filter((r): r is OpkRecord => r.type === 'opk' && r.category === 'peak')
      .map((r) => isoToDateKey(r.createdAt))
      .filter((d) => diffDays(d, start) >= 0 && diffDays(d, start) < length)
      .sort()[0] ?? null
  );
}

/** The cycle (logged or projected) that contains `date`, or null without period data. */
export function cycleFor(date: string, profile: Profile | null, periodStarts: string[], records: TestRecord[] = []): CycleWindow | null {
  if (!profile) return null;
  const starts = allStarts(profile, periodStarts);
  if (!starts.length || date < starts[0]) return null;
  const avg = Math.min(45, Math.max(18, averageCycleLength(starts, profile.cycleLength)));
  let idx = 0;
  for (let i = 0; i < starts.length; i++) if (starts[i] <= date) idx = i;
  let start = starts[idx];
  let length = avg;
  let projected = false;
  const next = starts[idx + 1];
  if (next) {
    const actual = diffDays(next, start);
    length = actual >= 15 && actual <= 60 ? actual : avg;
  } else {
    const k = Math.floor(diffDays(date, start) / avg);
    if (k > 0) {
      start = addDays(start, k * avg);
      projected = true;
    }
  }
  const periodLength = Math.min(profile.periodLength, length - 4);
  let ovulationDay = Math.max(periodLength + 2, length - 13);
  const surge = surgeIn(records, start, length);
  // Ovulation commonly follows an LH surge within about 12-36 hours.
  if (surge) ovulationDay = Math.min(length - 2, diffDays(surge, start) + 2);
  return { start, length, periodLength, ovulationDay, projected, refinedByLh: !!surge, surgeDate: surge };
}

export function phaseOfDay(day: number, w: Pick<CycleWindow, 'periodLength' | 'ovulationDay'>): CyclePhase {
  if (day <= w.periodLength) return 'menstrual';
  if (day >= w.ovulationDay - 1 && day <= w.ovulationDay + 1) return 'ovulation';
  if (day < w.ovulationDay - 1) return 'follicular';
  return 'luteal';
}

export function phaseRanges(w: CycleWindow): PhaseRange[] {
  const ranges: [CyclePhase, number, number][] = [
    ['menstrual', 1, w.periodLength],
    ['follicular', w.periodLength + 1, w.ovulationDay - 2],
    ['ovulation', Math.max(w.periodLength + 1, w.ovulationDay - 1), w.ovulationDay + 1],
    ['luteal', w.ovulationDay + 2, w.length],
  ];
  return ranges
    .filter(([, a, b]) => b >= a)
    .map(([phase, a, b]) => ({ phase, startDay: a, endDay: b, start: addDays(w.start, a - 1), end: addDays(w.start, b - 1) }));
}

export function computeCycle(profile: Profile | null, records: TestRecord[], today: string, periodStarts: string[] = []): CycleInfo | null {
  const w = cycleFor(today, profile, periodStarts, records);
  if (!w) return null;
  const cycleDay = diffDays(today, w.start) + 1;
  const nextPeriod = addDays(w.start, w.length);
  const ovulation = addDays(w.start, w.ovulationDay - 1);
  const fertileStart = addDays(ovulation, -5);
  const fertileEnd = addDays(ovulation, 1);
  return {
    cycleStart: w.start,
    cycleDay,
    cycleLength: w.length,
    nextPeriod,
    daysUntilNextPeriod: diffDays(nextPeriod, today),
    ovulation,
    fertileStart,
    fertileEnd,
    refinedByLh: w.refinedByLh,
    surgeDate: w.surgeDate,
    phase: phaseOfDay(cycleDay, w),
    inFertileWindow: diffDays(today, fertileStart) >= 0 && diffDays(fertileEnd, today) >= 0,
    window: w,
  };
}

export interface DayInfo {
  period: 'logged' | 'predicted' | null;
  phase: CyclePhase | null;
  cycleDay: number | null;
  fertile: boolean;
  ovulation: boolean;
}

/** Phase, period and fertile-window predictions for any date (calendar view). */
export function dayInfo(date: string, profile: Profile | null, periodStarts: string[], records: TestRecord[] = []): DayInfo {
  const w = cycleFor(date, profile, periodStarts, records);
  if (!w) return { period: null, phase: null, cycleDay: null, fertile: false, ovulation: false };
  const day = diffDays(date, w.start) + 1;
  const phase = phaseOfDay(day, w);
  return {
    period: phase === 'menstrual' ? (w.projected ? 'predicted' : 'logged') : null,
    phase,
    cycleDay: day,
    fertile: day >= w.ovulationDay - 5 && day <= w.ovulationDay + 1,
    ovulation: day === w.ovulationDay,
  };
}

/** Suggested first day of ovulation testing: about 17 days before the next period. */
export function opkStartDate(cycle: CycleInfo): string {
  return addDays(cycle.cycleStart, Math.max(cycle.window.periodLength, cycle.cycleLength - 17));
}
