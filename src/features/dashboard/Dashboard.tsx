import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { ButtonLink, StatusBadge, Disclaimer } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { LhTrendChart, UrineTrendGrid } from '../../components/charts';
import { sortedRecords, useAppState } from '../../store/store';
import type { OpkRecord, TestRecord, UrineRecord } from '../../store/types';
import { FertilityPanel } from '../results/FertilityPanel';
import { ClearDataButton } from '../settings/ClearData';
import { computeCycle } from '../../health/cycle';
import { diffDays, todayKey } from '../../health/dates';
import { readingLabel } from '../results/format';

export default function Dashboard() {
  const { t, formatDate } = useI18n();
  const state = useAppState();
  const records = sortedRecords(state.records);
  const urine = records.filter((r): r is UrineRecord => r.type === 'urine');
  const opk = records.filter((r): r is OpkRecord => r.type === 'opk');
  const tracking = state.profile?.tracking ?? 'both';
  const showFertility = tracking !== 'urine';
  const showUrine = tracking !== 'fertility';
  const today = todayKey();
  const cycle = computeCycle(state.profile, state.records, today, state.periodStarts);
  const reminders = buildReminders();

  function buildReminders(): string[] {
    const out: string[] = [];
    if (showFertility && cycle) {
      if (cycle.phase === 'fertile') out.push(t('dashboard.reminders.inWindow'));
      else if (diffDays(cycle.fertileStart, today) > 0 && diffDays(cycle.fertileStart, today) <= 5)
        out.push(t('dashboard.reminders.testOpk', { date: formatDate(cycle.fertileStart, { day: 'numeric', month: 'short' }) }));
      if (cycle.daysUntilNextPeriod > 0 && cycle.daysUntilNextPeriod <= 3) out.push(t('dashboard.reminders.period', { n: cycle.daysUntilNextPeriod }));
    }
    if (showUrine && urine[0]?.overall === 'flagged') out.push(t('dashboard.reminders.followUp'));
    if (showUrine) out.push(t('dashboard.reminders.hydrate'));
    out.push(t('dashboard.reminders.consistency'));
    return out;
  }

  return (
    <div className="container-page py-8 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-label text-muted">{formatDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="text-h1">{t('dashboard.greeting')}</h1>
          <p className="mt-1 text-muted">{t('dashboard.lead')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {showUrine && (
            <ButtonLink to="/app/scan/urine" icon="drop" variant={showFertility ? 'secondary' : 'primary'}>
              {t('common.modules.urine.name')}
            </ButtonLink>
          )}
          {showFertility && (
            <ButtonLink to="/app/scan/opk" icon="bloom">
              {t('common.modules.opk.name')}
            </ButtonLink>
          )}
        </div>
      </div>

      {showFertility && (
        <section className="mt-8 rounded-3xl border bg-panel p-5 sm:p-7" aria-label={t('cycle.cycleDay')}>
          <FertilityPanel profile={state.profile} records={state.records} periodStarts={state.periodStarts} />
        </section>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {showUrine && <LatestUrine record={urine[0]} />}
        {showFertility && <LatestOpk record={opk[0]} />}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          {showFertility && (
            <section className="rounded-2xl border bg-panel p-5" aria-labelledby="lh-h">
              <h2 id="lh-h" className="text-h3">{t('dashboard.lhTrend')}</h2>
              <div className="mt-3">
                <LhTrendChart records={opk} />
              </div>
            </section>
          )}
          {showUrine && urine.length > 0 && (
            <section className="rounded-2xl border bg-panel p-5" aria-labelledby="ut-h">
              <h2 id="ut-h" className="text-h3">{t('dashboard.urineTrend')}</h2>
              <p className="text-label text-muted">{t('dashboard.urineTrendLead')}</p>
              <div className="mt-3">
                <UrineTrendGrid records={urine} />
              </div>
            </section>
          )}
        </div>
        <div className="space-y-6">
          <section aria-labelledby="rem-h" className="rounded-2xl bg-panel-alt/70 p-5">
            <h2 id="rem-h" className="text-h3">{t('dashboard.remindersTitle')}</h2>
            <ul className="mt-3 space-y-3">
              {reminders.map((r, i) => (
                <li key={i} className="flex gap-2.5 text-label">
                  <Icon name={i === 0 ? 'sparkle' : 'clock'} size={18} className={`mt-0.5 shrink-0 ${i === 0 ? 'text-rose' : 'text-muted'}`} />
                  {r}
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="hist-h">
            <div className="flex items-baseline justify-between">
              <h2 id="hist-h" className="text-h3">{t('dashboard.historyTitle')}</h2>
              <Link to="/app/history" className="link text-label">{t('dashboard.viewAll')}</Link>
            </div>
            {records.length ? (
              <ul className="mt-3 divide-y border-y">
                {records.slice(0, 6).map((r) => (
                  <HistoryRow key={r.id} record={r} />
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-muted">{t('dashboard.emptyHistory')}</p>
            )}
          </section>
        </div>
      </div>

      <div className="mt-10">
        <Disclaimer compact />
      </div>

      <section className="mt-10 flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between" aria-labelledby="clear-h">
        <div>
          <h2 id="clear-h" className="font-medium">{t('dashboard.clearTitle')}</h2>
          <p className="text-label text-muted">{t('dashboard.clearBody')}</p>
        </div>
        <ClearDataButton />
      </section>
    </div>
  );
}

function LatestUrine({ record }: { record?: UrineRecord }) {
  const { t, formatDate } = useI18n();
  const flagged = record?.readings.filter((r) => r.status === 'flagged' || r.status === 'borderline') ?? [];
  return (
    <section className="rounded-2xl border bg-panel p-5" aria-labelledby="lu-h">
      <h2 id="lu-h" className="flex items-center gap-2 text-h3">
        <Icon name="drop" size={22} className="text-success" /> {t('dashboard.latestUrine')}
      </h2>
      {record ? (
        <Link to={`/app/result/${record.id}`} className="mt-3 block rounded-lg hover:bg-panel-alt/40">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={record.overall} />
            <span className="text-label text-muted">{formatDate(record.createdAt)}</span>
          </div>
          <p className="mt-2">{t(`results.overall.${record.overall}`)}</p>
          {flagged.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {flagged.map((r) => (
                <li key={r.paramId} className="rounded-full border px-2.5 py-0.5 text-caption">
                  {t(`params.${r.paramId}.name`)}: {readingLabel(t, r.paramId, r.levelIndex)}
                </li>
              ))}
            </ul>
          )}
        </Link>
      ) : (
        <p className="mt-3 text-muted">{t('dashboard.noneUrine')}</p>
      )}
    </section>
  );
}

function LatestOpk({ record }: { record?: OpkRecord }) {
  const { t, formatDate } = useI18n();
  return (
    <section className="rounded-2xl border bg-panel p-5" aria-labelledby="lo-h">
      <h2 id="lo-h" className="flex items-center gap-2 text-h3">
        <Icon name="bloom" size={22} className="text-rose" /> {t('dashboard.latestOpk')}
      </h2>
      {record ? (
        <Link to={`/app/result/${record.id}`} className="mt-3 flex items-end justify-between gap-4 rounded-lg hover:bg-panel-alt/40">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={record.category} />
              <span className="text-label text-muted">{formatDate(record.createdAt)}</span>
            </div>
            <p className="mt-2">{t(`opkResult.titles.${record.category}`)}</p>
          </div>
          {record.ratio !== null && (
            <p className="text-right">
              <span className="block text-caption text-muted">{t('opkResult.ratio')}</span>
              <span className="font-display text-h2 tabular-nums">{record.ratio.toFixed(2)}</span>
            </p>
          )}
        </Link>
      ) : (
        <p className="mt-3 text-muted">{t('dashboard.noneOpk')}</p>
      )}
    </section>
  );
}

export function HistoryRow({ record }: { record: TestRecord }) {
  const { t, formatDate } = useI18n();
  return (
    <li>
      <Link to={`/app/result/${record.id}`} className="flex items-center gap-3 py-3 hover:bg-panel-alt/40">
        <Icon name={record.type === 'urine' ? 'drop' : 'bloom'} size={20} className={record.type === 'urine' ? 'text-success' : 'text-rose'} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-label font-medium">{t(`common.modules.${record.type === 'urine' ? 'urine' : 'opk'}.name`)}</span>
          <span className="block text-caption text-muted">
            {formatDate(record.createdAt, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
            {', '}
            {t(`common.source.${record.source}`)}
            {record.type === 'opk' && record.ratio !== null && `, ${t('history.ratio', { ratio: record.ratio.toFixed(2) })}`}
          </span>
        </span>
        <StatusBadge status={record.type === 'urine' ? record.overall : record.category} size="sm" />
      </Link>
    </li>
  );
}
