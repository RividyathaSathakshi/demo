import { useI18n } from '../../i18n';
import { Button } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { SUPPORTED_PAD_COUNTS } from '../../config/strips';
import type { ScanReport } from '../../cv/pipeline';
import { RgbaCanvas, quadPoints } from './RgbaCanvas';

export function UnsupportedStrip({ report, onRetake, onManual, onChoose }: { report: ScanReport; onRetake: () => void; onManual: () => void; onChoose: () => void }) {
  const { t } = useI18n();
  return (
    <div className="container-page max-w-4xl py-8 sm:py-12">
      <div className="flex items-start gap-3">
        <Icon name="question" size={30} className="mt-1 shrink-0 text-gold" />
        <div>
          <h1 className="text-h2 sm:text-h1">{t('unsupported.title')}</h1>
          <p className="mt-2 text-body-lg">{t('unsupported.body', { n: report.regionCount })}</p>
          <p className="mt-2 text-muted">{t('unsupported.supported', { list: SUPPORTED_PAD_COUNTS.join(', ') })}</p>
          <p className="mt-2 text-muted">{t('unsupported.options')}</p>
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button size="lg" icon="camera" onClick={onRetake}>
          {t('common.buttons.retake')}
        </Button>
        <Button size="lg" variant="secondary" icon="layers" onClick={onChoose}>
          {t('common.buttons.chooseStrip')}
        </Button>
        <Button size="lg" variant="ghost" icon="edit" onClick={onManual}>
          {t('common.buttons.manualEntry')}
        </Button>
      </div>
      <RgbaCanvas image={report.frame} label={t('detection.imageLabel')} className="mt-8 overflow-hidden rounded-xl border">
        {report.stripCorners && <polygon points={quadPoints(report.stripCorners)} fill="none" stroke="#F3EFE6" strokeWidth={3} />}
        {report.overlays.map((o, i) => (
          <polygon key={i} points={quadPoints(o.quad)} fill="none" stroke="#E0A94F" strokeWidth={2.5} />
        ))}
      </RgbaCanvas>
    </div>
  );
}
