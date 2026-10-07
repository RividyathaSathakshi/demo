import { useI18n } from '../../i18n';
import { ButtonLink } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { CycleRing } from '../../components/CycleRing';
import { computeCycle, opkStartDate } from '../../health/cycle';
import { PhaseTimeline } from '../../components/PhaseTimeline';
import { diffDays, todayKey } from '../../health/dates';
import type { Profile, TestRecord } from '../../store/types';

/** Cycle day, next period and fertile-window estimate. */
export function FertilityPanel({ profile, records, periodStarts, compact = false }: { profile: Profile | null; records: TestRecord[]; periodStarts: string[]; compact?: boolean }) {
  const { t, formatDate } = useI18n();
  const today = todayKey();
  const cycle = computeCycle(profile, records, today, periodStarts);
  if (!cycle || !profile) {
    return (
      <div className="rounded-2xl border border-dashed border-[color:var(--border-strong)] p-5">
        <p className="text-muted">{t('cycle.noData')}</p>
        <ButtonLink to="/app/settings" variant="secondary" size="sm" className="mt-3" icon="calendar">
          {t('cycle.addPeriod')}
        </ButtonLink>
      </div>
    );
  }
  const fs = diffDays(cycle.fertileStart, cycle.cycleStart) + 1;
  const fe = diffDays(cycle.fertileEnd, cycle.cycleStart) + 1;
  const ov = diffDays(cycle.ovulation, cycle.cycleStart) + 1;
  const fmt = (d: string) => formatDate(d, { day: 'numeric', month: 'short' });
  const next =
    cycle.daysUntilNextPeriod > 1
      ? t('cycle.inDays', { n: cycle.daysUntilNextPeriod })
      : cycle.daysUntilNextPeriod === 1
        ? t('cycle.inOneDay')
        : cycle.daysUntilNextPeriod === 0
          ? t('cycle.dueToday')
          : t('cycle.overdue', { n: -cycle.daysUntilNextPeriod });
  const opkStart = opkStartDate(cycle);
  return (
    <div className="space-y-6">
    <div className={`grid items-center gap-6 ${compact ? 'sm:grid-cols-[auto_1fr]' : 'md:grid-cols-[auto_1fr]'}`}>
      <div className="flex justify-center">
        <CycleRing
          day={cycle.cycleDay}
          length={cycle.cycleLength}
          periodLength={cycle.window.periodLength}
          fertileStart={fs}
          fertileEnd={fe}
          ovulationDay={ov}
          size={compact ? 180 : 220}
          label={t('cycle.ringLabel', { day: cycle.cycleDay, length: cycle.cycleLength, fs, fe })}
          centerTop={t('cycle.cycleDay')}
          centerMain={String(cycle.cycleDay)}
          centerSub={t(`cycle.phase.${cycle.phase}`)}
        />
      </div>
      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <dt className="text-label text-muted">{t('cycle.currentPhase')}</dt>
          <dd className="font-display text-h3">{t(`cycle.phase.${cycle.phase}`)}</dd>
          <dd className="text-label text-muted">{t(`cycle.phaseAbout.${cycle.phase}`)}</dd>
        </div>
        <div>
          <dt className="text-label text-muted">{t('cycle.cycleDay')}</dt>
          <dd className="font-display text-h3">{t('cycle.dayOf', { day: cycle.cycleDay, length: cycle.cycleLength })}</dd>
        </div>
        <div>
          <dt className="text-label text-muted">{t('cycle.nextPeriod')}</dt>
          <dd className="font-display text-h3">{fmt(cycle.nextPeriod)}</dd>
          <dd className="text-label text-muted">{next}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="flex items-center gap-1.5 text-label text-muted">
            <span className="inline-block h-2 w-5 rounded-full border-2 border-dashed border-gold" aria-hidden="true" />
            {t('cycle.fertileWindow')}
          </dt>
          <dd className="font-display text-h3">{t('cycle.range', { start: fmt(cycle.fertileStart), end: fmt(cycle.fertileEnd) })}</dd>
          <dd className="text-label text-muted">
            {t('cycle.ovulation')}: {fmt(cycle.ovulation)}.{' '}
            {cycle.refinedByLh && cycle.surgeDate ? (
              <span className="inline-flex items-center gap-1">
                <Icon name="sparkle" size={14} className="text-rose" />
                {t('cycle.refined', { date: fmt(cycle.surgeDate) })}
              </span>
            ) : (
              t('cycle.calendarBased')
            )}
          </dd>
        </div>
      </dl>
    </div>
      {diffDays(opkStart, today) >= 0 && (
        <p className="flex gap-2 text-label">
          <Icon name="bloom" size={18} className="shrink-0 text-rose" />
          {t('cycle.opkStart', { date: fmt(opkStart), day: diffDays(opkStart, cycle.cycleStart) + 1 })}
        </p>
      )}
      {!compact && (
        <div>
          <h3 className="text-h3">{t('cycle.phasesTitle')}</h3>
          <div className="mt-2">
            <PhaseTimeline window={cycle.window} today={today} />
          </div>
        </div>
      )}
    </div>
  );
}
