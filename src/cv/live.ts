/**
 * Real-time guidance for the camera view. Runs the same detector on small
 * frames (a few times per second) and turns the measurements into one
 * short, prioritised instruction for the user.
 */
import { toGray, type Point, type RGBAImage } from './image';
import { detectStrip, type Orientation } from './detectStrip';
import { normalizeStrip } from './normalize';
import { detectPadRegions } from './regions';
import { detectLines } from './lines';
import { regionQuad, type ScanModule } from './pipeline';
import { mean } from './stats';

export type GuidanceKey =
  | 'center'
  | 'showEntire'
  | 'moveCloser'
  | 'moveFarther'
  | 'improveLighting'
  | 'reduceGlare'
  | 'holdSteady'
  | 'stripDetected'
  | 'regionsDetected'
  | 'ready';

export interface LiveGuidance {
  key: GuidanceKey;
  stripFound: boolean;
  stripCorners: Point[] | null;
  regionQuads: Point[][];
  regionCount: number;
  orientation: Orientation | null;
  angleDeg: number;
  gray: Float32Array;
}

export function evaluateLiveFrame(img: RGBAImage, module: ScanModule, prevGray: Float32Array | null): LiveGuidance {
  const gray = toGray(img);
  const motion = prevGray && prevGray.length === gray.length ? meanAbsDiff(gray, prevGray) : 0;
  const brightness = mean(gray);
  const det = detectStrip(img);
  const base: LiveGuidance = {
    key: 'center',
    stripFound: false,
    stripCorners: null,
    regionQuads: [],
    regionCount: 0,
    orientation: null,
    angleDeg: 0,
    gray,
  };
  if (brightness < 45) return { ...base, key: 'improveLighting' };
  if (!det.found) {
    if (det.failure === 'tooSmall') return { ...base, key: 'moveCloser' };
    return { ...base, key: det.elongation > 0 && det.touchesBorder ? 'showEntire' : 'center' };
  }
  const withStrip: LiveGuidance = {
    ...base,
    stripFound: true,
    stripCorners: det.corners,
    orientation: det.orientation,
    angleDeg: det.angleDeg,
  };
  if (det.touchesBorder) return { ...withStrip, key: det.spanFraction > 0.92 ? 'moveFarther' : 'showEntire' };
  if (det.spanFraction < 0.38 || det.rect.width < 9) return { ...withStrip, key: 'moveCloser' };
  if (det.spanFraction > 0.9) return { ...withStrip, key: 'moveFarther' };
  if (det.centerOffset > 0.16) return { ...withStrip, key: 'center' };

  const strip = normalizeStrip(img, det.rect, 320);
  let clipped = 0;
  let total = 0;
  for (let y = strip.stripTop; y < strip.stripBottom; y++) {
    for (let x = 0; x < strip.image.width; x += 2) {
      const p = (y * strip.image.width + x) * 4;
      total++;
      if (Math.min(strip.image.data[p], strip.image.data[p + 1], strip.image.data[p + 2]) >= 250) clipped++;
    }
  }
  if (total && clipped / total > 0.05) return { ...withStrip, key: 'reduceGlare' };
  if (motion > 7) return { ...withStrip, key: 'holdSteady' };

  let quads: Point[][] = [];
  if (module === 'urine') {
    const regions = detectPadRegions(strip).regions;
    quads = regions.map((r) => regionQuad(strip, r.x0, r.x1, r.y0, r.y1));
  } else {
    const lines = detectLines(strip);
    const half = Math.max(2, strip.image.width * 0.01);
    quads = [lines.control, lines.test]
      .filter((l): l is NonNullable<typeof l> => !!l)
      .map((l) => regionQuad(strip, l.x - half, l.x + half, lines.bandY0, lines.bandY1));
  }
  const withRegions = { ...withStrip, regionQuads: quads, regionCount: quads.length };
  if (!quads.length) return { ...withRegions, key: 'stripDetected' };
  if (motion > 3.5) return { ...withRegions, key: 'holdSteady' };
  return { ...withRegions, key: 'regionsDetected' };
}

function meanAbsDiff(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i += 3) s += Math.abs(a[i] - b[i]);
  return s / Math.ceil(a.length / 3);
}
