/**
 * Stage 4 (ovulation / OPK strips): find the control (C) and test (T) lines.
 *
 * Lines are narrow bands that span the strip width. For every column we
 * measure optical density in the green channel (magenta/purple dye absorbs
 * green most strongly), relative to a running-median baseline so that printing,
 * the absorbent tip and lighting gradients are ignored. A candidate line must
 * be narrow and must appear in all three sub-bands across the strip, which
 * rejects specks and printed text.
 *
 *   intensity = log10(I_background / I_line)   (Beer-Lambert style optical density)
 *   R = intensity(T) / intensity(C)
 */
import { linearChannel } from './color';
import { median, runningMedian, smooth } from './stats';
import type { NormalizedStrip } from './normalize';

export interface DetectedLine {
  x: number;
  /** Optical density above the local baseline. */
  intensity: number;
  width: number;
}

export interface LineAnalysis {
  control: DetectedLine | null;
  test: DetectedLine | null;
  candidates: DetectedLine[];
  /** Whether the C/T assignment came from the strip geometry or from the default rule. */
  assignment: 'geometry' | 'default';
  bandY0: number;
  bandY1: number;
}

export const MIN_LINE_OD = 0.035;

function greenProfile(strip: NormalizedStrip, y0: number, y1: number): Float32Array {
  const img = strip.image;
  const W = img.width;
  const out = new Float32Array(W);
  const vals: number[] = [];
  for (let x = 0; x < W; x++) {
    vals.length = 0;
    for (let y = y0; y < y1; y++) vals.push(img.data[(y * W + x) * 4 + 1]);
    out[x] = Math.max(1e-4, linearChannel(median(vals)));
  }
  return out;
}

function odProfile(g: Float32Array, radius: number): Float32Array {
  const base = runningMedian(g, radius);
  const od = new Float32Array(g.length);
  for (let i = 0; i < g.length; i++) od[i] = Math.max(0, Math.log10(base[i] / g[i]));
  return od;
}

export function detectLines(strip: NormalizedStrip, swap = false): LineAnalysis {
  const W = strip.image.width;
  const H = strip.stripBottom - strip.stripTop;
  const bandY0 = Math.round(strip.stripTop + H * 0.22);
  const bandY1 = Math.round(strip.stripBottom - H * 0.22);
  const radius = Math.max(4, Math.round(W * 0.035));
  const smoothR = Math.max(0, Math.round(W * 0.0015));
  const full = smooth(odProfile(greenProfile(strip, bandY0, bandY1), radius), smoothR);
  const third = (bandY1 - bandY0) / 3;
  const subs = [0, 1, 2].map((k) =>
    smooth(odProfile(greenProfile(strip, Math.round(bandY0 + k * third), Math.round(bandY0 + (k + 1) * third)), radius), smoothR),
  );

  const maxLineWidth = Math.max(3, W * 0.03);
  const candidates: DetectedLine[] = [];
  const edge = Math.max(3, W * 0.02);
  for (let x = Math.ceil(edge); x < W - edge; x++) {
    const v = full[x];
    if (v < MIN_LINE_OD) continue;
    if (v < full[x - 1] || v < full[x + 1]) continue;
    // Plateau guard: only take the first sample of a flat top.
    if (v === full[x - 1]) continue;
    // Full width at half maximum.
    let l = x;
    let r = x;
    while (l > 0 && full[l - 1] > v / 2) l--;
    while (r < W - 1 && full[r + 1] > v / 2) r++;
    const width = r - l + 1;
    if (width > maxLineWidth) continue;
    const across = subs.map((s) => Math.max(s[x - 1], s[x], s[x + 1]));
    if (Math.min(...across) < v * 0.45) continue;
    const intensity = across.reduce((a, b) => a + b, 0) / 3;
    candidates.push({ x, intensity, width });
  }
  // Non-maximum suppression within one line width.
  candidates.sort((a, b) => b.intensity - a.intensity);
  const kept: DetectedLine[] = [];
  for (const c of candidates) if (!kept.some((k) => Math.abs(k.x - c.x) < maxLineWidth)) kept.push(c);

  const minSep = W * 0.025;
  const maxSep = W * 0.2;
  let best: [DetectedLine, DetectedLine] | null = null;
  let bestScore = 0;
  for (let i = 0; i < kept.length; i++) {
    for (let j = i + 1; j < kept.length; j++) {
      const sep = Math.abs(kept[i].x - kept[j].x);
      if (sep < minSep || sep > maxSep) continue;
      const score = kept[i].intensity + kept[j].intensity;
      if (score > bestScore) {
        bestScore = score;
        best = [kept[i], kept[j]];
      }
    }
  }

  let control: DetectedLine | null = null;
  let test: DetectedLine | null = null;
  let assignment: LineAnalysis['assignment'] = 'default';
  if (best) {
    const [a, b] = best[0].x < best[1].x ? best : [best[1], best[0]];
    const centre = (a.x + b.x) / 2 / W;
    // The result window sits nearer the dip end; the control line is the one
    // farther from it, i.e. nearer the handle.
    let controlIsB = true;
    if (centre < 0.45) { controlIsB = true; assignment = 'geometry'; }
    else if (centre > 0.55) { controlIsB = false; assignment = 'geometry'; }
    if (swap) controlIsB = !controlIsB;
    control = controlIsB ? b : a;
    test = controlIsB ? a : b;
  } else if (kept.length) {
    control = kept[0];
  }
  return { control, test, candidates: kept, assignment, bandY0, bandY1 };
}
