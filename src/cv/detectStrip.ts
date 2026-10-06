/**
 * Stage 1 + 2 of the pipeline: find the test strip in a camera frame and
 * determine its orientation.
 *
 *   1. Model the background from the frame border (planar fit for lightness,
 *      so gentle lighting gradients are tolerated).
 *   2. Foreground = pixels whose CIELAB distance from the background model
 *      exceeds an Otsu threshold.
 *   3. Morphological closing + hole filling, keep the largest component.
 *   4. Principal-component analysis of the component gives the strip axis.
 *      Extents along that axis give an oriented rectangle of any angle,
 *      so horizontal, vertical and diagonal strips are handled identically.
 */
import type { Point, RGBAImage } from './image';
import { rgbToLab } from './color';
import { median, otsu, percentile } from './stats';

export type Orientation = 'horizontal' | 'vertical' | 'rotated';

export interface OrientedRect {
  cx: number;
  cy: number;
  /** Angle of the long axis in radians. */
  angle: number;
  length: number;
  width: number;
}

export interface StripDetection {
  found: boolean;
  failure?: 'noStrip' | 'notElongated' | 'tooSmall';
  rect: OrientedRect;
  corners: [Point, Point, Point, Point];
  /** Angle of the strip's long axis relative to horizontal, in degrees (-90, 90]. */
  angleDeg: number;
  orientation: Orientation;
  /** Rectangle area as a fraction of the frame. */
  areaFraction: number;
  /** Long side as a fraction of the frame dimension it mostly lies along. */
  spanFraction: number;
  touchesBorder: boolean;
  /** Distance of the strip centre from the frame centre, relative to the frame diagonal. */
  centerOffset: number;
  elongation: number;
  rectangularity: number;
  /** Fraction of the strip length where the outline bulges (fingers, debris). */
  widthIrregularity: number;
  imageWidth: number;
  imageHeight: number;
}

const EMPTY_RECT: OrientedRect = { cx: 0, cy: 0, angle: 0, length: 0, width: 0 };

export function rectCorners(r: OrientedRect): [Point, Point, Point, Point] {
  const ux = Math.cos(r.angle);
  const uy = Math.sin(r.angle);
  const vx = -uy;
  const vy = ux;
  const hl = r.length / 2;
  const hw = r.width / 2;
  return [
    { x: r.cx - ux * hl - vx * hw, y: r.cy - uy * hl - vy * hw },
    { x: r.cx + ux * hl - vx * hw, y: r.cy + uy * hl - vy * hw },
    { x: r.cx + ux * hl + vx * hw, y: r.cy + uy * hl + vy * hw },
    { x: r.cx - ux * hl + vx * hw, y: r.cy - uy * hl + vy * hw },
  ];
}

export function scaleRect(r: OrientedRect, s: number): OrientedRect {
  return { cx: r.cx * s, cy: r.cy * s, angle: r.angle, length: r.length * s, width: r.width * s };
}

export function classifyOrientation(angleDeg: number): Orientation {
  const a = Math.abs(angleDeg);
  if (a <= 10) return 'horizontal';
  if (a >= 80) return 'vertical';
  return 'rotated';
}

function notFound(img: RGBAImage, failure: StripDetection['failure']): StripDetection {
  return {
    found: false,
    failure,
    rect: EMPTY_RECT,
    corners: rectCorners(EMPTY_RECT),
    angleDeg: 0,
    orientation: 'horizontal',
    areaFraction: 0,
    spanFraction: 0,
    touchesBorder: false,
    centerOffset: 1,
    elongation: 0,
    rectangularity: 0,
    widthIrregularity: 0,
    imageWidth: img.width,
    imageHeight: img.height,
  };
}

function morph(mask: Uint8Array, w: number, h: number, dilate: boolean): Uint8Array {
  // 3x3 square structuring element, separable.
  const tmp = new Uint8Array(mask.length);
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const a = mask[i];
      const l = x > 0 ? mask[i - 1] : a;
      const r = x < w - 1 ? mask[i + 1] : a;
      tmp[i] = dilate ? a | l | r : a & l & r;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const a = tmp[i];
      const u = y > 0 ? tmp[i - w] : a;
      const d = y < h - 1 ? tmp[i + w] : a;
      out[i] = dilate ? a | u | d : a & u & d;
    }
  }
  return out;
}

/** Labels 4-connected components; returns the label image and per-label areas. */
function labelComponents(mask: Uint8Array, w: number, h: number): { labels: Int32Array; areas: number[] } {
  const labels = new Int32Array(mask.length);
  const stack = new Int32Array(mask.length);
  const areas: number[] = [0];
  let label = 0;
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || labels[start]) continue;
    label++;
    let sp = 0;
    stack[sp++] = start;
    labels[start] = label;
    let area = 0;
    while (sp > 0) {
      const i = stack[--sp];
      area++;
      const x = i % w;
      const y = (i - x) / w;
      if (x > 0 && mask[i - 1] && !labels[i - 1]) { labels[i - 1] = label; stack[sp++] = i - 1; }
      if (x < w - 1 && mask[i + 1] && !labels[i + 1]) { labels[i + 1] = label; stack[sp++] = i + 1; }
      if (y > 0 && mask[i - w] && !labels[i - w]) { labels[i - w] = label; stack[sp++] = i - w; }
      if (y < h - 1 && mask[i + w] && !labels[i + w]) { labels[i + w] = label; stack[sp++] = i + w; }
    }
    areas.push(area);
  }
  return { labels, areas };
}

interface Axis {
  mx: number;
  my: number;
  ux: number;
  uy: number;
  u0: number;
  u1: number;
  width: number;
}

function axisOf(sel: Uint8Array, w: number, h: number): Axis | null {
  let sx = 0, sy = 0, cnt = 0;
  for (let i = 0; i < sel.length; i++) if (sel[i]) { sx += i % w; sy += Math.floor(i / w); cnt++; }
  if (cnt < 4) return null;
  const mx = sx / cnt;
  const my = sy / cnt;
  let cxx = 0, cyy = 0, cxy = 0;
  for (let i = 0; i < sel.length; i++) {
    if (!sel[i]) continue;
    const dx = (i % w) - mx;
    const dy = Math.floor(i / w) - my;
    cxx += dx * dx; cyy += dy * dy; cxy += dx * dy;
  }
  const a = 0.5 * Math.atan2(2 * cxy, cxx - cyy);
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (let i = 0; i < sel.length; i++) {
    if (!sel[i]) continue;
    const dx = (i % w) - mx;
    const dy = Math.floor(i / w) - my;
    const u = dx * ux + dy * uy;
    const v = -dx * uy + dy * ux;
    if (u < u0) u0 = u; if (u > u1) u1 = u;
    if (v < v0) v0 = v; if (v > v1) v1 = v;
  }
  void h;
  return { mx, my, ux, uy, u0, u1, width: Math.max(1, v1 - v0 + 1) };
}

/**
 * Picks the largest component, then chains in any components lying on the
 * same axis. Pads whose colour happens to match the background can split a
 * strip into pieces; this re-assembles them.
 */
function assembleStrip(mask: Uint8Array, w: number, h: number): { comp: Uint8Array; area: number } {
  const { labels, areas } = labelComponents(mask, w, h);
  let best = 0;
  for (let l = 1; l < areas.length; l++) if (areas[l] > (areas[best] ?? 0)) best = l;
  const comp = new Uint8Array(mask.length);
  if (!best) return { comp, area: 0 };
  const included = new Set<number>([best]);
  for (let i = 0; i < mask.length; i++) if (labels[i] === best) comp[i] = 1;
  for (let round = 0; round < 6; round++) {
    const axis = axisOf(comp, w, h);
    if (!axis || (axis.u1 - axis.u0) / axis.width < 1.5) break;
    // Centroids of the remaining components.
    const sums = new Map<number, [number, number, number]>();
    for (let i = 0; i < labels.length; i++) {
      const l = labels[i];
      if (!l || included.has(l) || areas[l] < axis.width * axis.width * 0.2) continue;
      const s = sums.get(l) ?? [0, 0, 0];
      s[0] += i % w; s[1] += Math.floor(i / w); s[2]++;
      sums.set(l, s);
    }
    let added = false;
    for (const [l, [sx, sy, n]] of sums) {
      const dx = sx / n - axis.mx;
      const dy = sy / n - axis.my;
      const u = dx * axis.ux + dy * axis.uy;
      const v = -dx * axis.uy + dy * axis.ux;
      const reach = axis.width * 2.5 + Math.sqrt(n);
      if (Math.abs(v) < axis.width * 0.5 && u > axis.u0 - reach && u < axis.u1 + reach) {
        included.add(l);
        added = true;
      }
    }
    if (!added) break;
    for (let i = 0; i < labels.length; i++) if (included.has(labels[i])) comp[i] = 1;
  }
  let area = 0;
  for (let i = 0; i < comp.length; i++) area += comp[i];
  return { comp, area };
}

/** Fills enclosed holes (pads or lines whose colour resembles the background). */
function fillHoles(comp: Uint8Array, w: number, h: number): Uint8Array {
  const outside = new Uint8Array(comp.length);
  const stack = new Int32Array(comp.length);
  let sp = 0;
  const push = (i: number) => {
    if (!comp[i] && !outside[i]) {
      outside[i] = 1;
      stack[sp++] = i;
    }
  };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (sp > 0) {
    const i = stack[--sp];
    const x = i % w;
    const y = (i - x) / w;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (y > 0) push(i - w);
    if (y < h - 1) push(i + w);
  }
  const filled = new Uint8Array(comp.length);
  for (let i = 0; i < comp.length; i++) filled[i] = outside[i] ? 0 : 1;
  return filled;
}

export function detectStrip(img: RGBAImage): StripDetection {
  const { width: w, height: h, data } = img;
  const n = w * h;
  const L = new Float32Array(n);
  const A = new Float32Array(n);
  const B = new Float32Array(n);
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const lab = rgbToLab(data[p], data[p + 1], data[p + 2]);
    L[i] = lab[0];
    A[i] = lab[1];
    B[i] = lab[2];
  }

  // Background model from a 2-px border ring: planar fit for L, medians for a/b.
  const ring: number[] = [];
  const ringStep = Math.max(1, Math.floor((w + h) / 300));
  for (let x = 0; x < w; x += ringStep) for (const y of [0, 1, h - 2, h - 1]) ring.push(y * w + x);
  for (let y = 0; y < h; y += ringStep) for (const x of [0, 1, w - 2, w - 1]) ring.push(y * w + x);
  const bgA = median(ring.map((i) => A[i]));
  const bgB = median(ring.map((i) => B[i]));
  const plane = fitPlane(ring.map((i) => [i % w, Math.floor(i / w), L[i]] as [number, number, number]));

  const dist = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = i % w;
    const y = (i - x) / w;
    const bgL = plane[0] + plane[1] * x + plane[2] * y;
    const dl = L[i] - bgL;
    const da = A[i] - bgA;
    const db = B[i] - bgB;
    dist[i] = Math.sqrt(dl * dl + da * da + db * db);
  }
  const maxD = Math.max(1, percentile(sampleEvery(dist, 4), 99.5));
  // Threshold: Otsu separates the strongest populations, but a single dark pad
  // can dominate it. Cap it with a noise-based bound measured on the border so
  // the pale strip backing is still counted as foreground.
  const ringNoise = percentile(ring.map((i) => dist[i]), 90);
  const thr = Math.max(7, Math.min(otsu(dist, maxD), ringNoise * 1.8 + 4));
  let mask = new Uint8Array(n);
  for (let i = 0; i < n; i++) mask[i] = dist[i] > thr ? 1 : 0;
  mask = morph(morph(mask, w, h, true), w, h, false); // closing
  mask = morph(morph(mask, w, h, false), w, h, true); // opening removes speckle

  const { comp, area } = assembleStrip(mask, w, h);
  if (area < n * 0.003) return notFound(img, 'noStrip');
  const filled = fillHoles(comp, w, h);

  // PCA of the filled component.
  let sx = 0, sy = 0, cnt = 0;
  let touches = false;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!filled[y * w + x]) continue;
      sx += x; sy += y; cnt++;
      if (x <= 1 || y <= 1 || x >= w - 2 || y >= h - 2) touches = true;
    }
  }
  const mx = sx / cnt;
  const my = sy / cnt;
  let cxx = 0, cyy = 0, cxy = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!filled[y * w + x]) continue;
      const dx = x - mx;
      const dy = y - my;
      cxx += dx * dx; cyy += dy * dy; cxy += dx * dy;
    }
  }
  let angle = 0.5 * Math.atan2(2 * cxy, cxx - cyy);
  // Canonical direction: mostly-horizontal strips point right, mostly-vertical strips point down.
  if (Math.abs(Math.cos(angle)) >= Math.abs(Math.sin(angle))) {
    if (Math.cos(angle) < 0) angle += Math.PI;
  } else if (Math.sin(angle) < 0) angle += Math.PI;
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);

  const pu = new Float32Array(cnt);
  const pv = new Float32Array(cnt);
  let k = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!filled[y * w + x]) continue;
      const dx = x - mx;
      const dy = y - my;
      pu[k] = dx * ux + dy * uy;
      pv[k] = -dx * uy + dy * ux;
      k++;
    }
  }
  const u0 = percentile(pu, 0.1);
  const u1 = percentile(pu, 99.9);
  const length = u1 - u0 + 1;

  // Robust width: per-slice extent across the axis, median over slices.
  const bins = Math.max(8, Math.min(120, Math.round(length / 2)));
  const vmin = new Float32Array(bins).fill(Infinity);
  const vmax = new Float32Array(bins).fill(-Infinity);
  for (let i = 0; i < cnt; i++) {
    const b = Math.min(bins - 1, Math.max(0, Math.floor(((pu[i] - u0) / length) * bins)));
    if (pv[i] < vmin[b]) vmin[b] = pv[i];
    if (pv[i] > vmax[b]) vmax[b] = pv[i];
  }
  const widths: number[] = [];
  const centers: number[] = [];
  for (let b = 0; b < bins; b++) {
    if (vmax[b] >= vmin[b]) {
      widths.push(vmax[b] - vmin[b] + 1);
      centers.push((vmax[b] + vmin[b]) / 2);
    }
  }
  const width = Math.max(1, median(widths));
  const vc = median(centers);
  let bulges = 0;
  for (const wd of widths) if (wd > width * 1.35) bulges++;
  const widthIrregularity = widths.length ? bulges / widths.length : 0;

  const uc = (u0 + u1) / 2;
  const rect: OrientedRect = {
    cx: mx + ux * uc - uy * vc,
    cy: my + uy * uc + ux * vc,
    angle,
    length,
    width,
  };
  let angleDeg = (Math.atan2(uy, ux) * 180) / Math.PI;
  if (angleDeg > 90) angleDeg -= 180;
  if (angleDeg <= -90) angleDeg += 180;

  const elongation = length / width;
  // Measured over occupied slices only, so gaps from background-coloured pads are not penalised.
  const rectangularity = cnt / ((widths.length / bins) * length * width);
  const corners = rectCorners(rect);
  const outside = corners.some((c) => c.x < 1 || c.y < 1 || c.x > w - 2 || c.y > h - 2);
  const horizontalish = Math.abs(ux) >= Math.abs(uy);
  const spanFraction = horizontalish ? (length * Math.abs(ux)) / w : (length * Math.abs(uy)) / h;

  const result: StripDetection = {
    found: true,
    rect,
    corners,
    angleDeg,
    orientation: classifyOrientation(angleDeg),
    areaFraction: (length * width) / n,
    spanFraction,
    touchesBorder: touches || outside,
    centerOffset: Math.hypot(rect.cx - w / 2, rect.cy - h / 2) / Math.hypot(w, h),
    elongation,
    rectangularity,
    widthIrregularity,
    imageWidth: w,
    imageHeight: h,
  };
  if (elongation < 2.6) return { ...result, found: false, failure: 'notElongated' };
  if (result.areaFraction < 0.004) return { ...result, found: false, failure: 'tooSmall' };
  return result;
}

function sampleEvery(arr: Float32Array, step: number): Float32Array {
  const out = new Float32Array(Math.ceil(arr.length / step));
  for (let i = 0, j = 0; i < arr.length; i += step, j++) out[j] = arr[i];
  return out;
}

/** Least-squares plane z = c0 + c1 x + c2 y. */
function fitPlane(points: [number, number, number][]): [number, number, number] {
  let n = 0, sx = 0, sy = 0, sz = 0, sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0;
  for (const [x, y, z] of points) {
    n++; sx += x; sy += y; sz += z;
    sxx += x * x; syy += y * y; sxy += x * y; sxz += x * z; syz += y * z;
  }
  const m = [
    [n, sx, sy],
    [sx, sxx, sxy],
    [sy, sxy, syy],
  ];
  const v = [sz, sxz, syz];
  const det = (a: number[][]) =>
    a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1]) -
    a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0]) +
    a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0]);
  const D = det(m);
  if (Math.abs(D) < 1e-9) return [n ? sz / n : 50, 0, 0];
  const solve = (col: number) => {
    const c = m.map((row, r) => row.map((val, j) => (j === col ? v[r] : val)));
    return det(c) / D;
  };
  return [solve(0), solve(1), solve(2)];
}
