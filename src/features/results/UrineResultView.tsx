import { useI18n, type TKey } from '../../i18n';
import { Disclaimer, StatusBadge, CheckList } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { URINE_PARAMETERS, type ScreeningStatus } from '../../config/strips';
import type { ScanReport } from '../../cv/pipeline';
import type { UrineRecord, UrineReadingRecord } from '../../store/types';
import { levelLabel, productName, readingLabel } from './format';
import { Precautions } from './Precautions';
import { NearbyHelp } from './NearbyHelp';
import { ResultFooter, ResultHeaderMeta, type ResultActions } from './ResultChrome';
import { RgbaCanvas } from '../scan/RgbaCanvas';
import { UrineTrends } from '../../components/charts';
import { useAppState } from '../../store/store';

interface Props extends ResultActions {
  record: UrineRecord;
  report?: ScanReport;
}

function counts(readings: UrineReadingRecord[]) {
  const c = { normal: 0, borderline: 0, flagged: 0, unreadable: 0 };
  for (const r of readings) c[r.status]++;
  return c;
}

export function UrineResultView({ record, report, ...actions }: Props) {
  const { t, tl } = useI18n();
  const c = counts(record.readings);
  const notNormal = record.readings.filter((r) => r.status === 'borderline' || r.status === 'flagged');
  const overall: ScreeningStatus = record.overall;
  const { records } = useAppState();
  const trend = [...records.filter((r): r is UrineRecord => r.type === 'urine' && r.id !== record.id), record];

  return (
    <div className="container-page max-w-4xl py-8 sm:py-10">
      {/* Result header */}
      <header>
        <ResultHeaderMeta record={record} />
        <h1 className="mt-1 text-h2 sm:text-h1">{t('results.screeningResult')}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <StatusBadge status={overall} size="lg" />
          <p className="text-body-lg">{t(`results.overall.${overall}`)}</p>
        </div>
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-label text-muted">
          <li className="inline-flex items-center gap-1.5"><Icon name="checkCircle" size={16} className="text-success" />{t('results.countsNormal', { n: c.normal })}</li>
          <li className="inline-flex items-center gap-1.5"><Icon name="triangle" size={16} className="text-gold" />{t('results.countsBorderline', { n: c.borderline })}</li>
          <li className="inline-flex items-center gap-1.5"><Icon name="octagon" size={16} className="text-danger" />{t('results.countsFlagged', { n: c.flagged })}</li>
          {c.unreadable > 0 && <li className="inline-flex items-center gap-1.5"><Icon name="question" size={16} />{t('results.countsUnreadable', { n: c.unreadable })}</li>}
        </ul>
        <p className="mt-2 text-label text-muted">
          {productName(t, record.productId)}
          {record.source !== 'manual' && (
            <>
              {', '}
              {t('detection.regions', { n: record.regionCount })}
              {record.orientation && `, ${t('common.orientationWithAngle', { orientation: t(`common.orientation.${record.orientation}`), angle: Math.abs(record.angleDeg ?? 0) })}`}
            </>
          )}
        </p>
        {record.source === 'sample' && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gold/10 px-3 py-1.5 text-label">
            <Icon name="sparkle" size={16} className="text-gold" /> {t('results.sampleNote')}
          </p>
        )}
      </header>

      <div className="mt-6">
        <Disclaimer compact />
      </div>

      {report?.strip && report.urine && <StripReadout report={report} />}

      {/* Result */}
      <section aria-labelledby="result-h" className="mt-10">
        <h2 id="result-h" className="text-h2">{t('results.resultTitle')}</h2>
        <ul className="mt-4 divide-y border-y">
          {record.readings.map((r) => (
            <ReadingRow key={r.paramId} reading={r} defaultOpen={r.status === 'flagged' || r.status === 'borderline'} />
          ))}
        </ul>
        {report?.urine?.orderSource === 'colorFit' && <p className="mt-3 text-caption text-muted">{t('results.orientationNote')}</p>}
      </section>

      {/* What this means */}
      <section aria-labelledby="meaning-h" className="mt-10">
        <h2 id="meaning-h" className="text-h2">{t('results.meaningTitle')}</h2>
        <p className="mt-3 text-body-lg">{t(notNormal.length ? 'results.meaningIntro.notNormal' : 'results.meaningIntro.normal')}</p>
        {notNormal.length > 0 && (
          <dl className="mt-4 space-y-4">
            {notNormal.map((r) => (
              <div key={r.paramId} className="border-l-2 border-rose/60 pl-4">
                <dt className="font-medium">
                  {t(`params.${r.paramId}.name`)}: {readingLabel(t, r.paramId, r.levelIndex)}
                </dt>
                <dd className="mt-1 text-ink/85">{t(`params.${r.paramId}.meaning.${r.status as 'borderline' | 'flagged'}` as TKey)}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {/* What can I do now */}
      <section aria-labelledby="actions-h" className="mt-10">
        <h2 id="actions-h" className="text-h2">{t('results.actionsTitle')}</h2>
        <div className="mt-4 space-y-3">
          <CheckList items={tl('results.actionsGeneral')} icon="check" tone="success" />
          {notNormal.length > 0 && (
            <CheckList items={notNormal.map((r) => <><span className="font-medium">{t(`params.${r.paramId}.name`)}:</span> {t(`params.${r.paramId}.action`)}</>)} icon="check" tone="success" />
          )}
        </div>
      </section>

      {/* When to seek help */}
      <section aria-labelledby="help-h" className="mt-10">
        <h2 id="help-h" className="text-h2">{t('results.seekHelpTitle')}</h2>
        <div className="mt-4 space-y-3">
          {notNormal.length > 0 && (
            <CheckList items={notNormal.map((r) => <><span className="font-medium">{t(`params.${r.paramId}.name`)}:</span> {t(`params.${r.paramId}.help`)}</>)} icon="info" tone="danger" />
          )}
          <CheckList items={tl('results.seekHelpGeneral')} icon="info" tone="danger" />
        </div>
      </section>

      <section aria-labelledby="trend-h" className="mt-10 rounded-2xl border bg-panel p-5">
        <h2 id="trend-h" className="text-h3">{t('urineTrend.yourTrend')}</h2>
        <div className="mt-3">
          <UrineTrends records={trend} compact />
        </div>
      </section>

      <div className="mt-10 space-y-6">
        <Precautions />
        <NearbyHelp />
        <Disclaimer />
      </div>

      <ResultFooter record={record} {...actions} />
    </div>
  );
}

function ReadingRow({ reading, defaultOpen }: { reading: UrineReadingRecord; defaultOpen: boolean }) {
  const { t } = useI18n();
  const param = URINE_PARAMETERS[reading.paramId];
  const name = t(`params.${reading.paramId}.name`);
  return (
    <li>
      <details open={defaultOpen} className="group">
        <summary className="flex cursor-pointer list-none items-center gap-3 py-3.5 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{name}</span>
            <span className="block text-label text-muted">{readingLabel(t, reading.paramId, reading.levelIndex)}</span>
          </span>
          <StatusBadge status={reading.status} size="sm" />
          <Icon name="chevronDown" size={18} className="text-muted transition-transform group-open:rotate-180" label={t('results.detailsFor', { name })} />
        </summary>
        <div className="space-y-3 pb-5 pl-0.5 text-label">
          <p className="text-muted">{t(`params.${reading.paramId}.about`)}</p>
          {reading.status === 'unreadable' ? (
            <p>{t('results.unreadableNote')}</p>
          ) : (
            <p>{reading.status === 'normal' ? t('common.statusHint.normal') : t(`params.${reading.paramId}.meaning.${reading.status}` as TKey)}</p>
          )}
          <p className="text-caption text-muted">
            {t('results.readingConfidence')}: {t(`common.confidence.${reading.confidence}`)}
          </p>
          <div>
            <p className="text-caption text-muted">{t('results.referenceChart')}</p>
            <ol className="mt-1.5 flex flex-wrap gap-1.5">
              {param.levels.map((l, i) => {
                const active = i === reading.levelIndex;
                return (
                  <li key={i} className={`flex w-[4.5rem] flex-col items-center gap-1 rounded-md p-1 text-center text-[11px] leading-tight ${active ? 'bg-panel-alt ring-2 ring-ink' : ''}`}>
                    <span className="h-6 w-full rounded border border-black/10" style={{ background: l.color }} />
                    <span>{levelLabel(t, l)}</span>
                    {active && <Icon name="check" size={12} />}
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </details>
    </li>
  );
}

/** The normalized strip with pad boxes, and each pad's measured vs matched colour. */
function StripReadout({ report }: { report: ScanReport }) {
  const { t } = useI18n();
  const strip = report.strip!;
  const readings = report.urine!.readings;
  return (
    <section className="mt-8 rounded-2xl border bg-panel p-4" aria-label={t('detection.normalizedLabel')}>
      <p className="text-caption text-muted">{t('detection.normalizedLabel')}</p>
      <RgbaCanvas image={strip.image} label={t('detection.normalizedLabel')} className="mt-2 overflow-hidden rounded-lg">
        {report.stripBoxes.map((b, i) => (
          <rect key={i} x={b.x0} y={b.y0} width={b.x1 - b.x0} height={b.y1 - b.y0} fill="none" stroke={b.inferred ? '#E0A94F' : '#3E8A6D'} strokeWidth={2} strokeDasharray={b.inferred ? '6 4' : undefined} />
        ))}
      </RgbaCanvas>
      <ul className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-10">
        {readings.map((r) => {
          const ref = r.levelIndex !== null ? URINE_PARAMETERS[r.paramId].levels[r.levelIndex].color : null;
          return (
            <li key={r.paramId} className="text-center text-[11px] leading-tight">
              <span className="flex h-8 overflow-hidden rounded border border-black/10">
                <span className="flex-1" style={{ background: r.measuredHex }} title={t('results.measuredColour')} />
                <span className="flex-1" style={{ background: ref ?? 'transparent' }} title={t('results.referenceChart')} />
              </span>
              <span className="mt-1 block truncate">{t(`params.${r.paramId}.name`)}</span>
            </li>
          );
        })}
      </ul>
      {readings.some((r) => r.inferred) && <p className="mt-2 text-caption text-muted">{t('results.inferredNote')}</p>}
    </section>
  );
}
