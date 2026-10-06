import { useMemo, useState } from 'react';
import { useI18n } from '../../i18n';
import { Button, Disclaimer } from '../../components/ui';
import { Icon, type IconName } from '../../components/Icon';
import { LhTrendChart, UrineTrendGrid } from '../../components/charts';
import { logPeriodStart, removePeriodStart, sortedRecords, useAppState } from '../../store/store';
import type { OpkRecord, TestRecord, UrineRecord } from '../../store/types';
import { averageCycleLength, computeCycle, dayMarkers } from '../../health/cycle';
import { diffDays, isoToDateKey, toDateKey, todayKey } from '../../health/dates';
import { HistoryRow } from '../dashboard/Dashboard';

interface DayInfo {
  key: string;
  inMonth: boolean;
  period: 'logged' | 'predicted' | null;
  fertile: boolean;
  ovulation: boolean;
  records: TestRecord[];
  important: boolean;
}

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

  // The current cycle may be refined by a recorded LH surge; use it so the
  // calendar agrees with the dashboard.
  const current = useMemo(() => computeCycle(state.profile, state.records, today, state.periodStarts), [state.profile, state.records, state.periodStarts, today]);
  const markersFor = (key: string) => {
    const m = dayMarkers(key, state.profile, state.periodStarts);
    if (current && diffDays(key, current.cycleStart) >= 0 && diffDays(current.nextPeriod, key) > 0) {
      m.fertile = diffDays(key, current.fertileStart) >= 0 && diffDays(current.fertileEnd, key) >= 0;
      m.ovulation = key === current.ovulation;
    }
    return m;
  };

  const days: DayInfo[] = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const offset = (first.getDay() + 6) % 7; // Monday first
    const start = new Date(cursor.y, cursor.m, 1 - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const key = toDateKey(d);
      const marks = markersFor(key);
      const records = byDay.get(key) ?? [];
      return {
        key,
        inMonth: d.getMonth() === cursor.m,
        ...marks,
        records,
        important: records.some((r) => (r.type === 'opk' ? r.category === 'peak' : r.overall === 'flagged')),
      };
    });
  }, [cursor, state.profile, state.periodStarts, byDay, current]);

  const weekdays = useMemo(() => Array.from({ length: 7 }, (_, i) => formatDate(new Date(2024, 0, 1 + i), { weekday: 'short' })), [formatDate]);
  const monthLabel = formatDate(new Date(cursor.y, cursor.m, 1), { month: 'long', year: 'numeric' });
  const move = (delta: number) => setCursor((c) => {
    const d = new Date(c.y, c.m + delta, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const monthRecords = state.records.filter((r) => {
    const d = new Date(r.createdAt);
    return d.getFullYear() === cursor.y && d.getMonth() === cursor.m;
  });
  const sel = days.find((d) => d.key === selected) ?? { key: selected, ...markersFor(selected), records: byDay.get(selected) ?? [], important: false, inMonth: true };
  const isLoggedStart = state.periodStarts.includes(selected);
  const avg = state.periodStarts.length >= 2 ? averageCycleLength(state.periodStarts, state.profile?.cycleLength ?? 28) : null;

  const describe = (d: DayInfo) => {
    const parts = [formatDate(d.key, { weekday: 'long', day: 'numeric', month: 'long' })];
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
                    className={`relative flex aspect-square w-full flex-col items-center justify-start rounded-lg p-1 text-label transition-colors sm:p-1.5
                      ${d.inMonth ? '' : 'opacity-45'}
                      ${d.period === 'logged' ? 'bg-rose/20' : d.fertile ? 'bg-gold/12' : 'bg-panel'}
                      ${d.period === 'predicted' ? 'border-2 border-dashed border-rose/60' : 'border'}
                      ${isSel ? 'ring-2 ring-ink' : ''}`}
                  >
                    <span className={`grid h-6 w-6 place-items-center rounded-full tabular-nums ${isToday ? 'bg-ink text-bg' : ''}`}>{Number(d.key.slice(8))}</span>
                    <span className="mt-auto flex flex-wrap justify-center gap-0.5" aria-hidden="true">
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
        </section>

        <aside className="space-y-6">
          <section className="rounded-2xl border bg-panel p-5" aria-labelledby="sel-h">
            <p className="text-caption text-muted">{t('calendar.selected')}</p>
            <h2 id="sel-h" className="text-h3">{formatDate(selected, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
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

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-panel p-5" aria-labelledby="clh-h">
          <h2 id="clh-h" className="text-h3">{t('dashboard.lhTrend')}</h2>
          <div className="mt-3">
            <LhTrendChart records={state.records.filter((r): r is OpkRecord => r.type === 'opk')} height={200} />
          </div>
        </section>
        {state.records.some((r) => r.type === 'urine') && (
          <section className="rounded-2xl border bg-panel p-5" aria-labelledby="cut-h">
            <h2 id="cut-h" className="text-h3">{t('dashboard.urineTrend')}</h2>
            <div className="mt-3">
              <UrineTrendGrid records={state.records.filter((r): r is UrineRecord => r.type === 'urine')} />
            </div>
          </section>
        )}
      </div>
      <div className="mt-8">
        <Disclaimer compact />
      </div>
    </div>
  );
}

function Legend() {
  const { t } = useI18n();
  const items: { key: 'period' | 'predicted' | 'fertile' | 'ovulation' | 'opk' | 'urine' | 'important'; swatch?: string; icon?: IconName; tone?: string }[] = [
    { key: 'period', swatch: 'bg-rose/20 border' },
    { key: 'predicted', swatch: 'border-2 border-dashed border-rose/60' },
    { key: 'fertile', swatch: 'bg-gold/12 border' },
    { key: 'ovulation', icon: 'sparkle', tone: 'text-gold' },
    { key: 'opk', icon: 'bloom', tone: 'text-rose' },
    { key: 'urine', icon: 'drop', tone: 'text-success' },
    { key: 'important', icon: 'octagon', tone: 'text-danger' },
  ];
  return (
    <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-caption sm:grid-cols-3">
      {items.map((i) => (
        <li key={i.key} className="flex items-center gap-2">
          {i.swatch ? <span className={`h-4 w-4 rounded ${i.swatch}`} /> : <Icon name={i.icon!} size={16} className={i.tone} />}
          {t(`calendar.legend.${i.key}`)}
        </li>
      ))}
    </ul>
  );
}
