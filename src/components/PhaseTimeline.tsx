import { useI18n } from '../i18n';
import { phaseRanges, type CycleWindow } from '../health/cycle';
import { diffDays } from '../health/dates';
import { PHASE_STROKE } from './CycleRing';

/** One cycle as a labelled bar of its four phases, with today and the fertile window marked. */
export function PhaseTimeline({ window: w, today, showAbout = true }: { window: CycleWindow; today?: string; showAbout?: boolean }) {
  const { t, formatDate } = useI18n();
  const ranges = phaseRanges(w);
  const fmt = (d: string) => formatDate(d, { day: 'numeric', month: 'short' });
  const todayDay = today ? diffDays(today, w.start) + 1 : null;
  const pct = (d: number) => `${((d - 1) / w.length) * 100}%`;
  const fs = Math.max(1, w.ovulationDay - 5);
  const fe = Math.min(w.length, w.ovulationDay + 1);
  return (
    <div>
      <div className="relative pt-6">
        {todayDay !== null && todayDay >= 1 && todayDay <= w.length && (
          <span className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-caption font-medium" style={{ left: `calc(${pct(todayDay)} + ${100 / w.length / 2}%)` }}>
            {t('cycle.youAreHere')}
          </span>
        )}
        <div className="flex h-4 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
          {ranges.map((r) => (
            <span key={r.phase} style={{ flexGrow: r.endDay - r.startDay + 1, flexBasis: 0, background: PHASE_STROKE[r.phase] }} />
          ))}
        </div>
        <div className="relative mt-1 h-2" aria-hidden="true">
          <span className="absolute h-1.5 rounded-full border-2 border-dashed border-gold" style={{ left: pct(fs), width: `${((fe - fs + 1) / w.length) * 100}%` }} />
        </div>
        {todayDay !== null && todayDay >= 1 && todayDay <= w.length && (
          <span aria-hidden="true" className="absolute top-5 h-6 w-1 -translate-x-1/2 rounded-full bg-ink" style={{ left: `calc(${pct(todayDay)} + ${100 / w.length / 2}%)` }} />
        )}
      </div>
      <ol className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ranges.map((r) => {
          const current = todayDay !== null && todayDay >= r.startDay && todayDay <= r.endDay;
          return (
            <li key={r.phase} className={`rounded-xl border p-3 ${current ? 'border-ink bg-panel-alt/60' : ''}`}>
              <p className="flex items-center gap-2 font-medium">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: PHASE_STROKE[r.phase] }} aria-hidden="true" />
                {t(`cycle.phase.${r.phase}`)}
                {current && <span className="ml-auto rounded-full bg-ink px-2 py-0.5 text-caption text-bg">{t('cycle.youAreHere')}</span>}
              </p>
              <p className="mt-1 text-label tabular-nums">{t('cycle.range', { start: fmt(r.start), end: fmt(r.end) })}</p>
              <p className="text-caption text-muted">{t('cycle.dayRange', { a: r.startDay, b: r.endDay })}</p>
              {showAbout && <p className="mt-1.5 text-caption text-ink/80">{t(`cycle.phaseAbout.${r.phase}`)}</p>}
            </li>
          );
        })}
      </ol>
      {w.projected && <p className="mt-2 text-caption text-muted">{t('cycle.projectedNote', { n: w.length })}</p>}
    </div>
  );
}
