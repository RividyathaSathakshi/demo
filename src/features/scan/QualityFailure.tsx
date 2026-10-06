import { useI18n, type TKey } from '../../i18n';
import { Button } from '../../components/ui';
import { Icon } from '../../components/Icon';
import type { PipelineIssue, ScanReport } from '../../cv/pipeline';
import { RgbaCanvas, quadPoints } from './RgbaCanvas';

type Check = 'strip' | 'entire' | 'brightness' | 'glare' | 'sharpness' | 'orientation' | 'regions' | 'obstruction' | 'color';

const CHECK_ISSUES: Record<Check, PipelineIssue[]> = {
  strip: ['noStrip'],
  entire: ['partial'],
  brightness: ['tooDark'],
  glare: ['glare'],
  sharpness: ['blurry', 'tooFar'],
  orientation: ['noStrip'],
  regions: ['noRegions', 'controlMissing', 'colorMismatch'],
  obstruction: ['obstruction'],
  color: ['colorCast'],
};

interface Props {
  report: ScanReport;
  onRetake: () => void;
  onManual: () => void;
}

export function QualityFailure({ report, onRetake, onManual }: Props) {
  const { t } = useI18n();
  const issues = report.issues;
  const stripMissing = issues.includes('noStrip');
  const status = (c: Check): 'pass' | 'fail' | 'skipped' => {
    if (CHECK_ISSUES[c].some((i) => issues.includes(i))) return 'fail';
    if (stripMissing && c !== 'strip') return 'skipped';
    if (c === 'regions' && issues.length && !report.regionCount) return 'skipped';
    return 'pass';
  };
  return (
    <div className="container-page max-w-4xl py-8 sm:py-12">
      <div className="flex items-start gap-3">
        <Icon name="triangle" size={30} className="mt-1 shrink-0 text-gold" />
        <div>
          <h1 className="text-h2 sm:text-h1">{t('quality.title')}</h1>
          <p className="mt-2 text-body-lg">{t(`quality.issues.${issues[0]}` as TKey)}</p>
          {issues.length > 1 && (
            <ul className="mt-3 space-y-1.5 text-muted">
              {issues.slice(1).map((i) => (
                <li key={i} className="flex gap-2">
                  <Icon name="info" size={18} className="mt-0.5 shrink-0" />
                  {t(`quality.issues.${i}` as TKey)}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-label text-muted">{t('quality.lead')}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button size="lg" icon="camera" onClick={onRetake}>
          {t('common.buttons.retake')}
        </Button>
        <Button size="lg" variant="secondary" icon="edit" onClick={onManual}>
          {t('common.buttons.manualEntry')}
        </Button>
      </div>

      <div className="mt-10 grid gap-8 md:grid-cols-[1.2fr_1fr]">
        <RgbaCanvas image={report.frame} label={t('detection.imageLabel')} className="overflow-hidden rounded-xl border">
          {report.stripCorners && <polygon points={quadPoints(report.stripCorners)} fill="none" stroke="#E0A94F" strokeWidth={3} />}
        </RgbaCanvas>
        <div>
          <h2 className="text-h3">{t('quality.checksTitle')}</h2>
          <ul className="mt-3 divide-y border-y">
            {(Object.keys(CHECK_ISSUES) as Check[]).map((c) => {
              const s = status(c);
              return (
                <li key={c} className="flex items-center gap-3 py-2.5">
                  <Icon
                    name={s === 'pass' ? 'checkCircle' : s === 'fail' ? 'octagon' : 'question'}
                    size={20}
                    className={s === 'pass' ? 'text-success' : s === 'fail' ? 'text-danger' : 'text-muted'}
                    label={s === 'pass' ? 'OK' : s === 'fail' ? '!' : '?'}
                  />
                  <span className={s === 'skipped' ? 'text-muted' : ''}>{t(`quality.checks.${c}`)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
