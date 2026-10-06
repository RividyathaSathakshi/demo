/**
 * Stage 4 (urine strips): discover how many reagent pads the strip carries.
 *
 * Nothing about the layout is assumed. We walk along the normalized strip and
 * build a 1-D profile of how different each column is from the strip backing
 * (CIELAB distance plus a small texture term). Pads are runs where that
 * profile rises above the noise floor. Pad count, pitch regularity and the
 * side with the long blank margin (the handle) all come from the image.
 */
import type { RGBAImage } from './image';
import { rgbToLab, deltaE76, type Lab, type RGB } from './color';
import { median, percentile, smooth, stdDev } from './stats';
import type { NormalizedStrip } from './normalize';

export interface StripRegion {
  /** Column range along the normalized strip. */
  x0: number;
  x1: number;
  /** Row range (inside the strip, excluding margins). */
  y0: number;
  y1: number;
  /** Mean profile strength (CIELAB units above the backing). */
  strength: number;
  /** True when the pad was inferred from regular spacing rather than seen directly. */
  inferred: boolean;
}

export interface RegionAnalysis {
  regions: StripRegion[];
  /** Coefficient of variation of the spacing between pads (0 = perfectly regular). */
  pitchVariation: number;
  /** Which end has the long blank margin (usually the handle). */
  handleSide: 'start' | 'end' | 'unknown';
  backingRgbAt: (x: number) => RGB;
  backingLab: Lab;
  profile: Float32Array;
  threshold: number;
}

interface ColumnStats {
  rgb: RGB[];
  lab: Lab[];
  texture: Float32Array;
}

export function columnStats(img: RGBAImage, y0: number, y1: number): ColumnStats {
  const w = img.width;
  const rgb: RGB[] = [];
  const lab: Lab[] = [];
  const texture = new Float32Array(w);
  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];
  const grays: number[] = [];
  for (let x = 0; x < w; x++) {
    rs.length = gs.length = bs.length = grays.length = 0;
    for (let y = y0; y < y1; y++) {
      const p = (y * w + x) * 4;
      rs.push(img.data[p]);
      gs.push(img.data[p + 1]);
      bs.push(img.data[p + 2]);
      grays.push(0.299 * img.data[p] + 0.587 * img.data[p + 1] + 0.114 * img.data[p + 2]);
    }
    const c: RGB = [median(rs), median(gs), median(bs)];
    rgb.push(c);
    lab.push(rgbToLab(c[0], c[1], c[2]));
    texture[x] = stdDev(grays);
  }
  return { rgb, lab, texture };
}

/** Linear fit of a value along x, using only selected columns. */
function linearFit(xs: number[], ys: number[]): (x: number) => number {
  const n = xs.length;
  if (n < 2) {
    const m = n ? ys[0] : 0;
    return () => m;
  }
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i]; }
  const d = n * sxx - sx * sx;
  if (Math.abs(d) < 1e-9) return () => sy / n;
  const b = (n * sxy - sx * sy) / d;
  const a = (sy - b * sx) / n;
  return (x) => a + b * x;
}

export function detectPadRegions(strip: NormalizedStrip): RegionAnalysis {
  const img = strip.image;
  const W = img.width;
  const H = strip.stripBottom - strip.stripTop;
  const bandY0 = Math.round(strip.stripTop + H * 0.3);
  const bandY1 = Math.max(bandY0 + 1, Math.round(strip.stripTop + H * 0.7));
  const cols = columnStats(img, bandY0, bandY1);

  // Pass 1: global backing estimate from the brightest columns.
  const Ls = cols.lab.map((l) => l[0]);
  const bright = percentile(Ls, 70);
  const brightIdx = cols.lab.map((_, i) => i).filter((i) => cols.lab[i][0] >= bright);
  const base0: Lab = [
    median(brightIdx.map((i) => cols.lab[i][0])),
    median(brightIdx.map((i) => cols.lab[i][1])),
    median(brightIdx.map((i) => cols.lab[i][2])),
  ];
  const pass1 = cols.lab.map((l) => deltaE76(l, base0));
  const backingCols = pass1.map((d, i) => (d < 6 ? i : -1)).filter((i) => i >= 0);
  const useCols = backingCols.length >= W * 0.1 ? backingCols : brightIdx;

  // Pass 2: backing modelled as a linear function along the strip (lighting gradients).
  const fitL = linearFit(useCols, useCols.map((i) => cols.lab[i][0]));
  const fitA = linearFit(useCols, useCols.map((i) => cols.lab[i][1]));
  const fitB = linearFit(useCols, useCols.map((i) => cols.lab[i][2]));
  const fitR = linearFit(useCols, useCols.map((i) => cols.rgb[i][0]));
  const fitG = linearFit(useCols, useCols.map((i) => cols.rgb[i][1]));
  const fitBl = linearFit(useCols, useCols.map((i) => cols.rgb[i][2]));
  const backingTexture = median(useCols.map((i) => cols.texture[i]));

  const raw = new Float32Array(W);
  for (let x = 0; x < W; x++) {
    const d = deltaE76(cols.lab[x], [fitL(x), fitA(x), fitB(x)]);
    raw[x] = d + 0.4 * Math.max(0, cols.texture[x] - backingTexture);
  }
  const profile = smooth(raw, Math.max(1, Math.round(W * 0.003)));
  const backingVals = useCols.map((i) => profile[i]);
  const noise = median(backingVals);
  const spread = percentile(backingVals, 90) - noise;
  const threshold = Math.max(4.5, noise + Math.max(2.5, spread * 2.5));

  // Runs above threshold.
  let runs: { x0: number; x1: number }[] = [];
  let start = -1;
  for (let x = 0; x <= W; x++) {
    const on = x < W && profile[x] > threshold;
    if (on && start < 0) start = x;
    if (!on && start >= 0) {
      runs.push({ x0: start, x1: x - 1 });
      start = -1;
    }
  }
  // Merge runs separated by tiny gaps (texture dropouts inside a pad).
  const mergeGap = Math.max(2, H * 0.12);
  runs = runs.reduce<{ x0: number; x1: number }[]>((acc, r) => {
    const last = acc[acc.length - 1];
    if (last && r.x0 - last.x1 <= mergeGap) last.x1 = r.x1;
    else acc.push({ ...r });
    return acc;
  }, []);
  const edge = Math.max(2, W * 0.006);
  const padRuns = runs.filter((r) => {
    const len = r.x1 - r.x0 + 1;
    if (len < H * 0.35 || len > H * 2.2) return false;
    if (r.x0 <= edge || r.x1 >= W - 1 - edge) return len >= H * 0.6; // slivers at the very ends are background
    return true;
  });

  const padY0 = Math.round(strip.stripTop + H * 0.14);
  const padY1 = Math.round(strip.stripBottom - H * 0.14);
  const strengthOf = (x0: number, x1: number) => {
    let s = 0;
    for (let x = x0; x <= x1; x++) s += profile[x];
    return s / Math.max(1, x1 - x0 + 1);
  };
  let regions: StripRegion[] = padRuns.map((r) => ({
    x0: r.x0, x1: r.x1, y0: padY0, y1: padY1, strength: strengthOf(r.x0, r.x1), inferred: false,
  }));

  // Infer a faint pad sitting in a gap that is twice the regular pitch.
  let pitchVariation = 0;
  if (regions.length >= 3) {
    const centers = regions.map((r) => (r.x0 + r.x1) / 2);
    const pitches = centers.slice(1).map((c, i) => c - centers[i]);
    const pitch = median(pitches);
    const widthMed = median(regions.map((r) => r.x1 - r.x0 + 1));
    const filled: StripRegion[] = [regions[0]];
    for (let i = 1; i < regions.length; i++) {
      const gap = centers[i] - centers[i - 1];
      const ratio = gap / pitch;
      if (ratio > 1.7 && ratio < 2.3) {
        const c = (centers[i] + centers[i - 1]) / 2;
        const x0 = Math.round(c - widthMed / 2);
        const x1 = Math.round(c + widthMed / 2);
        const s = strengthOf(x0, x1);
        if (s >= threshold * 0.45) filled.push({ x0, x1, y0: padY0, y1: padY1, strength: s, inferred: true });
      }
      filled.push(regions[i]);
    }
    regions = filled;
    const c2 = regions.map((r) => (r.x0 + r.x1) / 2);
    const p2 = c2.slice(1).map((c, i) => c - c2[i]);
    const pm = p2.reduce((a, b) => a + b, 0) / p2.length;
    pitchVariation = stdDev(p2) / Math.max(1, pm);
  }

  let handleSide: RegionAnalysis['handleSide'] = 'unknown';
  if (regions.length) {
    const before = regions[0].x0;
    const after = W - 1 - regions[regions.length - 1].x1;
    if (before > after * 1.6 && before > H * 0.8) handleSide = 'start';
    else if (after > before * 1.6 && after > H * 0.8) handleSide = 'end';
  }

  return {
    regions,
    pitchVariation,
    handleSide,
    backingRgbAt: (x: number) => [fitR(x), fitG(x), fitBl(x)],
    backingLab: [fitL(W / 2), fitA(W / 2), fitB(W / 2)],
    profile,
    threshold,
  };
}
