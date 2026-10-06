import { useI18n, type TKey } from '../../i18n';
import { StripArt, SAMPLE_PADS } from './StripArt';

const STEPS = ['camera', 'strip', 'orientation', 'normalize', 'regions', 'sampling', 'reference', 'result'] as const;

function Visual({ step }: { step: (typeof STEPS)[number] }) {
  const pads = SAMPLE_PADS[5];
  const bg = <rect width="200" height="110" rx="10" fill="#2F3750" />;
  switch (step) {
    case 'camera':
      return (
        <>
          {bg}
          <StripArt pads={pads} cx={100} cy={55} angle={-24} length={150} />
        </>
      );
    case 'strip':
      return (
        <>
          <rect width="200" height="110" rx="10" fill="#14182A" />
          <g transform="translate(100 55) rotate(-24)">
            <rect x="-75" y="-8" width="150" height="16" fill="#F3EFE6" />
          </g>
        </>
      );
    case 'orientation':
      return (
        <>
          {bg}
          <StripArt pads={pads} cx={100} cy={55} angle={-24} length={150} showOutline outlineColor="#F3EFE6" />
          <g transform="translate(100 55) rotate(-24)" stroke="#E0A94F" strokeWidth="1.8" strokeDasharray="4 3">
            <line x1="-95" y1="0" x2="95" y2="0" />
          </g>
          <path d="M150 55 A50 50 0 0 0 145.7 35" fill="none" stroke="#E0A94F" strokeWidth="1.8" />
          <text x="156" y="44" fontSize="11" fill="#F3EFE6" fontFamily="IBM Plex Sans">24°</text>
        </>
      );
    case 'normalize':
      return (
        <>
          {bg}
          <StripArt pads={pads} cx={100} cy={55} length={170} />
        </>
      );
    case 'regions':
      return (
        <>
          {bg}
          <StripArt pads={pads} cx={100} cy={45} length={170} showBoxes boxColor="#5FB894" />
          <polyline
            points="15,95 50,95 55,95 72,82 80,82 86,95 90,95 97,80 104,80 110,95 115,95 120,84 127,84 133,95 138,95 144,86 151,86 157,95 185,95"
            fill="none"
            stroke="#E0A94F"
            strokeWidth="1.6"
          />
        </>
      );
    case 'sampling':
      return (
        <>
          {bg}
          {pads.map((c, i) => (
            <g key={i}>
              <rect x={22 + i * 34} y={28} width={26} height={26} rx={3} fill={c} />
              <circle cx={35 + i * 34} cy={41} r={5} fill="none" stroke="#14182A" strokeWidth={1.4} />
              <rect x={22 + i * 34} y={66} width={26} height={14} rx={2} fill={c} stroke="#F3EFE6" strokeWidth={1} />
            </g>
          ))}
        </>
      );
    case 'reference':
      return (
        <>
          {bg}
          {['#E3E58C', '#CBDC86', '#AED18C', '#8BC39A', '#66AC9C'].map((c, i) => (
            <rect key={i} x={24 + i * 32} y={22} width={26} height={26} rx={3} fill={c} stroke={i === 1 ? '#F3EFE6' : 'none'} strokeWidth={2} />
          ))}
          <rect x={56} y={66} width={26} height={26} rx={3} fill="#CDDB88" />
          <path d="M69 64 L69 52" stroke="#F3EFE6" strokeWidth="1.5" />
          <text x={92} y={84} fontSize="11" fill="#F3EFE6" fontFamily="IBM Plex Sans">ΔE00 = 2.1</text>
        </>
      );
    case 'result':
      return (
        <>
          <rect width="200" height="110" rx="10" fill="#FAF6F0" />
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(18 ${18 + i * 28})`}>
              <circle cx="8" cy="8" r="7" fill="none" stroke={i === 2 ? '#C98A3D' : '#3E8A6D'} strokeWidth="1.8" />
              <rect x="24" y="3" width={i === 2 ? 70 : 90} height="9" rx="4" fill="#1E2438" opacity="0.75" />
              <rect x="120" y="3" width="44" height="9" rx="4" fill={i === 2 ? '#C98A3D' : '#3E8A6D'} opacity="0.35" />
            </g>
          ))}
        </>
      );
  }
}

/** Vertical, numbered pipeline from camera image to screening result. */
export function PipelineDiagram() {
  const { t } = useI18n();
  return (
    <ol className="relative">
      {STEPS.map((step, i) => (
        <li key={step} className="relative grid gap-4 pb-8 last:pb-0 sm:grid-cols-[3rem_13rem_1fr] sm:gap-6">
          {i < STEPS.length - 1 && <span aria-hidden="true" className="absolute left-[1.15rem] top-10 hidden h-[calc(100%-2.5rem)] w-px bg-[color:var(--border-strong)] sm:block" />}
          <span className="font-display text-h2 leading-none text-rose tabular-nums" aria-hidden="true">
            {String(i + 1).padStart(2, '0')}
          </span>
          <svg viewBox="0 0 200 110" className="w-full max-w-[13rem] rounded-[10px]" aria-hidden="true">
            <Visual step={step} />
          </svg>
          <div>
            <h3 className="text-h3">{t(`home.tech.steps.${step}.title` as TKey)}</h3>
            <p className="mt-1 max-w-prose text-muted">{t(`home.tech.steps.${step}.body` as TKey)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
