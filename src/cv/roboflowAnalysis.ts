/**
 * Urine strip analysis driven by the trained Roboflow detection model.
 *
 * The model locates each pad and names its parameter, which removes the two
 * hardest on-device steps (finding the pads and working out their order).
 * Colour reading still happens here, on the device: each pad is sampled,
 * white-balanced against the strip backing, and matched to the reference chart.
 */
import type { Point, RGBAImage } from './image';
import { rgbToHex, rgbToLab, whiteBalance, type RGB } from './color';
import { median, percentile } from './stats';
import { classifyOrientation } from './detectStrip';
import { confidenceFor, matchLevel, type PadReading } from './urineAnalysis';
import type { OverlayRegion, PipelineIssue, ScanReport } from './pipeline';
import { URINE_PARAMETERS, URINE_PRODUCTS, worstStatus, type ScreeningStatus, type UrineParamId } from '../config/strips';
import type { Detection } from '../roboflow/parse';

/** Model class name -> Lumenova parameter. "strip" and "background" are structural. */
export const MODEL_CLASS_TO_PARAM: Record<string, UrineParamId> = {
  glucose: 'glucose',
  bilirubin: 'bilirubin',
  ketone: 'ketones',
  ketones: 'ketones',
  spgravity: 'specificGravity',
  specificgravity: 'specificGravity',
  blood: 'blood',
  ph: 'ph',
  protein: 'protein',
  urobilinogen: 'urobilinogen',
  nitrite: 'nitrite',
  leukocytes: 'leukocytes',
};

export const MIN_PAD_CONFIDENCE = 0.5;
const MIN_PADS = 2;

function boxQuad(d: Detection): Point[] {
  const x0 = d.x - d.width / 2;
  const y0 = d.y - d.height / 2;
  return [
    { x: x0, y: y0 },
    { x: x0 + d.width, y: y0 },
    { x: x0 + d.width, y: y0 + d.height },
    { x: x0, y: y0 + d.height },
  ];
}

function sampleRegion(img: RGBAImage, x0: number, y0: number, x1: number, y1: number, skip?: (x: number, y: number) => boolean) {
  const xs = Math.max(0, Math.floor(x0));
  const ys = Math.max(0, Math.floor(y0));
  const xe = Math.min(img.width, Math.ceil(x1));
  const ye = Math.min(img.height, Math.ceil(y1));
  const step = Math.max(1, Math.floor(Math.max(xe - xs, ye - ys) / 60));
  const px: RGB[] = [];
  for (let y = ys; y < ye; y += step) {
    for (let x = xs; x < xe; x += step) {
      if (skip?.(x, y)) continue;
      const p = (y * img.width + x) * 4;
      px.push([img.data[p], img.data[p + 1], img.data[p + 2]]);
    }
  }
  return px;
}

const medianRgb = (px: RGB[]): RGB => [median(px.map((p) => p[0])), median(px.map((p) => p[1])), median(px.map((p) => p[2]))];

/**
 * Builds a screening report from model detections on `frame` (the exact image
 * that was sent to the model, so coordinates line up).
 */
export function analyzeWithDetections(frame: RGBAImage, detections: Detection[], scale = 1): ScanReport {
  const scaled = detections.map((d) => ({ ...d, x: d.x * scale, y: d.y * scale, width: d.width * scale, height: d.height * scale }));
  // Keep the most confident box per parameter.
  const byParam = new Map<UrineParamId, Detection>();
  for (const d of scaled) {
    const p = MODEL_CLASS_TO_PARAM[d.className.toLowerCase().replace(/[^a-z]/g, '')];
    if (!p || d.confidence < MIN_PAD_CONFIDENCE) continue;
    const prev = byParam.get(p);
    if (!prev || d.confidence > prev.confidence) byParam.set(p, d);
  }
  const strip = scaled.filter((d) => d.className.toLowerCase() === 'strip').sort((a, b) => b.confidence - a.confidence)[0];
  const pads = [...byParam.entries()];

  // Orientation from the line through the pad centres.
  let angleDeg = 0;
  if (pads.length >= 2) {
    const cx = pads.reduce((s, [, d]) => s + d.x, 0) / pads.length;
    const cy = pads.reduce((s, [, d]) => s + d.y, 0) / pads.length;
    let sxx = 0, syy = 0, sxy = 0;
    for (const [, d] of pads) {
      sxx += (d.x - cx) ** 2;
      syy += (d.y - cy) ** 2;
      sxy += (d.x - cx) * (d.y - cy);
    }
    angleDeg = (0.5 * Math.atan2(2 * sxy, sxx - syy) * 180) / Math.PI;
  }

  const overlays: OverlayRegion[] = pads.map(([p, d]) => ({ quad: boxQuad(d), label: p }));
  const base: ScanReport = {
    module: 'urine',
    ok: false,
    issues: [],
    frame,
    stripCorners: strip ? boxQuad(strip) : null,
    orientation: pads.length >= 2 ? classifyOrientation(angleDeg) : null,
    angleDeg: Math.round(angleDeg),
    regionCount: pads.length,
    overlays,
    strip: null,
    stripBoxes: [],
    quality: null,
    timingsMs: {},
    engine: 'roboflow',
  };
  if (pads.length < MIN_PADS) return { ...base, issues: [pads.length || strip ? 'noRegions' : 'noStrip'] };

  // Strip backing: bright pixels inside the strip (or around the pads) that are not on a pad.
  const inPad = (x: number, y: number) =>
    pads.some(([, d]) => Math.abs(x - d.x) <= d.width * 0.6 && Math.abs(y - d.y) <= d.height * 0.6);
  const padW = median(pads.map(([, d]) => d.width));
  const region = strip
    ? { x0: strip.x - strip.width / 2, y0: strip.y - strip.height / 2, x1: strip.x + strip.width / 2, y1: strip.y + strip.height / 2 }
    : {
        x0: Math.min(...pads.map(([, d]) => d.x - d.width)) - padW * 0.3,
        y0: Math.min(...pads.map(([, d]) => d.y - d.height)) - padW * 0.3,
        x1: Math.max(...pads.map(([, d]) => d.x + d.width)) + padW * 0.3,
        y1: Math.max(...pads.map(([, d]) => d.y + d.height)) + padW * 0.3,
      };
  const around = sampleRegion(frame, region.x0, region.y0, region.x1, region.y1, inPad);
  const lum = around.map((p) => 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]);
  const cut = percentile(lum, 70);
  const bright = around.filter((_, i) => lum[i] >= cut);
  const backing: RGB = bright.length ? medianRgb(bright) : [240, 240, 235];
  const backingLab = rgbToLab(...backing);

  const issues: PipelineIssue[] = [];
  if (backingLab[0] < 42) issues.push('tooDark');
  if (Math.hypot(backingLab[1], backingLab[2]) > 20) issues.push('colorCast');

  let clipped = 0;
  let total = 0;
  const readings: PadReading[] = pads.map(([paramId, d], regionIndex) => {
    const px = sampleRegion(frame, d.x - d.width * 0.25, d.y - d.height * 0.25, d.x + d.width * 0.25, d.y + d.height * 0.25);
    total += px.length;
    clipped += px.filter((p) => Math.min(p[0], p[1], p[2]) >= 250).length;
    const corrected = whiteBalance(medianRgb(px), backing);
    const { levelIndex, deltaE } = matchLevel(paramId, rgbToLab(...corrected));
    let confidence = confidenceFor(deltaE, false);
    // A shaky detection lowers confidence too.
    if (d.confidence < 0.7 && confidence === 'high') confidence = 'medium';
    const unreadable = confidence === 'unreadable';
    return {
      paramId,
      levelIndex: unreadable ? null : levelIndex,
      status: unreadable ? 'unreadable' : URINE_PARAMETERS[paramId].levels[levelIndex].status,
      confidence,
      deltaE,
      measuredHex: rgbToHex(corrected),
      regionIndex,
      inferred: false,
    };
  });
  if (total && clipped / total > 0.15) issues.push('glare');

  // Present readings in the order of the matching strip product (handle end first).
  const ids = new Set(readings.map((r) => r.paramId));
  const product =
    URINE_PRODUCTS.find((p) => p.params.length === ids.size && p.params.every((x) => ids.has(x))) ??
    URINE_PRODUCTS.find((p) => [...ids].every((x) => p.params.includes(x)) && p.params.length === 10)!;
  const ordered = product.params
    .map((p) => readings.find((r) => r.paramId === p) ?? { paramId: p, levelIndex: null, status: 'unreadable' as const, confidence: 'unreadable' as const, deltaE: Infinity, measuredHex: '#000000', regionIndex: -1, inferred: false })
    .filter((r) => r.regionIndex >= 0 || product.params.length === 10);

  const unreadableCount = ordered.filter((r) => r.status === 'unreadable').length;
  if (unreadableCount > Math.floor(ordered.length * 0.3)) issues.push('colorMismatch');
  const statuses = ordered.filter((r) => r.status !== 'unreadable').map((r) => r.status as ScreeningStatus);
  return {
    ...base,
    ok: issues.length === 0,
    issues,
    urine: issues.length
      ? undefined
      : { productId: product.id, readings: ordered, orderSource: 'model', overall: worstStatus(statuses), unreadableCount, alternatives: [] },
  };
}
