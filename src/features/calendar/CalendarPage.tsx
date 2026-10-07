import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { Button, Disclaimer } from '../../components/ui';
import { Icon, type IconName } from '../../components/Icon';
import { LhTrendChart, UrineTrends } from '../../components/charts';
import { PhaseTimeline } from '../../components/PhaseTimeline';
import { PHASE_STROKE } from '../../components/CycleRing';
import { logPeriodStart, removePeriodStart, sortedRecords, useAppState } from '../../store/store';
import type { OpkRecord, TestRecord, UrineRecord } from '../../store/types';
import { averageCycleLength, cycleFor, dayInfo, CYCLE_PHASES, type DayInfo } from '../../health/cycle';
import { isoToDateKey, toDateKey, todayKey } from '../../health/dates';
import { HistoryRow } from '../dashboard/Dashboard';

interface CalendarDay extends DayInfo {
  key: string;
  inMonth: boolean;
  records: TestRecord[];
  important: boolean;
}

/** Cell tints per phase (text stays ink; the phase is also named in the label and day panel). */
const PHASE_BG: Record<string, string> = {
  menstrual: 'bg-rose/20',
  follicular: 'bg-success/10',
  ovulation: 'bg-gold/20',
  luteal: 'bg-muted/10',
};

export default function CalendarPage() {
  const { t, formatDate } = useI18n();
  const state = useAppState();
  const today = todayKey();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selected, setSelected] = useState(today);

  const byDay = useMemo(() => {
    const map = new Map<string, TestRecord[]>();
    for (const r of state.records) {
      const k = isoToDateKey(r.createdAt);
      map.set(k, [...(map.get(k) ?? []), r]);
    }
    return map;
  }, [state.records]);

  const infoFor = (key: string): CalendarDay => {
    const records = byDay.get(key) ?? [];
    return {
      key,
      inMonth: true,
      ...dayInfo(key, state.profile, state.periodStarts, state.records),
      records,
      important: records.some((r) => (r.type === 'opk' ? r.category === 'peak' : r.overall === 'flagged')),
    };
  };

  const days: CalendarDay[] = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const offset = (first.getDay() + 6) % 7; // Monday first
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(cursor.y, cursor.m, 1 - offset + i);
      return { ...infoFor(toDateKey(d)), inMonth: d.getMonth() === cursor.m };
    });
  }, [cursor, state.profile, state.periodStarts, state.records, byDay]);

  const weekdays = useMemo(() => Array.from({ length: 7 }, (_, i) => formatDate(new Date(2024, 0, 1 + i), { weekday: 'short' })), [formatDate]);
  const monthLabel = formatDate(new Date(cursor.y, cursor.m, 1), { month: 'long', year: 'numeric' });
  const move = (delta: number) =>
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const monthRecords = state.records.filter((r) => {
    const d = new Date(r.createdAt);
    return d.getFullYear() === cursor.y && d.getMonth() === cursor.m;
  });
  const sel = infoFor(selected);
  const selCycle = cycleFor(selected, state.profile, state.periodStarts, state.records);
  const isLoggedStart = state.periodStarts.includes(selected);
  const avg = state.periodStarts.length >= 2 ? averageCycleLength(state.periodStarts, state.profile?.cycleLength ?? 28) : null;

  const describe = (d: CalendarDay) => {
    const parts = [formatDate(d.key, { weekday: 'long', day: 'numeric', month: 'long' })];
    if (d.phase) parts.push(t('calendar.legend.' + (d.phase === 'ovulation' ? 'ovulationPhase' : d.phase) as 'calendar.legend.luteal'));
    if (d.period === 'logged') parts.push(t('calendar.legend.period'));
    if (d.period === 'predicted') parts.push(t('calendar.legend.predicted'));
    if (d.fertile) parts.push(t('calendar.legend.fertile'));
    if (d.ovulation) parts.push(t('calendar.legend.ovulation'));
    if (d.records.some((r) => r.type === 'opk')) parts.push(t('calendar.legend.opk'));
    if (d.records.some((r) => r.type === 'urine')) parts.push(t('calendar.legend.urine'));
    if (d.important) parts.push(t('calendar.legend.important'));
    return parts.join(', ');
  };

  return (
    <div className="container-page py-8 sm:py-10">
      <h1 className="text-h1">{t('calendar.title')}</h1>
      <p className="mt-1 text-muted">{t('calendar.lead')}</p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <section aria-label={monthLabel}>
          <div className="mb-3 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => move(-1)} aria-label={t('calendar.prev')}>
              <Icon name="chevronLeft" size={22} />
            </Button>
            <h2 className="text-h3" aria-live="polite">{monthLabel}</h2>
            <Button variant="ghost" size="sm" onClick={() => move(1)} aria-label={t('calendar.next')}>
              <Icon name="chevronRight" size={22} />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-caption text-muted" aria-hidden="true">
            {weekdays.map((w) => (
              <span key={w} className="py-1">{w}</span>
            ))}
          </div>
          <ul className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const isToday = d.key === today;
              const isSel = d.key === selected;
              return (
                <li key={d.key}>
                  <button
                    type="button"
                    onClick={() => setSelected(d.key)}
                    aria-pressed={isSel}
                    aria-label={describe(d)}
                    className={`relative flex aspect-square w-full flex-col items-center justify-start overflow-hidden rounded-lg p-1 text-label transition-colors sm:p-1.5
                      ${d.inMonth ? '' : 'opacity-40'}
                      ${d.phase ? PHASE_BG[d.phase] : 'bg-panel'}
                      ${d.period === 'predicted' ? 'border-2 border-dashed border-rose/70' : d.period === 'logged' ? 'border-2 border-rose/70' : 'border'}
                      ${isSel ? 'ring-2 ring-ink' : ''}`}
                  >
                    <span className={`grid h-6 w-6 place-items-center rounded-full tabular-nums ${isToday ? 'bg-ink text-bg' : ''}`}>{Number(d.key.slice(8))}</span>
                    {d.fertile && <span aria-hidden="true" className="absolute inset-x-1 bottom-1 h-0.5 rounded-full border-t-2 border-dashed border-gold" />}
                    <span className="mt-auto mb-1 flex flex-wrap justify-center gap-0.5" aria-hidden="true">
                      {d.ovulation && <Icon name="sparkle" size={12} className="text-gold" />}
                      {d.records.some((r) => r.type === 'opk') && <Icon name="bloom" size={12} className="text-rose" />}
                      {d.records.some((r) => r.type === 'urine') && <Icon name="drop" size={12} className="text-success" />}
                      {d.important && <Icon name="octagon" size={12} className="text-danger" />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <Legend />
          {!state.profile?.lastPeriodDate && !state.periodStarts.length && (
            <p className="mt-4 rounded-xl bg-panel-alt/70 p-3 text-label">
              {t('calendar.noCycleData')}{' '}
              <Link to="/app/settings" className="link">{t('nav.settings')}</Link>
            </p>
          )}
        </section>

        <aside className="space-y-6">
          <section className="rounded-2xl border bg-panel p-5" aria-labelledby="sel-h">
            <p className="text-caption text-muted">{t('calendar.selected')}</p>
            <h2 id="sel-h" className="text-h3">{formatDate(selected, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
            {sel.phase && (
              <div className="mt-3 flex gap-3 rounded-xl bg-panel-alt/60 p-3">
                <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: PHASE_STROKE[sel.phase] }} aria-hidden="true" />
                <div>
                  <p className="font-medium">
                    {t(`cycle.phase.${sel.phase}`)}
                    <span className="font-normal text-muted">{', '}{t('calendar.dayOfCycle', { n: sel.cycleDay ?? 0 })}</span>
                  </p>
                  <p className="text-label text-muted">{t(`cycle.phaseAbout.${sel.phase}`)}</p>
                </div>
              </div>
            )}
            <ul className="mt-2 flex flex-wrap gap-2 text-caption">
              {sel.period && <li className="rounded-full bg-rose/15 px-2.5 py-0.5">{t(sel.period === 'logged' ? 'calendar.legend.period' : 'calendar.legend.predicted')}</li>}
              {sel.fertile && <li className="rounded-full bg-gold/15 px-2.5 py-0.5">{t('calendar.legend.fertile')}</li>}
              {sel.ovulation && <li className="rounded-full bg-gold/15 px-2.5 py-0.5">{t('calendar.legend.ovulation')}</li>}
            </ul>
            {sel.records.length ? (
              <ul className="mt-3 divide-y border-y">
                {sortedRecords(sel.records).map((r) => <HistoryRow key={r.id} record={r} />)}
              </ul>
            ) : (
              <p className="mt-3 text-label text-muted">{t('calendar.nothing')}</p>
            )}
            {state.profile && selected <= today && (
              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                icon={isLoggedStart ? 'trash' : 'plus'}
                onClick={() => (isLoggedStart ? removePeriodStart(selected) : logPeriodStart(selected))}
              >
                {t(isLoggedStart ? 'calendar.removePeriod' : 'calendar.logPeriod')}
              </Button>
            )}
          </section>

          <section aria-labelledby="trend-h">
            <h2 id="trend-h" className="text-h3">{t('calendar.trendsTitle')}</h2>
            <p className="mt-1 text-label text-muted">
              {t('calendar.monthSummary', { urine: monthRecords.filter((r) => r.type === 'urine').length, opk: monthRecords.filter((r) => r.type === 'opk').length })}
            </p>
            <p className="mt-1 text-label text-muted">{avg ? t('calendar.avgCycle', { n: avg }) : t('calendar.avgCycleNone')}</p>
          </section>
        </aside>
      </div>

      {selCycle && (
        <section className="mt-10 rounded-2xl border bg-panel p-5" aria-labelledby="phases-h">
          <h2 id="phases-h" className="text-h3">{t('cycle.phasesTitle')}</h2>
          <p className="text-label text-muted">{t('cycle.phasesLead')}</p>
          <div className="mt-3">
            <PhaseTimeline window={selCycle} today={selected === today ? today : selected} />
          </div>
        </section>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-panel p-5" aria-labelledby="clh-h">
          <h2 id="clh-h" className="text-h3">{t('dashboard.lhTrend')}</h2>
          <div className="mt-3">
            <LhTrendChart records={state.records.filter((r): r is OpkRecord => r.type === 'opk')} height={200} />
          </div>
        </section>
        <section className="rounded-2xl border bg-panel p-5" aria-labelledby="cut-h">
          <h2 id="cut-h" className="text-h3">{t('urineTrend.title')}</h2>
          <div className="mt-3">
            <UrineTrends records={state.records.filter((r): r is UrineRecord => r.type === 'urine')} compact />
          </div>
        </section>
      </div>
      <div className="mt-8">
        <Disclaimer compact />
      </div>
    </div>
  );
}

function Legend() {
  const { t } = useI18n();
  const markers: { key: 'period' | 'predicted' | 'fertile' | 'ovulation' | 'opk' | 'urine' | 'important'; swatch?: string; icon?: IconName; tone?: string }[] = [
    { key: 'period', swatch: 'border-2 border-rose/70' },
    { key: 'predicted', swatch: 'border-2 border-dashed border-rose/70' },
    { key: 'fertile', swatch: 'border-b-2 border-dashed border-gold rounded-none h-2' },
    { key: 'ovulation', icon: 'sparkle', tone: 'text-gold' },
    { key: 'opk', icon: 'bloom', tone: 'text-rose' },
    { key: 'urine', icon: 'drop', tone: 'text-success' },
    { key: 'important', icon: 'octagon', tone: 'text-danger' },
  ];
  return (
    <div className="mt-4 space-y-3">
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-caption sm:grid-cols-4">
        {CYCLE_PHASES.map((p) => (
          <li key={p} className="flex items-center gap-2">
            <span className={`h-4 w-4 rounded border ${PHASE_BG[p]}`} />
            {t(`calendar.legend.${p === 'ovulation' ? 'ovulationPhase' : p}`)}
          </li>
        ))}
      </ul>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-caption sm:grid-cols-3">
        {markers.map((i) => (
          <li key={i.key} className="flex items-center gap-2">
            {i.swatch ? <span className={`h-4 w-4 rounded ${i.swatch}`} /> : <Icon name={i.icon!} size={16} className={i.tone} />}
            {t(`calendar.legend.${i.key}`)}
          </li>
        ))}
      </ul>
    </div>
  );
}
