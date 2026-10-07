import { useMemo, useState } from 'react';
import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler, BarElement } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { useI18n } from '../i18n';
import { useThemeColors } from './useThemeColors';
import { Icon } from './Icon';
import { URINE_PARAMETERS, type UrineParamId } from '../config/strips';
import type { OpkRecord, UrineRecord } from '../store/types';
import { statusIcon, statusTone } from './ui';
import { levelLabel, readingLabel } from '../features/results/format';
import { OPK_PRODUCTS } from '../config/strips';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler, BarElement);

/** LH trend (T/C ratio over time) with the configured interpretation thresholds. */
export function LhTrendChart({ records, height = 220 }: { records: OpkRecord[]; height?: number }) {
  const { t, formatDate } = useI18n();
  const c = useThemeColors();
  const pts = [...records].filter((r) => r.ratio !== null).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(-20);
  const { rising, peak } = OPK_PRODUCTS[0].thresholds;
  if (!pts.length) return <p className="text-muted">{t('opkResult.noPrevious')}</p>;
  const labels = pts.map((r) => formatDate(r.createdAt, { day: 'numeric', month: 'short' }));
  const max = Math.max(1.6, ...pts.map((r) => r.ratio ?? 0)) * 1.1;
  const summary = pts.map((r) => `${formatDate(r.createdAt, { day: 'numeric', month: 'short' })}: ${r.ratio?.toFixed(2)} (${t(`common.status.${r.category}`)})`).join('; ');
  return (
    <figure>
      <div style={{ height }}>
        <Line
          aria-label={`${t('opkResult.trendTitle')}. ${summary}`}
          role="img"
          data={{
            labels,
            datasets: [
              {
                label: t('opkResult.ratio'),
                data: pts.map((r) => r.ratio),
                borderColor: c.rose,
                backgroundColor: c.rose,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointStyle: pts.map((r) => (r.category === 'peak' ? 'star' : r.category === 'rising' ? 'triangle' : 'circle')),
                tension: 0.3,
                borderWidth: 2.5,
              },
              { label: `${t('common.status.peak')} (${peak})`, data: pts.map(() => peak), borderColor: c.gold, borderDash: [6, 4], pointRadius: 0, borderWidth: 1.5 },
              { label: `${t('common.status.rising')} (${rising})`, data: pts.map(() => rising), borderColor: c.muted, borderDash: [2, 4], pointRadius: 0, borderWidth: 1.2 },
            ],
          }}
          options={{
            maintainAspectRatio: false,
            animation: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.parsed.y).toFixed(2)}` } } },
            scales: {
              x: { ticks: { color: c.muted, maxRotation: 0, autoSkip: true }, grid: { display: false }, border: { color: c.border } },
              y: { min: 0, max, ticks: { color: c.muted, stepSize: 0.5 }, grid: { color: c.border }, border: { display: false } },
            },
          }}
        />
      </div>
      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted">
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-5 bg-rose" />{t('opkResult.ratio')}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0 w-5 border-t-2 border-dashed border-gold" />{t('common.status.peak')} {peak.toFixed(1)}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0 w-5 border-t-2 border-dotted border-muted" />{t('common.status.rising')} {rising.toFixed(1)}</span>
      </figcaption>
    </figure>
  );
}

/** Grid of saved urine screenings: rows are parameters, columns are dates. */
export function UrineTrendGrid({ records }: { records: UrineRecord[] }) {
  const { t, formatDate } = useI18n();
  const recent = [...records].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(-8);
  const params = (Object.keys(URINE_PARAMETERS) as UrineParamId[]).filter((p) => recent.some((r) => r.readings.some((x) => x.paramId === p)));
  if (!recent.length) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[28rem] border-separate border-spacing-0 text-label">
        <caption className="sr-only">{t('dashboard.urineTrend')}</caption>
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 bg-panel py-2 pr-3 text-left font-medium text-muted">
              <span className="sr-only">{t('results.resultTitle')}</span>
            </th>
            {recent.map((r) => (
              <th key={r.id} scope="col" className="px-1 py-2 text-center text-caption font-medium text-muted">
                {formatDate(r.createdAt, { day: 'numeric', month: 'short' })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {params.map((p) => (
            <tr key={p}>
              <th scope="row" className="sticky left-0 border-t bg-panel py-2 pr-3 text-left font-normal">
                {t(`params.${p}.name`)}
              </th>
              {recent.map((r) => {
                const reading = r.readings.find((x) => x.paramId === p);
                if (!reading) return <td key={r.id} className="border-t text-center text-muted">–</td>;
                const st = reading.status;
                return (
                  <td key={r.id} className="border-t px-1 py-2 text-center">
                    <Icon name={statusIcon(st)} size={18} className={`inline ${statusTone(st)}`} label={`${t(`common.status.${st}`)}: ${readingLabel(t, p, reading.levelIndex)}`} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const STATUS_POINT = { normal: 'circle', borderline: 'triangle', flagged: 'rectRot', unreadable: 'crossRot' } as const;

/**
 * Urine trends: a stacked overview of how many parameters were normal,
 * borderline or flagged in each screening, and a per-parameter line chart
 * whose y-axis is the strip's own reference scale.
 */
export function UrineTrends({ records, compact = false }: { records: UrineRecord[]; compact?: boolean }) {
  const { t, formatDate } = useI18n();
  const c = useThemeColors();
  const sorted = useMemo(() => [...records].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(-12), [records]);
  const params = useMemo(
    () => (Object.keys(URINE_PARAMETERS) as UrineParamId[]).filter((p) => sorted.some((r) => r.readings.some((x) => x.paramId === p && x.levelIndex !== null))),
    [sorted],
  );
  const defaultParam = useMemo(() => {
    let best: UrineParamId | undefined;
    let bestN = -1;
    for (const p of params) {
      const n = sorted.filter((r) => r.readings.some((x) => x.paramId === p && (x.status === 'borderline' || x.status === 'flagged'))).length;
      if (n > bestN) {
        bestN = n;
        best = p;
      }
    }
    return best;
  }, [params, sorted]);
  const [picked, setPicked] = useState<UrineParamId | null>(null);
  const param = picked && params.includes(picked) ? picked : defaultParam;

  if (!sorted.length) return <p className="text-muted">{t('urineTrend.empty')}</p>;

  const labels = sorted.map((r) => formatDate(r.createdAt, { day: 'numeric', month: 'short' }));
  const count = (r: UrineRecord, s: string) => r.readings.filter((x) => x.status === s).length;
  const scaleOpts = {
    x: { stacked: true, ticks: { color: c.muted, maxRotation: 0, autoSkip: true }, grid: { display: false }, border: { color: c.border } },
    y: { stacked: true, beginAtZero: true, ticks: { color: c.muted, precision: 0 }, grid: { color: c.border }, border: { display: false } },
  };

  const levels = param ? URINE_PARAMETERS[param].levels : [];
  const series = param
    ? sorted.map((r) => {
        const reading = r.readings.find((x) => x.paramId === param);
        return reading && reading.levelIndex !== null ? { y: reading.levelIndex, status: reading.status } : null;
      })
    : [];
  const statusColor = (s: string) => (s === 'flagged' ? c.danger : s === 'borderline' ? c.gold : c.success);

  return (
    <div className="space-y-8">
      <figure>
        <figcaption>
          <p className="font-medium">{t('urineTrend.outsideTitle')}</p>
          <p className="text-label text-muted">{t('urineTrend.outsideLead')}</p>
        </figcaption>
        <div style={{ height: compact ? 160 : 190 }} className="mt-3">
          <Bar
            role="img"
            aria-label={`${t('urineTrend.outsideTitle')}. ${sorted
              .map((r, i) => `${labels[i]}: ${t('results.countsNormal', { n: count(r, 'normal') })}, ${t('results.countsBorderline', { n: count(r, 'borderline') })}, ${t('results.countsFlagged', { n: count(r, 'flagged') })}`)
              .join('; ')}`}
            data={{
              labels,
              datasets: [
                { label: t('common.status.flagged'), data: sorted.map((r) => count(r, 'flagged')), backgroundColor: c.danger, borderRadius: 3, maxBarThickness: 36 },
                { label: t('common.status.borderline'), data: sorted.map((r) => count(r, 'borderline')), backgroundColor: c.gold, borderRadius: 3, maxBarThickness: 36 },
                { label: t('common.status.normal'), data: sorted.map((r) => count(r, 'normal')), backgroundColor: c.success.replace('rgb(', 'rgba(').replace(')', ',0.35)'), borderRadius: 3, maxBarThickness: 36 },
              ],
            }}
            options={{ maintainAspectRatio: false, animation: false, plugins: { legend: { display: false } }, scales: scaleOpts }}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted">
          <span className="inline-flex items-center gap-1.5"><Icon name="octagon" size={14} className="text-danger" />{t('common.status.flagged')}</span>
          <span className="inline-flex items-center gap-1.5"><Icon name="triangle" size={14} className="text-gold" />{t('common.status.borderline')}</span>
          <span className="inline-flex items-center gap-1.5"><Icon name="checkCircle" size={14} className="text-success" />{t('common.status.normal')}</span>
        </div>
      </figure>

      {param && (
        <figure>
          <figcaption className="font-medium">{t('urineTrend.lead')}</figcaption>
          <div role="radiogroup" aria-label={t('urineTrend.parameter')} className="mt-3 flex flex-wrap gap-1.5">
            {params.map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={p === param}
                onClick={() => setPicked(p)}
                className={`min-h-[34px] rounded-full border px-3 text-label ${p === param ? 'border-ink bg-ink text-bg' : 'hover:bg-panel-alt'}`}
              >
                {t(`params.${p}.name`)}
              </button>
            ))}
          </div>
          <div style={{ height: compact ? 200 : 240 }} className="mt-3">
            <Line
              role="img"
              aria-label={`${t(`params.${param}.name`)}: ${sorted
                .map((_, i) => (series[i] ? `${labels[i]} ${readingLabel(t, param, series[i]!.y)} (${t(`common.status.${series[i]!.status}`)})` : null))
                .filter(Boolean)
                .join('; ')}`}
              data={{
                labels,
                datasets: [
                  {
                    label: t(`params.${param}.name`),
                    data: series.map((p) => (p ? p.y : null)),
                    spanGaps: true,
                    borderColor: c.muted,
                    borderWidth: 2,
                    tension: 0.25,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointStyle: series.map((p) => (p ? STATUS_POINT[p.status as keyof typeof STATUS_POINT] : 'circle')),
                    pointBackgroundColor: series.map((p) => (p ? statusColor(p.status) : c.muted)),
                    pointBorderColor: series.map((p) => (p ? statusColor(p.status) : c.muted)),
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                animation: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => {
                        const p = series[ctx.dataIndex];
                        return p ? `${levelLabel(t, levels[p.y])} (${t(`common.status.${p.status}`)})` : '';
                      },
                    },
                  },
                },
                scales: {
                  x: { ticks: { color: c.muted, maxRotation: 0, autoSkip: true }, grid: { display: false }, border: { color: c.border } },
                  y: {
                    min: -0.3,
                    max: levels.length - 0.7,
                    afterBuildTicks: (axis) => {
                      axis.ticks = levels.map((_, i) => ({ value: i }));
                    },
                    ticks: { color: c.muted, callback: (v) => (levels[Number(v)] ? levelLabel(t, levels[Number(v)]) : '') },
                    grid: { color: c.border },
                    border: { display: false },
                  },
                },
              }}
            />
          </div>
          {sorted.length < 2 && <p className="mt-2 text-caption text-muted">{t('urineTrend.single')}</p>}
        </figure>
      )}

      {!compact && (
        <details>
          <summary className="cursor-pointer font-medium">{t('urineTrend.tableTitle')}</summary>
          <div className="mt-3">
            <UrineTrendGrid records={sorted} />
          </div>
        </details>
      )}
    </div>
  );
}
