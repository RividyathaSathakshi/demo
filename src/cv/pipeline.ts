/**
 * Full capture pipeline:
 *   detect strip -> determine orientation -> normalize/rotate -> quality gate
 *   -> detect regions (pads or lines) -> analyse colours -> screening result
 *
 * Every stage can stop the pipeline with a specific reason, so the app never
 * produces a confident result from an uncertain or unusable image.
 */
import { downscale, type Point, type RGBAImage } from './image';
import { detectStrip, scaleRect, rectCorners, type StripDetection } from './detectStrip';
import { normalizeStrip, stripToSource, type NormalizedStrip } from './normalize';
import { assessQuality, type QualityIssue, type QualityMetrics } from './quality';
import { detectPadRegions, type RegionAnalysis } from './regions';
import { detectLines, type LineAnalysis } from './lines';
import { analyzeUrine, type UrineAnalysis } from './urineAnalysis';
import { analyzeOpk, type OpkAnalysis } from './opkAnalysis';

export type ScanModule = 'urine' | 'opk';

export type PipelineIssue = QualityIssue | 'noRegions' | 'unsupportedLayout' | 'colorMismatch' | 'controlMissing';

export interface OverlayRegion {
  quad: Point[];
  label?: string;
  inferred?: boolean;
}

export interface CaptureAnalysis {
  module: ScanModule;
  ok: boolean;
  issues: PipelineIssue[];
  /** The (downscaled) frame all overlay coordinates refer to. */
  frame: RGBAImage;
  detection: StripDetection;
  stripCorners: Point[] | null;
  strip: NormalizedStrip | null;
  regionCount: number;
  overlays: OverlayRegion[];
  quality: QualityMetrics | null;
  regionAnalysis?: RegionAnalysis;
  lineAnalysis?: LineAnalysis;
  urine?: UrineAnalysis;
  opk?: OpkAnalysis;
  timingsMs: Record<string, number>;
}

export interface CaptureOptions {
  productId?: string;
  swapLines?: boolean;
}

const ANALYSIS_MAX_SIDE = 1200;
const DETECTION_MAX_SIDE = 420;

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

export function regionQuad(strip: NormalizedStrip, x0: number, x1: number, y0: number, y1: number): Point[] {
  return [
    stripToSource(strip, x0, y0),
    stripToSource(strip, x1, y0),
    stripToSource(strip, x1, y1),
    stripToSource(strip, x0, y1),
  ];
}

export function analyzeCapture(input: RGBAImage, module: ScanModule, options: CaptureOptions = {}): CaptureAnalysis {
  const t0 = now();
  const timingsMs: Record<string, number> = {};
  const { image: frame } = downscale(input, ANALYSIS_MAX_SIDE);
  const { image: small, scale } = downscale(frame, DETECTION_MAX_SIDE);
  const smallDet = detectStrip(small);
  timingsMs.detect = now() - t0;

  const base: CaptureAnalysis = {
    module,
    ok: false,
    issues: [],
    frame,
    detection: smallDet,
    stripCorners: null,
    strip: null,
    regionCount: 0,
    overlays: [],
    quality: null,
    timingsMs,
  };
  if (!smallDet.found) {
    base.issues = [smallDet.failure === 'tooSmall' ? 'tooFar' : 'noStrip'];
    return base;
  }
  const rect = scaleRect(smallDet.rect, 1 / scale);
  const detection: StripDetection = { ...smallDet, rect, corners: rectCorners(rect) };
  base.detection = detection;
  base.stripCorners = detection.corners;

  const t1 = now();
  const strip = normalizeStrip(frame, rect);
  base.strip = strip;
  timingsMs.normalize = now() - t1;

  const quality = assessQuality(detection, strip);
  base.quality = quality.metrics;
  const issues: PipelineIssue[] = [...quality.issues];

  const t2 = now();
  if (module === 'urine') {
    const regions = detectPadRegions(strip);
    base.regionAnalysis = regions;
    base.regionCount = regions.regions.length;
    base.overlays = regions.regions.map((r) => ({ quad: regionQuad(strip, r.x0, r.x1, r.y0, r.y1), inferred: r.inferred }));
    timingsMs.regions = now() - t2;
    if (!regions.regions.length) issues.push('noRegions');
    if (!issues.length) {
      const t3 = now();
      const outcome = analyzeUrine(strip, regions, options.productId);
      timingsMs.analysis = now() - t3;
      if (outcome.ok) {
        base.urine = outcome.analysis;
      } else issues.push(outcome.issue);
    }
  } else {
    const lines = detectLines(strip, options.swapLines);
    base.lineAnalysis = lines;
    const found = [lines.test, lines.control].filter(Boolean);
    base.regionCount = found.length;
    const half = Math.max(3, strip.image.width * 0.008);
    base.overlays = (
      [
        [lines.test, 'T'],
        [lines.control, 'C'],
      ] as const
    )
      .filter(([l]) => l)
      .map(([l, label]) => ({ quad: regionQuad(strip, l!.x - half, l!.x + half, lines.bandY0, lines.bandY1), label }));
    timingsMs.regions = now() - t2;
    if (!lines.control) issues.push('noRegions');
    if (!issues.length) {
      const outcome = analyzeOpk(lines);
      if (outcome.ok) base.opk = outcome.analysis;
      else issues.push(outcome.issue);
    }
  }
  base.issues = issues;
  base.ok = issues.length === 0;
  timingsMs.total = now() - t0;
  return base;
}

/**
 * Structured-clone-safe summary of a capture analysis (no functions), so it
 * can cross the Web Worker boundary and be rendered by the UI.
 */
export interface ScanReport {
  module: ScanModule;
  ok: boolean;
  issues: PipelineIssue[];
  frame: RGBAImage;
  stripCorners: Point[] | null;
  orientation: StripDetection['orientation'] | null;
  angleDeg: number;
  regionCount: number;
  overlays: OverlayRegion[];
  strip: { image: RGBAImage; stripTop: number; stripBottom: number } | null;
  stripBoxes: { x0: number; x1: number; y0: number; y1: number; label?: string; inferred?: boolean }[];
  quality: QualityMetrics | null;
  urine?: UrineAnalysis;
  opk?: OpkAnalysis;
  timingsMs: Record<string, number>;
}

export function toScanReport(a: CaptureAnalysis): ScanReport {
  const stripBoxes: ScanReport['stripBoxes'] = [];
  if (a.regionAnalysis) {
    for (const r of a.regionAnalysis.regions) stripBoxes.push({ x0: r.x0, x1: r.x1, y0: r.y0, y1: r.y1, inferred: r.inferred });
  }
  if (a.lineAnalysis && a.strip) {
    const half = Math.max(3, a.strip.image.width * 0.008);
    const { bandY0, bandY1 } = a.lineAnalysis;
    if (a.lineAnalysis.test) stripBoxes.push({ x0: a.lineAnalysis.test.x - half, x1: a.lineAnalysis.test.x + half, y0: bandY0, y1: bandY1, label: 'T' });
    if (a.lineAnalysis.control) stripBoxes.push({ x0: a.lineAnalysis.control.x - half, x1: a.lineAnalysis.control.x + half, y0: bandY0, y1: bandY1, label: 'C' });
  }
  return {
    module: a.module,
    ok: a.ok,
    issues: a.issues,
    frame: a.frame,
    stripCorners: a.stripCorners,
    orientation: a.detection.found ? a.detection.orientation : null,
    angleDeg: Math.round(a.detection.angleDeg),
    regionCount: a.regionCount,
    overlays: a.overlays,
    strip: a.strip ? { image: a.strip.image, stripTop: a.strip.stripTop, stripBottom: a.strip.stripBottom } : null,
    stripBoxes,
    quality: a.quality,
    urine: a.urine,
    opk: a.opk,
    timingsMs: a.timingsMs,
  };
}
