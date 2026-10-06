interface CycleRingProps {
  day: number;
  length: number;
  periodLength: number;
  fertileStart: number;
  fertileEnd: number;
  ovulationDay: number;
  size?: number;
  label: string;
  centerTop?: string;
  centerMain?: string;
  centerSub?: string;
}

function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p = (a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${x0} ${y0} A${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}

/** Circular overview of the cycle: period, fertile window, ovulation and today. */
export function CycleRing({ day, length, periodLength, fertileStart, fertileEnd, ovulationDay, size = 220, label, centerTop, centerMain, centerSub }: CycleRingProps) {
  const c = 110;
  const r = 88;
  const ang = (d: number) => -Math.PI / 2 + ((d - 1) / length) * Math.PI * 2;
  const seg = (from: number, to: number) => arc(c, c, r, ang(from), ang(to + 1) - 0.02);
  const todayA = ang(Math.min(Math.max(day, 1), length) + 0.5);
  const ovuA = ang(ovulationDay + 0.5);
  return (
    <svg viewBox="0 0 220 220" width={size} height={size} role="img" aria-label={label} className="max-w-full">
      <circle cx={c} cy={c} r={r} fill="none" stroke="var(--border-strong)" strokeWidth="12" />
      <path d={seg(1, periodLength)} fill="none" stroke="rgb(var(--rose))" strokeWidth="12" strokeLinecap="butt" />
      <path d={seg(fertileStart, fertileEnd)} fill="none" stroke="rgb(var(--gold))" strokeWidth="12" strokeDasharray="3 2.5" />
      <circle cx={c + r * Math.cos(ovuA)} cy={c + r * Math.sin(ovuA)} r="7" fill="rgb(var(--panel))" stroke="rgb(var(--gold))" strokeWidth="3" />
      <circle cx={c + r * Math.cos(todayA)} cy={c + r * Math.sin(todayA)} r="11" fill="rgb(var(--ink))" stroke="rgb(var(--panel))" strokeWidth="3" />
      {centerTop && (
        <text x={c} y={c - 26} textAnchor="middle" fontSize="13" fill="rgb(var(--muted))" fontFamily="IBM Plex Sans">
          {centerTop}
        </text>
      )}
      {centerMain && (
        <text x={c} y={c + 14} textAnchor="middle" fontSize="44" fill="rgb(var(--ink))" fontFamily="Fraunces, Georgia, serif" fontWeight={500}>
          {centerMain}
        </text>
      )}
      {centerSub && (
        <text x={c} y={c + 38} textAnchor="middle" fontSize="12.5" fill="rgb(var(--muted))" fontFamily="IBM Plex Sans">
          {centerSub}
        </text>
      )}
    </svg>
  );
}
