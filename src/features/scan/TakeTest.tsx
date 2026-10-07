import { useI18n } from '../../i18n';
import { NumberedList, CheckList } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { TestTimer, type Countdown } from './TestTimer';
import { useAppState } from '../../store/store';
import { computeCycle, opkStartDate } from '../../health/cycle';
import { diffDays, todayKey } from '../../health/dates';
import type { ScanModule } from '../../cv/pipeline';

export const TIMER_PRESETS: Record<ScanModule, number[]> = { urine: [60, 120], opk: [300, 600] };

/** Step 1 of the scan flow: how to perform the test itself, with a reading timer. */
export function TakeTest({ module, timer }: { module: ScanModule; timer: Countdown }) {
  const { t, tl } = useI18n();
  const presets = TIMER_PRESETS[module].map((seconds, i) => ({ seconds, label: t(`takeTest.${module}.presets.${i === 0 ? 'short' : 'long'}`) }));
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-h1">{t(`takeTest.${module}.title`)}</h1>
        <p className="mt-2 text-body-lg text-muted">{t(`takeTest.${module}.lead`)}</p>
      </div>
      {module === 'opk' && <OpkWhen />}
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <NumberedList items={tl(`takeTest.${module}.steps`)} />
        <div className="space-y-6 self-start">
          <TestTimer timer={timer} presets={presets} title={t(`takeTest.${module}.timerTitle`)} hint={t(`takeTest.${module}.timerHint`)} />
          {module === 'opk' && <OpkReadGuide />}
        </div>
      </div>
    </div>
  );
}

function OpkWhen() {
  const { t, tl, formatDate } = useI18n();
  const state = useAppState();
  const today = todayKey();
  const cycle = computeCycle(state.profile, state.records, today, state.periodStarts);
  const start = cycle ? opkStartDate(cycle) : null;
  return (
    <section aria-labelledby="when-h" className="rounded-2xl bg-panel-alt/70 p-5">
      <h2 id="when-h" className="flex items-center gap-2 text-h3">
        <Icon name="calendar" size={22} className="text-rose" /> {t('takeTest.opk.whenTitle')}
      </h2>
      {cycle && start && (
        <p className="mt-2 font-medium">
          {t('cycle.opkStart', { date: formatDate(start, { weekday: 'short', day: 'numeric', month: 'short' }), day: diffDays(start, cycle.cycleStart) + 1 })}
        </p>
      )}
      <div className="mt-3">
        <CheckList items={tl('takeTest.opk.when')} icon="clock" tone="gold" />
      </div>
    </section>
  );
}

/** Example OPK strips showing how the C and T lines are interpreted. */
function OpkReadGuide() {
  const { t } = useI18n();
  const rows: { key: 'low' | 'rising' | 'peak' | 'invalid'; t: number; c: number }[] = [
    { key: 'low', t: 0.15, c: 0.85 },
    { key: 'rising', t: 0.55, c: 0.85 },
    { key: 'peak', t: 0.95, c: 0.8 },
    { key: 'invalid', t: 0.6, c: 0 },
  ];
  return (
    <section aria-labelledby="read-h" className="rounded-2xl border bg-panel p-5">
      <h3 id="read-h" className="text-h3">{t('takeTest.opk.readTitle')}</h3>
      <ul className="mt-3 space-y-3">
        {rows.map((r) => (
          <li key={r.key} className="flex items-start gap-3">
            <svg width="76" height="30" viewBox="0 0 76 30" aria-hidden="true" className="mt-0.5 shrink-0 rounded border border-black/10 bg-[#F3F2EC]">
              <rect x="0" y="0" width="12" height="30" fill="#CFE1EE" />
              <rect x="30" y="5" width="4" height="18" fill="#7A3E8E" opacity={r.t} />
              <rect x="46" y="5" width="4" height="18" fill="#7A3E8E" opacity={r.c} />
              <text x="32" y="29" fontSize="6.5" textAnchor="middle" fill="#5B6178">T</text>
              <text x="48" y="29" fontSize="6.5" textAnchor="middle" fill="#5B6178">C</text>
            </svg>
            <p className="text-label">{t(`takeTest.opk.read.${r.key}`)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
