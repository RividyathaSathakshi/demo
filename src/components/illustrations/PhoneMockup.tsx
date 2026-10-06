import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n';
import { Icon } from '../Icon';
import { StripArt, SAMPLE_PADS } from './StripArt';

const STAGES = ['searching', 'detected', 'regions', 'ready', 'result'] as const;

/** Animated phone showing the scanner: detect, orient, count regions, result. */
export function PhoneMockup() {
  const { t } = useI18n();
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [stage, setStage] = useState(reduced ? 4 : 0);
  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setStage((s) => (s + 1) % STAGES.length), 1700);
    return () => window.clearInterval(id);
  }, [reduced]);
  const s = STAGES[stage];
  const message = {
    searching: t('home.mock.searching'),
    detected: t('home.mock.detected'),
    regions: t('home.mock.regions'),
    ready: t('home.mock.ready'),
    result: t('home.mock.ready'),
  }[s];
  return (
    <figure className="relative mx-auto w-[min(300px,78vw)]" aria-label={t('home.hero.mockLabel')} role="img">
      <div className="relative aspect-[9/19] rounded-[2.6rem] border-[10px] border-[#0E1120] bg-[#0E1120] shadow-[0_30px_60px_-30px_rgba(20,24,42,0.55)]">
        <div className="absolute left-1/2 top-2 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-[#0E1120]" />
        <div className="relative h-full overflow-hidden rounded-[2rem] bg-[#2B3245]">
          <svg viewBox="0 0 280 590" className="absolute inset-0 h-full w-full" aria-hidden="true">
            <defs>
              <pattern id="tex" width="6" height="6" patternUnits="userSpaceOnUse">
                <rect width="6" height="6" fill="#39415A" />
                <circle cx="1" cy="1" r="0.7" fill="#424B66" />
              </pattern>
            </defs>
            <rect width="280" height="590" fill="url(#tex)" />
            <StripArt
              pads={SAMPLE_PADS[5]}
              cx={140}
              cy={280}
              angle={-62}
              length={330}
              showOutline={stage >= 1}
              showBoxes={stage >= 2}
              animate
              outlineColor="#F3EFE6"
              boxColor={stage >= 3 ? '#5FB894' : '#E0A94F'}
            />
            {stage === 0 && (
              <g stroke="#F3EFE6" strokeWidth="3" fill="none" opacity="0.8">
                <path d="M40 120v-30h30M240 120v-30h-30M40 450v30h30M240 450v30h-30" />
              </g>
            )}
          </svg>
          <div className="absolute inset-x-0 top-8 flex justify-center">
            <span key={s} className="animate-rise inline-flex items-center gap-1.5 rounded-full bg-[#14182A]/85 px-3 py-1.5 text-caption font-medium text-[#F3EFE6]">
              <Icon name={stage >= 3 ? 'checkCircle' : stage >= 1 ? 'scan' : 'rotate'} size={14} className={stage >= 3 ? 'text-[#5FB894]' : 'text-[#E0A94F]'} />
              {message}
            </span>
          </div>
          {stage >= 1 && stage < 4 && (
            <div className="absolute left-3 top-[4.5rem] rounded-md bg-[#14182A]/75 px-2 py-1 text-[10px] text-[#F3EFE6]/90">
              {t('home.mock.rotated')}
            </div>
          )}
          <div className="absolute inset-x-0 bottom-5 flex justify-center">
            <span className={`grid h-14 w-14 place-items-center rounded-full border-4 border-[#F3EFE6] ${stage === 3 ? 'animate-pulse-ring bg-[#F3EFE6]/30' : 'bg-transparent'}`} />
          </div>
          {stage === 4 && (
            <div className="animate-rise absolute inset-x-2 bottom-2 rounded-2xl bg-[#FAF6F0] p-3.5 text-[#1E2438]">
              <p className="text-[11px] text-[#5B6178]">{t('home.mock.resultTitle')}</p>
              <p className="font-display text-[17px] leading-6">{t('home.mock.resultLine')}</p>
              <div className="mt-2 flex gap-1.5">
                {SAMPLE_PADS[5].map((c, i) => (
                  <span key={i} className="flex h-6 flex-1 items-center justify-center rounded border border-black/10" style={{ background: c }}>
                    <Icon name={i === 4 ? 'triangle' : 'check'} size={12} className="text-[#1E2438]" />
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </figure>
  );
}
