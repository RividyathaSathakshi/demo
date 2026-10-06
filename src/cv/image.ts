/**
 * Minimal RGBA image type shared by the whole vision pipeline.
 * It is structurally compatible with the browser's ImageData, but the
 * pipeline never depends on the DOM, so it can be unit-tested in Node.
 */
export interface RGBAImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface Point {
  x: number;
  y: number;
}

export function createImage(width: number, height: number): RGBAImage {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

/** Area-average downscale so that the longest side is at most `maxSide`. */
export function downscale(img: RGBAImage, maxSide: number): { image: RGBAImage; scale: number } {
  const longest = Math.max(img.width, img.height);
  if (longest <= maxSide) return { image: img, scale: 1 };
  const scale = maxSide / longest;
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const out = createImage(w, h);
  const sx = img.width / w;
  const sy = img.height / h;
  const src = img.data;
  const dst = out.data;
  for (let y = 0; y < h; y++) {
    const y0 = Math.floor(y * sy);
    const y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy));
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor(x * sx);
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx));
      let r = 0, g = 0, b = 0, n = 0;
      for (let yy = y0; yy < y1; yy++) {
        let i = (yy * img.width + x0) * 4;
        for (let xx = x0; xx < x1; xx++, i += 4) {
          r += src[i];
          g += src[i + 1];
          b += src[i + 2];
          n++;
        }
      }
      const o = (y * w + x) * 4;
      dst[o] = r / n;
      dst[o + 1] = g / n;
      dst[o + 2] = b / n;
      dst[o + 3] = 255;
    }
  }
  return { image: out, scale: w / img.width };
}

/** Bilinear sample of one channel set at a fractional coordinate (clamped to edges). */
export function sampleBilinear(img: RGBAImage, x: number, y: number, out: number[]): void {
  const w = img.width;
  const h = img.height;
  const cx = Math.min(Math.max(x, 0), w - 1);
  const cy = Math.min(Math.max(y, 0), h - 1);
  const x0 = Math.floor(cx);
  const y0 = Math.floor(cy);
  const x1 = Math.min(x0 + 1, w - 1);
  const y1 = Math.min(y0 + 1, h - 1);
  const fx = cx - x0;
  const fy = cy - y0;
  const d = img.data;
  const i00 = (y0 * w + x0) * 4;
  const i10 = (y0 * w + x1) * 4;
  const i01 = (y1 * w + x0) * 4;
  const i11 = (y1 * w + x1) * 4;
  for (let c = 0; c < 3; c++) {
    const top = d[i00 + c] * (1 - fx) + d[i10 + c] * fx;
    const bottom = d[i01 + c] * (1 - fx) + d[i11 + c] * fx;
    out[c] = top * (1 - fy) + bottom * fy;
  }
}

/** Grayscale (Rec. 601 luma) as a Float32Array. */
export function toGray(img: RGBAImage): Float32Array {
  const n = img.width * img.height;
  const out = new Float32Array(n);
  const d = img.data;
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    out[i] = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2];
  }
  return out;
}
