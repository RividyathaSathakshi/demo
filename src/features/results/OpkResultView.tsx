import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { Button, CheckList, Disclaimer, StatusBadge } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { LhTrendChart } from '../../components/charts';
import { OPK_PRODUCTS } from '../../config/strips';
import type { ScanReport } from '../../cv/pipeline';
import type { OpkRecord } from '../../store/types';
import { sortedRecords, useAppState } from '../../store/store';
import { Precautions } from './Precautions';
import { NearbyHelp } from './NearbyHelp';
import { FertilityPanel } from './FertilityPanel';
import { ResultFooter, ResultHeaderMeta, type ResultActions } from './ResultChrome';
import { RgbaCanvas } from '../scan/RgbaCanvas';

interface Props extends ResultActions {
  record: OpkRecord;
  report?: ScanReport;
  onSwapLines?: () => void;
}

/** Ratio gauge with the configured Low / Rising / Peak bands. */
function RatioGauge({ ratio }: { ratio: number }) {
  const { t } = useI18n();
  const { rising, peak } = OPK_PRODUCTS[0].thresholds;
  const max = 2;
  const pos = (v: number) => `${(Math.min(v, max) / max) * 100}%`;
  return (
    <div className="mt-4" aria-hidden="true">
      <div className="relative h-3 overflow-hidden rounded-full bg-panel-alt">
        <div className="absolute inset-y-0 bg-gold/40" style={{ left: pos(rising), width: `calc(${pos(peak)} - ${pos(rising)})` }} />
        <div className="absolute inset-y-0 right-0 bg-rose/35" style={{ left: pos(peak) }} />
      </div>
      <div className="relative h-5">
        <span className="absolute -top-[18px] h-6 w-1 -translate-x-1/2 rounded-full bg-ink" style={{ left: pos(ratio) }} />
      </div>
      <div className="relative -mt-1 h-4 text-caption text-muted">
        <span className="absolute left-0">0</span>
        <span className="absolute -translate-x-1/2" style={{ left: pos(rising) }}>{rising.toFixed(1)}</span>
        <span className="absolute -translate-x-1/2" style={{ left: pos(peak) }}>{peak.toFixed(1)}</span>
        <span className="absolute right-0">{max.toFixed(1)}+</span>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted">
        <li className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-panel-alt" />{t('opkResult.scale.low')} &lt; {rising.toFixed(1)}</li>
        <li className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-gold/40" />{t('opkResult.scale.rising')} {rising.toFixed(1)}–{peak.toFixed(1)}</li>
        <li className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-rose/35" />{t('opkResult.scale.peak')} ≥ {peak.toFixed(1)}</li>
      </ul>
    </div>
  );
}

export function OpkResultView({ record, report, onSwapLines, ...actions }: Props) {
  const { t, tl, formatDate, formatNumber } = useI18n();
  const state = useAppState();
  const others = state.records.filter((r): r is OpkRecord => r.type === 'opk' && r.id !== record.id);
  const trend = [...others, record];
  const previous = sortedRecords(others).slice(0, 6) as OpkRecord[];

  return (
    <div className="container-page max-w-4xl py-8 sm:py-10">
      <header>
        <ResultHeaderMeta record={record} />
        <p className="mt-1 text-label text-muted">{t('results.screeningResult')}</p>
        <h1 className="mt-1 text-h2 sm:text-h1">{t(`opkResult.titles.${record.category}`)}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <StatusBadge status={record.category} size="lg" />
        </div>
        {record.source === 'sample' && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gold/10 px-3 py-1.5 text-label">
            <Icon name="sparkle" size={16} className="text-gold" /> {t('results.sampleNote')}
          </p>
        )}
      </header>

      <div className="mt-6">
        <Disclaimer compact />
      </div>

      <section className="mt-8 grid gap-6 md:grid-cols-[1fr_1.1fr]" aria-labelledby="ratio-h">
        <div className="rounded-2xl border bg-panel p-5">
          <h2 id="ratio-h" className="text-label text-muted">{t('opkResult.ratio')}</h2>
          {record.ratio !== null ? (
            <>
              <p className="font-display text-display">{formatNumber(record.ratio, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-label text-muted">{t('opkResult.ratioExplain')}</p>
              <RatioGauge ratio={record.ratio} />
              {record.testDetected === false && <p className="mt-3 text-label">{t('opkResult.noTestLine')}</p>}
            </>
          ) : (
            <p className="mt-2 text-muted">{t('opkResult.manualNoRatio')}</p>
          )}
        </div>
        {report?.strip && (
          <div className="rounded-2xl border bg-panel p-4">
            <p className="text-caption text-muted">{t('detection.normalizedLabel')}</p>
            <RgbaCanvas image={report.strip.image} label={t('detection.normalizedLabel')} className="mt-2 overflow-hidden rounded-lg">
              {report.stripBoxes.map((b, i) => (
                <g key={i}>
                  <rect x={b.x0} y={b.y0} width={b.x1 - b.x0} height={b.y1 - b.y0} fill="none" stroke={b.label === 'C' ? '#1E2438' : '#B85C56'} strokeWidth={2} />
                  <text x={(b.x0 + b.x1) / 2} y={Math.max(12, b.y0 - 4)} textAnchor="middle" fontSize={Math.max(12, (b.y1 - b.y0) * 0.35)} fill={b.label === 'C' ? '#1E2438' : '#B85C56'} fontWeight={600} fontFamily="IBM Plex Sans">
                    {b.label}
                  </text>
                </g>
              ))}
            </RgbaCanvas>
            {report.opk?.assignment === 'default' && <p className="mt-2 text-caption text-muted">{t('opkResult.linesAssumed')}</p>}
            {onSwapLines && (
              <Button variant="ghost" size="sm" icon="swap" className="mt-2" onClick={onSwapLines}>
                {t('common.buttons.swapLines')}
              </Button>
            )}
          </div>
        )}
      </section>

      <section aria-labelledby="meaning-h" className="mt-10">
        <h2 id="meaning-h" className="text-h2">{t('results.meaningTitle')}</h2>
        <p className="mt-3 text-body-lg">{t(`opkResult.meaning.${record.category}`)}</p>
      </section>

      <section aria-labelledby="tracking-h" className="mt-10">
        <h2 id="tracking-h" className="text-h2">{t('opkResult.trackingTitle')}</h2>
        <div className="mt-4 rounded-2xl border bg-panel p-5">
          <FertilityPanel profile={state.profile} records={trend} periodStarts={state.periodStarts} compact />
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border bg-panel p-5">
            <h3 className="text-h3">{t('opkResult.trendTitle')}</h3>
            <div className="mt-3">
              <LhTrendChart records={trend} />
            </div>
          </div>
          <div>
            <h3 className="text-h3">{t('opkResult.previousTitle')}</h3>
            {previous.length ? (
              <ul className="mt-3 divide-y border-y">
                {previous.map((r) => (
                  <li key={r.id}>
                    <Link to={`/app/result/${r.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:bg-panel-alt/50">
                      <span className="text-label">{formatDate(r.createdAt, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>
                      <span className="flex items-center gap-2">
                        {r.ratio !== null && <span className="text-label tabular-nums text-muted">{r.ratio.toFixed(2)}</span>}
                        <StatusBadge status={r.category} size="sm" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-muted">{t('opkResult.noPrevious')}</p>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="next-h" className="mt-10">
        <h2 id="next-h" className="text-h2">{t('results.actionsTitle')}</h2>
        <div className="mt-4 space-y-3">
          <CheckList items={tl(`opkResult.nextSteps.${record.category}`)} />
          <CheckList items={tl('opkResult.general')} icon="info" tone="muted" />
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
