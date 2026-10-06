/**
 * Image-quality gate. Nothing is analysed unless the capture passes; each
 * failed check maps to a specific, actionable message for the user.
 */
import { rgbToLab } from './color';
import { median, percentile } from './stats';
import type { StripDetection } from './detectStrip';
import type { NormalizedStrip } from './normalize';

export type QualityIssue =
  | 'noStrip'
  | 'partial'
  | 'obstruction'
  | 'tooFar'
  | 'tooDark'
  | 'glare'
  | 'blurry'
  | 'colorCast';

export interface QualityMetrics {
  backingLightness: number;
  backingChroma: number;
  clippedFraction: number;
  /** Estimated edge blur (Gaussian sigma) relative to strip width; null if not measurable. */
  blur: number | null;
  stripWidthPx: number;
}

export interface QualityReport {
  issues: QualityIssue[];
  metrics: QualityMetrics;
}

export const QUALITY_LIMITS = {
  minLightness: 42,
  maxChroma: 20,
  maxClipped: 0.04,
  maxBlur: 0.075,
  minStripWidthPx: 14,
  maxWidthIrregularity: 0.15,
  minRectangularity: 0.72,
};

/** Estimates blur from the strip's long edges using the steepest gradient. */
export function measureEdgeBlur(strip: NormalizedStrip): number | null {
  const img = strip.image;
  const W = img.width;
  const H = strip.stripBottom - strip.stripTop;
  const rows: number[] = [];
  const vals: number[] = [];
  const step = Math.max(1, Math.floor(W / 150));
  for (let y = 0; y < img.height; y++) {
    vals.length = 0;
    for (let x = Math.floor(W * 0.05); x < W * 0.95; x += step) {
      const p = (y * W + x) * 4;
      vals.push(0.299 * img.data[p] + 0.587 * img.data[p + 1] + 0.114 * img.data[p + 2]);
    }
    rows.push(median(vals));
  }
  const estimates: number[] = [];
  for (const edgeY of [strip.stripTop, strip.stripBottom]) {
    const win = Math.max(3, Math.round(H * 0.2));
    const lo = Math.max(1, edgeY - win);
    const hi = Math.min(rows.length - 2, edgeY + win);
    const outsideRow = edgeY === strip.stripTop ? Math.max(0, lo - 1) : Math.min(rows.length - 1, hi + 1);
    const insideRow = edgeY === strip.stripTop ? Math.min(rows.length - 1, edgeY + win) : Math.max(0, edgeY - win);
    const contrast = Math.abs(rows[insideRow] - rows[outsideRow]);
    if (contrast < 12) continue;
    let dmax = 0;
    for (let y = lo; y <= hi; y++) dmax = Math.max(dmax, Math.abs(rows[y + 1] - rows[y - 1]) / 2);
    if (dmax <= 0) continue;
    const sigma = contrast / (dmax * Math.sqrt(2 * Math.PI));
    estimates.push(sigma / Math.max(1, H));
  }
  return estimates.length ? Math.min(...estimates) : null;
}

export function assessQuality(detection: StripDetection, strip: NormalizedStrip): QualityReport {
  const img = strip.image;
  const W = img.width;
  const Ls: number[] = [];
  const as: number[] = [];
  const bs: number[] = [];
  let clipped = 0;
  let total = 0;
  const step = Math.max(1, Math.floor(W / 300));
  for (let y = strip.stripTop + 1; y < strip.stripBottom - 1; y++) {
    for (let x = 0; x < W; x += step) {
      const p = (y * W + x) * 4;
      const r = img.data[p];
      const g = img.data[p + 1];
      const b = img.data[p + 2];
      total++;
      if (Math.min(r, g, b) >= 250) clipped++;
      const lab = rgbToLab(r, g, b);
      Ls.push(lab[0]);
      as.push(lab[1]);
      bs.push(lab[2]);
    }
  }
  // The backing is the brightest large population on the strip.
  const cut = percentile(Ls, 65);
  const idx = Ls.map((l, i) => (l >= cut ? i : -1)).filter((i) => i >= 0);
  const backingLightness = median(idx.map((i) => Ls[i]));
  const backingChroma = Math.hypot(median(idx.map((i) => as[i])), median(idx.map((i) => bs[i])));
  const clippedFraction = total ? clipped / total : 0;
  const blur = measureEdgeBlur(strip);
  const stripWidthPx = detection.rect.width;

  const issues: QualityIssue[] = [];
  if (detection.touchesBorder) issues.push('partial');
  if (
    detection.widthIrregularity > QUALITY_LIMITS.maxWidthIrregularity ||
    detection.rectangularity < QUALITY_LIMITS.minRectangularity
  )
    issues.push('obstruction');
  if (stripWidthPx < QUALITY_LIMITS.minStripWidthPx) issues.push('tooFar');
  if (backingLightness < QUALITY_LIMITS.minLightness) issues.push('tooDark');
  if (clippedFraction > QUALITY_LIMITS.maxClipped) issues.push('glare');
  if (blur !== null && blur > QUALITY_LIMITS.maxBlur) issues.push('blurry');
  if (backingChroma > QUALITY_LIMITS.maxChroma) issues.push('colorCast');

  return { issues, metrics: { backingLightness, backingChroma, clippedFraction, blur, stripWidthPx } };
}
