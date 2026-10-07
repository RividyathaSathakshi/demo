import { useI18n } from '../../i18n';
import { Icon } from '../Icon';
import { StripArt, SAMPLE_PADS } from './StripArt';

type Bad = 'cut' | 'shadow' | 'glare' | 'blur' | 'finger' | 'angle';

function Scene({ variant, kind }: { variant: 'good' | Bad; kind: 'urine' | 'opk' }) {
  const pads = SAMPLE_PADS[5];
  return (
    <svg viewBox="0 0 160 110" className="block h-auto w-full rounded-lg" aria-hidden="true">
      <defs>
        <filter id={`blur-${variant}`}>
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
        <radialGradient id="glare-g">
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="shadow-g" x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.6" />
          <stop offset="0.6" stopColor="#000" stopOpacity="0.15" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="160" height="110" fill="#3A4560" />
      <g filter={variant === 'blur' ? `url(#blur-${variant})` : undefined}>
        {variant === 'angle' ? (
          <g transform="translate(80 58) scale(1 0.55) skewX(-28)">
            <StripArt pads={pads} kind={kind} length={120} />
          </g>
        ) : (
          <StripArt pads={pads} kind={kind} cx={variant === 'cut' ? 118 : 80} cy={55} length={kind === 'opk' ? 136 : 124} />
        )}
      </g>
      {variant === 'shadow' && <rect width="110" height="110" fill="url(#shadow-g)" />}
      {variant === 'glare' && <ellipse cx="88" cy="52" rx="34" ry="24" fill="url(#glare-g)" />}
      {variant === 'finger' && <ellipse cx={kind === 'opk' ? 60 : 96} cy="64" rx="15" ry="26" fill="#D9A585" stroke="#B9846A" />}
      {variant === 'good' && <rect x="8" y="8" width="144" height="94" rx="8" fill="none" stroke="#5FB894" strokeWidth="2" strokeDasharray="5 4" />}
    </svg>
  );
}

export function CaptureGuide({ kind = 'urine' }: { kind?: 'urine' | 'opk' }) {
  const { t, tl } = useI18n();
  const bad = tl('instructions.bad');
  const variants: Bad[] = ['cut', 'shadow', 'glare', 'blur', 'finger', 'angle'];
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
      <section aria-labelledby="good-h" className="rounded-2xl border border-success/40 bg-success/5 p-4">
        <h3 id="good-h" className="flex items-center gap-2 text-h3">
          <Icon name="checkCircle" className="text-success" size={24} /> {t('instructions.goodTitle')}
        </h3>
        <div className="mt-3">
          <Scene variant="good" kind={kind} />
        </div>
        <ul className="mt-3 space-y-1.5 text-label">
          {tl('instructions.good').map((g) => (
            <li key={g} className="flex items-center gap-2">
              <Icon name="check" size={16} className="text-success" /> {g}
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="bad-h" className="rounded-2xl border border-danger/35 bg-danger/5 p-4">
        <h3 id="bad-h" className="flex items-center gap-2 text-h3">
          <Icon name="close" className="text-danger" size={24} /> {t('instructions.badTitle')}
        </h3>
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {variants.map((v, i) => (
            <li key={v}>
              <Scene variant={v} kind={kind} />
              <p className="mt-1.5 flex items-start gap-1.5 text-caption">
                <Icon name="close" size={14} className="mt-[1px] shrink-0 text-danger" /> {bad[i]}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
