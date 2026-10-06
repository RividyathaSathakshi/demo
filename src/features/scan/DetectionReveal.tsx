import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n';
import { Icon } from '../../components/Icon';
import type { ScanReport } from '../../cv/pipeline';
import { RgbaCanvas, quadPoints } from './RgbaCanvas';

/**
 * Brief confirmation of what was detected (strip outline, region boxes,
 * orientation), then "Analyzing", then the caller shows the result.
 */
export function DetectionReveal({ report, onDone }: { report: ScanReport; onDone: () => void }) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<'detected' | 'analyzing'>('detected');
  useEffect(() => {
    const a = window.setTimeout(() => setPhase('analyzing'), 1500);
    const b = window.setTimeout(onDone, 2400);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [onDone]);
  const isUrine = report.module === 'urine';
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-[#0E1120] p-4 text-[#F3EFE6]">
      <div className="w-full max-w-xl">
        <RgbaCanvas image={report.frame} label={t('detection.imageLabel')} className="overflow-hidden rounded-2xl">
          {report.stripCorners && (
            <polygon points={quadPoints(report.stripCorners)} fill="none" stroke="#F3EFE6" strokeWidth={Math.max(3, report.frame.width / 200)} className="animate-pop" />
          )}
          {report.overlays.map((o, i) => (
            <g key={i} className="animate-pop" style={{ animationDelay: `${0.2 + i * 0.06}s`, transformBox: 'fill-box', transformOrigin: 'center' }}>
              <polygon points={quadPoints(o.quad)} fill="rgba(95,184,148,0.12)" stroke="#5FB894" strokeWidth={Math.max(2.5, report.frame.width / 220)} />
            </g>
          ))}
        </RgbaCanvas>
      </div>
      <div className="text-center" aria-live="polite">
        <p className="flex items-center justify-center gap-2 text-h3 font-display">
          <Icon name="checkCircle" size={24} className="text-[#5FB894]" />
          {t('detection.stripDetected')}
        </p>
        <p className="mt-1 text-body-lg">
          {isUrine ? t('detection.regions', { n: report.regionCount }) : t('detection.lines', { n: report.regionCount })}
        </p>
        {report.orientation && (
          <p className="mt-1 text-label text-[#F3EFE6]/75">
            {t('common.orientationWithAngle', { orientation: t(`common.orientation.${report.orientation}`), angle: Math.abs(report.angleDeg) })}
          </p>
        )}
        <p className={`mt-4 inline-flex items-center gap-2 text-label ${phase === 'analyzing' ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
          <span className="h-2 w-2 animate-ping rounded-full bg-[#E0A94F]" />
          {t('detection.analyzing')}
        </p>
      </div>
    </div>
  );
}

export function CheckingOverlay() {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#0E1120] text-[#F3EFE6]" role="status">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-24 w-40 overflow-hidden rounded-lg border border-[#F3EFE6]/30">
          <div className="animate-sweep absolute inset-x-0 h-1 bg-[#E0A94F]" />
        </div>
        <p className="text-body-lg">{t('checking.title')}</p>
      </div>
    </div>
  );
}
