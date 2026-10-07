import { phaseOfDay, type CyclePhase } from '../health/cycle';

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

export const PHASE_STROKE: Record<CyclePhase, string> = {
  menstrual: 'rgb(var(--rose))',
  follicular: 'rgb(var(--success) / 0.55)',
  ovulation: 'rgb(var(--gold))',
  luteal: 'rgb(var(--muted) / 0.45)',
};

function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p = (a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${x0} ${y0} A${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}

/** Circular overview of the cycle: four phases, fertile window and today. */
export function CycleRing({ day, length, periodLength, fertileStart, fertileEnd, ovulationDay, size = 220, label, centerTop, centerMain, centerSub }: CycleRingProps) {
  const c = 110;
  const r = 84;
  const ang = (d: number) => -Math.PI / 2 + ((d - 1) / length) * Math.PI * 2;
  const segments: { phase: CyclePhase; from: number; to: number }[] = [];
  for (let d = 1; d <= length; d++) {
    const phase = phaseOfDay(d, { periodLength, ovulationDay });
    const last = segments[segments.length - 1];
    if (last && last.phase === phase) last.to = d;
    else segments.push({ phase, from: d, to: d });
  }
  const todayA = ang(Math.min(Math.max(day, 1), length) + 0.5);
  const ovuA = ang(ovulationDay + 0.5);
  return (
    <svg viewBox="0 0 220 220" width={size} height={size} role="img" aria-label={label} className="max-w-full">
      {segments.map((s) => (
        <path key={s.phase + s.from} d={arc(c, c, r, ang(s.from) + 0.012, ang(s.to + 1) - 0.012)} fill="none" stroke={PHASE_STROKE[s.phase]} strokeWidth="14" />
      ))}
      <path d={arc(c, c, r + 13, ang(fertileStart), ang(fertileEnd + 1))} fill="none" stroke="rgb(var(--gold))" strokeWidth="3" strokeDasharray="4 3" strokeLinecap="round" />
      <circle cx={c + r * Math.cos(ovuA)} cy={c + r * Math.sin(ovuA)} r="6" fill="rgb(var(--panel))" stroke="rgb(var(--gold))" strokeWidth="3" />
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
