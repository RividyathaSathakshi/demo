/**
 * Procedural test-strip renderer. Used for the unit tests and for the
 * clearly labelled "sample image" demo mode, so the scanner can be shown at an
 * exhibition without real strips. It renders pixels only; the pipeline
 * receives no hints about the layout.
 */
import { createImage, type RGBAImage } from './image';
import { hexToRgb } from './color';

export interface SyntheticStripOptions {
  width?: number;
  height?: number;
  background?: string;
  backing?: string;
  angleDeg?: number;
  /** Centre of the strip as a fraction of the frame. */
  center?: { x: number; y: number };
  /** Strip length in pixels. */
  length?: number;
  /** Pad colours, starting from the handle end. */
  pads?: string[];
  opk?: { controlStrength: number; testStrength: number };
  /** Put the handle at the far end instead (simulates the strip flipped). */
  flipped?: boolean;
  noise?: number;
  /** Fractional brightness change across the frame. */
  gradient?: number;
  glare?: boolean;
  finger?: boolean;
  blur?: number;
  /** Multiplies the final pixel values (simulates exposure). */
  exposure?: number;
  /** Colour cast multipliers for R, G, B. */
  cast?: [number, number, number];
  seed?: number;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cov = (half: number, d: number) => Math.min(1, Math.max(0, half - Math.abs(d) + 0.5));

export function renderSyntheticStrip(opts: SyntheticStripOptions = {}): RGBAImage {
  const W = opts.width ?? 960;
  const H = opts.height ?? 720;
  const rand = mulberry32(opts.seed ?? 7);
  const bg = hexToRgb(opts.background ?? '#4E5A6E');
  const backing = hexToRgb(opts.backing ?? '#EEEDE8');
  const angle = ((opts.angleDeg ?? 0) * Math.PI) / 180;
  const cx = (opts.center?.x ?? 0.5) * W;
  const cy = (opts.center?.y ?? 0.5) * H;
  const L = opts.length ?? Math.min(W, H) * 0.8;
  const isOpk = !!opts.opk;
  const pads = (opts.pads ?? []).map(hexToRgb);

  // Layout in strip units (u from -L/2 at the handle end to +L/2).
  let sw: number;
  let padSize = 0;
  let pitch = 0;
  let firstPad = 0;
  if (isOpk) {
    sw = L / 14;
  } else {
    const units = 4.2 + pads.length * 1.55 + 0.35;
    sw = L / units;
    padSize = sw * 0.9;
    pitch = sw * 1.55;
    firstPad = -L / 2 + sw * 4.2;
  }
  const lineColor = hexToRgb('#7A3E8E');
  const tipColor = hexToRgb('#CFE1EE');
  const brandColor = hexToRgb('#E7BFCB');
  const skin = hexToRgb('#D9A585');
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const gradient = opts.gradient ?? 0.08;
  const noise = opts.noise ?? 2.5;
  const exposure = opts.exposure ?? 1;
  const cast = opts.cast ?? [1, 1, 1];
  const shadowOff = sw * 0.12;

  const img = createImage(W, H);
  const col = [0, 0, 0];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      let u = dx * cos + dy * sin;
      const v = -dx * sin + dy * cos;
      if (opts.flipped) u = -u;
      // Background with a soft drop shadow.
      const su = (dx - shadowOff) * cos + (dy - shadowOff) * sin;
      const svv = -(dx - shadowOff) * sin + (dy - shadowOff) * cos;
      const shadow = cov(L / 2 + 2, su) * cov(sw / 2 + 2, svv) * 0.18;
      for (let c = 0; c < 3; c++) col[c] = bg[c] * (1 - shadow);

      const sCov = cov(L / 2, u) * cov(sw / 2, v);
      if (sCov > 0) {
        const s = [backing[0], backing[1], backing[2]];
        let tex = 0;
        if (isOpk) {
          const f = (u + L / 2) / L; // 0 at tip (dip end), 1 at handle
          if (f < 0.16) for (let c = 0; c < 3; c++) s[c] = tipColor[c];
          if (f > 0.72 && f < 0.9) for (let c = 0; c < 3; c++) s[c] = brandColor[c];
          const lw = L * 0.008;
          for (const [pos, strength] of [
            [0.3, opts.opk!.testStrength],
            [0.38, opts.opk!.controlStrength],
          ] as const) {
            const a = cov(lw, (f - pos) * L) * strength * cov(sw * 0.36, v);
            for (let c = 0; c < 3; c++) s[c] = s[c] * (1 - a) + lineColor[c] * a;
          }
        } else {
          for (let i = 0; i < pads.length; i++) {
            const pc = firstPad + i * pitch + padSize / 2;
            const a = cov(padSize / 2, u - pc) * cov(padSize / 2, v);
            if (a > 0) {
              tex = 5;
              for (let c = 0; c < 3; c++) s[c] = s[c] * (1 - a) + pads[i][c] * a;
            }
          }
        }
        const t = tex ? (rand() - 0.5) * tex : 0;
        for (let c = 0; c < 3; c++) col[c] = col[c] * (1 - sCov) + (s[c] + t) * sCov;
      }
      if (opts.finger) {
        const fu = (firstPad || 0) + (pitch || sw) * 1.2;
        const fx = (u - fu) / (sw * 1.1);
        const fy = (v - sw * 1.3) / (sw * 1.6);
        if (fx * fx + fy * fy < 1) for (let c = 0; c < 3; c++) col[c] = skin[c];
      }
      const light = 1 + gradient * ((x / W - 0.5) + (y / H - 0.5) * 0.5);
      let glare = 0;
      if (opts.glare) {
        const gx = (x - W * 0.47) / (W * 0.16);
        const gy = (y - H * 0.5) / (H * 0.12);
        glare = Math.max(0, 1 - (gx * gx + gy * gy)) * 400;
      }
      const o = (y * W + x) * 4;
      for (let c = 0; c < 3; c++) {
        img.data[o + c] = col[c] * light * exposure * cast[c] + (rand() - 0.5) * 2 * noise + glare;
      }
      img.data[o + 3] = 255;
    }
  }
  if (opts.blur && opts.blur > 0) {
    boxBlur(img, Math.round(opts.blur));
    boxBlur(img, Math.round(opts.blur));
  }
  return img;
}

function boxBlur(img: RGBAImage, r: number): void {
  const { width: W, height: H, data } = img;
  const tmp = new Float32Array(W * H * 3);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      for (let c = 0; c < 3; c++) {
        let s = 0, n = 0;
        for (let k = -r; k <= r; k++) {
          const xx = Math.min(W - 1, Math.max(0, x + k));
          s += data[(y * W + xx) * 4 + c]; n++;
        }
        tmp[(y * W + x) * 3 + c] = s / n;
      }
    }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      for (let c = 0; c < 3; c++) {
        let s = 0, n = 0;
        for (let k = -r; k <= r; k++) {
          const yy = Math.min(H - 1, Math.max(0, y + k));
          s += tmp[(yy * W + x) * 3 + c]; n++;
        }
        data[(y * W + x) * 4 + c] = s / n;
      }
    }
  }
}
