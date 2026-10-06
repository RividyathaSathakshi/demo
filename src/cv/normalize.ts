/**
 * Stage 3: rotate and crop the detected strip into a canonical, horizontal
 * image. Whatever angle the strip had in the camera frame, every later stage
 * works on the same layout: x runs along the strip, y across it.
 *
 * A margin of background is kept above and below the strip so that edge
 * sharpness can be measured.
 */
import { createImage, sampleBilinear, type RGBAImage } from './image';
import type { OrientedRect } from './detectStrip';

export interface NormalizedStrip {
  image: RGBAImage;
  /** Rows where the strip itself starts and ends (the rest is margin). */
  stripTop: number;
  stripBottom: number;
  /** Pixels per source pixel. */
  scale: number;
  rect: OrientedRect;
}

export const NORMALIZED_MAX_LENGTH = 900;
const MARGIN = 0.25;

export function normalizeStrip(src: RGBAImage, rect: OrientedRect, maxLength = NORMALIZED_MAX_LENGTH): NormalizedStrip {
  const scale = Math.min(1.5, maxLength / rect.length);
  const outW = Math.max(8, Math.round(rect.length * scale));
  const stripH = Math.max(4, Math.round(rect.width * scale));
  const margin = Math.round(stripH * MARGIN);
  const outH = stripH + margin * 2;
  const out = createImage(outW, outH);
  const ux = Math.cos(rect.angle);
  const uy = Math.sin(rect.angle);
  const vx = -uy;
  const vy = ux;
  const px = [0, 0, 0];
  for (let j = 0; j < outH; j++) {
    const v = (j + 0.5 - outH / 2) / scale;
    for (let i = 0; i < outW; i++) {
      const u = (i + 0.5 - outW / 2) / scale;
      sampleBilinear(src, rect.cx + ux * u + vx * v, rect.cy + uy * u + vy * v, px);
      const o = (j * outW + i) * 4;
      out.data[o] = px[0];
      out.data[o + 1] = px[1];
      out.data[o + 2] = px[2];
      out.data[o + 3] = 255;
    }
  }
  return { image: out, stripTop: margin, stripBottom: margin + stripH, scale, rect };
}

/** Maps a point in normalized-strip coordinates back to the source frame. */
export function stripToSource(n: NormalizedStrip, x: number, y: number): { x: number; y: number } {
  const { rect, scale, image } = n;
  const u = (x - image.width / 2) / scale;
  const v = (y - image.height / 2) / scale;
  const ux = Math.cos(rect.angle);
  const uy = Math.sin(rect.angle);
  return { x: rect.cx + ux * u - uy * v, y: rect.cy + uy * u + ux * v };
}
