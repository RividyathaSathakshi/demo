/**
 * Stage 5 (urine): sample each detected pad, correct for lighting using the
 * strip's own white backing, and compare with the product's reference chart
 * in CIELAB using CIEDE2000.
 */
import { deltaE2000, hexToRgb, rgbToHex, rgbToLab, whiteBalance, type Lab, type RGB } from './color';
import { median } from './stats';
import type { NormalizedStrip } from './normalize';
import type { RegionAnalysis, StripRegion } from './regions';
import {
  URINE_PARAMETERS,
  urineProductsForCount,
  getUrineProduct,
  worstStatus,
  type ScreeningStatus,
  type UrineParamId,
  type UrineProduct,
} from '../config/strips';

export type ReadingConfidence = 'high' | 'medium' | 'low' | 'unreadable';

export interface PadReading {
  paramId: UrineParamId;
  /** Index into the reference levels, null when unreadable. */
  levelIndex: number | null;
  status: ScreeningStatus | 'unreadable';
  confidence: ReadingConfidence;
  deltaE: number;
  measuredHex: string;
  regionIndex: number;
  inferred: boolean;
}

export interface UrineAnalysis {
  productId: string;
  readings: PadReading[];
  /** Which way the pads were mapped onto the product's parameter list. */
  orderSource: 'handle' | 'colorFit';
  overall: ScreeningStatus;
  unreadableCount: number;
  alternatives: string[];
}

export type UrineAnalysisOutcome =
  | { ok: true; analysis: UrineAnalysis }
  | { ok: false; issue: 'unsupportedLayout' | 'colorMismatch'; regionCount: number };

const LEVEL_LABS = new Map<UrineParamId, Lab[]>();
for (const p of Object.values(URINE_PARAMETERS)) {
  LEVEL_LABS.set(p.id, p.levels.map((l) => rgbToLab(...hexToRgb(l.color))));
}

function samplePad(strip: NormalizedStrip, r: StripRegion): RGB {
  const img = strip.image;
  const W = img.width;
  const w = r.x1 - r.x0;
  const h = r.y1 - r.y0;
  const xa = Math.round(r.x0 + w * 0.22);
  const xb = Math.max(xa + 1, Math.round(r.x1 - w * 0.22));
  const ya = Math.round(r.y0 + h * 0.22);
  const yb = Math.max(ya + 1, Math.round(r.y1 - h * 0.22));
  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];
  for (let y = ya; y < yb; y++) {
    for (let x = xa; x < xb; x++) {
      const p = (y * W + x) * 4;
      rs.push(img.data[p]);
      gs.push(img.data[p + 1]);
      bs.push(img.data[p + 2]);
    }
  }
  return [median(rs), median(gs), median(bs)];
}

function confidenceFor(dE: number, inferred: boolean): ReadingConfidence {
  let c: ReadingConfidence = dE <= 7 ? 'high' : dE <= 13 ? 'medium' : dE <= 20 ? 'low' : 'unreadable';
  if (inferred && c === 'high') c = 'medium';
  return c;
}

function readPads(product: UrineProduct, labs: Lab[], hexes: string[], regions: StripRegion[], reverse: boolean) {
  const n = labs.length;
  const readings: PadReading[] = [];
  let total = 0;
  for (let k = 0; k < n; k++) {
    const regionIndex = reverse ? n - 1 - k : k;
    const paramId = product.params[k];
    const refs = LEVEL_LABS.get(paramId)!;
    let best = 0;
    let bestD = Infinity;
    refs.forEach((ref, i) => {
      const d = deltaE2000(labs[regionIndex], ref);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    total += Math.min(bestD, 30);
    const confidence = confidenceFor(bestD, regions[regionIndex].inferred);
    const level = URINE_PARAMETERS[paramId].levels[best];
    readings.push({
      paramId,
      levelIndex: confidence === 'unreadable' ? null : best,
      status: confidence === 'unreadable' ? 'unreadable' : level.status,
      confidence,
      deltaE: bestD,
      measuredHex: hexes[regionIndex],
      regionIndex,
      inferred: regions[regionIndex].inferred,
    });
  }
  return { readings, total };
}

export function analyzeUrine(
  strip: NormalizedStrip,
  regionAnalysis: RegionAnalysis,
  productOverride?: string,
): UrineAnalysisOutcome {
  const regions = regionAnalysis.regions;
  const override = productOverride ? getUrineProduct(productOverride) : undefined;
  const candidates = override ? [override] : urineProductsForCount(regions.length);
  if (!candidates.length || (override && override.params.length !== regions.length)) {
    return { ok: false, issue: 'unsupportedLayout', regionCount: regions.length };
  }

  const labs: Lab[] = [];
  const hexes: string[] = [];
  for (const r of regions) {
    const raw = samplePad(strip, r);
    const corrected = whiteBalance(raw, regionAnalysis.backingRgbAt((r.x0 + r.x1) / 2));
    labs.push(rgbToLab(...corrected));
    hexes.push(rgbToHex(corrected));
  }

  let bestOutcome: { product: UrineProduct; readings: PadReading[]; total: number; source: UrineAnalysis['orderSource'] } | null = null;
  for (const product of candidates) {
    const fwd = readPads(product, labs, hexes, regions, false);
    const rev = readPads(product, labs, hexes, regions, true);
    let pick = fwd.total <= rev.total ? fwd : rev;
    let source: UrineAnalysis['orderSource'] = 'colorFit';
    if (regionAnalysis.handleSide !== 'unknown') {
      const byHandle = regionAnalysis.handleSide === 'start' ? fwd : rev;
      const other = byHandle === fwd ? rev : fwd;
      // Trust the physical handle unless the colours strongly disagree.
      if (byHandle.total <= other.total * 1.5) {
        pick = byHandle;
        source = 'handle';
      }
    }
    if (!bestOutcome || pick.total < bestOutcome.total) bestOutcome = { product, readings: pick.readings, total: pick.total, source };
  }
  const { product, readings, source } = bestOutcome!;
  // Present readings in the product's own order (handle end first).
  const unreadableCount = readings.filter((r) => r.confidence === 'unreadable').length;
  if (unreadableCount > Math.max(0, Math.floor(readings.length * 0.3))) {
    return { ok: false, issue: 'colorMismatch', regionCount: regions.length };
  }
  const statuses = readings.filter((r) => r.status !== 'unreadable').map((r) => r.status as ScreeningStatus);
  return {
    ok: true,
    analysis: {
      productId: product.id,
      readings,
      orderSource: source,
      overall: worstStatus(statuses),
      unreadableCount,
      alternatives: candidates.filter((c) => c.id !== product.id).map((c) => c.id),
    },
  };
}
