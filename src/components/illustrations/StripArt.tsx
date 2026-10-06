/**
 * Vector drawing of a test strip with optional detection overlays. Shared by
 * the marketing pages, the capture guide and the hero phone mockup.
 */
export const SAMPLE_PADS = {
  2: ['#7FC4C7', '#CBDC86'],
  3: ['#7FC4C7', '#E3E58C', '#C9C04E'],
  5: ['#7FC4C7', '#F0D2B4', '#F0BE48', '#9FB65A', '#CBDC86'],
  10: ['#7FC4C7', '#F2E6BE', '#F0D2B4', '#8A8F4A', '#F0BE48', '#C9C04E', '#E3E58C', '#F0BA9E', '#F4EAD5', '#E2CFD3'],
} as const;

interface StripArtProps {
  pads?: readonly string[];
  kind?: 'urine' | 'opk';
  cx?: number;
  cy?: number;
  angle?: number;
  length?: number;
  showBoxes?: boolean;
  showOutline?: boolean;
  boxColor?: string;
  outlineColor?: string;
  /** Stagger animation of boxes (CSS). */
  animate?: boolean;
  testStrength?: number;
  labels?: boolean;
}

export function StripArt({
  pads = SAMPLE_PADS[5],
  kind = 'urine',
  cx = 0,
  cy = 0,
  angle = 0,
  length = 300,
  showBoxes = false,
  showOutline = false,
  boxColor = 'rgb(var(--success))',
  outlineColor = 'rgb(var(--rose))',
  animate = false,
  testStrength = 0.75,
  labels = false,
}: StripArtProps) {
  const isOpk = kind === 'opk';
  const units = isOpk ? 14 : 4.2 + pads.length * 1.55 + 0.35;
  const w = length / units;
  const x0 = -length / 2;
  const boxes: { x: number; y: number; w: number; h: number; label?: string }[] = [];
  const els: JSX.Element[] = [];
  if (isOpk) {
    els.push(<rect key="tip" x={x0} y={-w / 2} width={length * 0.16} height={w} fill="#CFE1EE" />);
    els.push(<rect key="brand" x={x0 + length * 0.72} y={-w / 2} width={length * 0.18} height={w} fill="#E7BFCB" />);
    const lw = Math.max(1.5, length * 0.016);
    const lines = [
      { pos: 0.3, a: testStrength, label: 'T' },
      { pos: 0.38, a: 0.8, label: 'C' },
    ];
    for (const l of lines) {
      const x = x0 + length * l.pos;
      els.push(<rect key={l.label} x={x - lw / 2} y={-w * 0.36} width={lw} height={w * 0.72} fill="#7A3E8E" opacity={l.a} />);
      boxes.push({ x: x - lw * 1.6, y: -w * 0.42, w: lw * 3.2, h: w * 0.84, label: l.label });
    }
  } else {
    const pad = w * 0.9;
    const pitch = w * 1.55;
    pads.forEach((c, i) => {
      const x = x0 + w * 4.2 + i * pitch;
      els.push(<rect key={i} x={x} y={-pad / 2} width={pad} height={pad} rx={pad * 0.06} fill={c} />);
      boxes.push({ x: x - w * 0.08, y: -pad / 2 - w * 0.08, w: pad + w * 0.16, h: pad + w * 0.16 });
    });
  }
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${angle})`}>
      <rect x={x0 + w * 0.12} y={-w / 2 + w * 0.12} width={length} height={w} fill="rgb(0 0 0 / 0.18)" rx={w * 0.08} />
      <rect x={x0} y={-w / 2} width={length} height={w} fill="#F3F2EC" rx={w * 0.08} />
      {els}
      {showOutline && (
        <rect
          x={x0 - w * 0.25}
          y={-w / 2 - w * 0.25}
          width={length + w * 0.5}
          height={w * 1.5}
          rx={w * 0.2}
          fill="none"
          stroke={outlineColor}
          strokeWidth={Math.max(1.5, w * 0.08)}
          className={animate ? 'draw-in' : undefined}
          style={animate ? ({ ['--dash' as string]: `${(length + w * 2) * 2.2}` } as React.CSSProperties) : undefined}
        />
      )}
      {showBoxes &&
        boxes.map((b, i) => (
          <g key={i} className={animate ? 'animate-pop' : undefined} style={animate ? { animationDelay: `${0.25 + i * 0.08}s`, transformOrigin: `${b.x + b.w / 2}px ${b.y + b.h / 2}px`, transformBox: 'fill-box' } : undefined}>
            <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="none" stroke={boxColor} strokeWidth={Math.max(1.2, w * 0.06)} rx={w * 0.06} />
            {labels && b.label && (
              <text x={b.x + b.w / 2} y={b.y - w * 0.25} textAnchor="middle" fontSize={w * 0.5} fill={boxColor} fontFamily="IBM Plex Sans" fontWeight={500}>
                {b.label}
              </text>
            )}
          </g>
        ))}
    </g>
  );
}
