import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useI18n } from '../i18n';
import { useThemeColors } from './useThemeColors';
import { Icon } from './Icon';
import { URINE_PARAMETERS, type UrineParamId } from '../config/strips';
import type { OpkRecord, UrineRecord } from '../store/types';
import { statusIcon, statusTone } from './ui';
import { readingLabel } from '../features/results/format';
import { OPK_PRODUCTS } from '../config/strips';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler);

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
