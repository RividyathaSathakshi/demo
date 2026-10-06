/**
 * Writes a Y4M video of a synthetic strip for testing the live scanner with
 * Chromium's fake camera:
 *   npx vite-node scripts/make-fake-camera.ts out.y4m [urine|opk]
 *   chromium --use-fake-device-for-media-stream --use-file-for-fake-video-capture=out.y4m
 */
import { writeFileSync } from 'fs';
import { renderSyntheticStrip } from '../src/cv/synthetic';
import { URINE_PARAMETERS, getUrineProduct } from '../src/config/strips';
const out = process.argv[2];
const kind = process.argv[3];
const W = 960, H = 720;
const pads = getUrineProduct('urine-10')!.params.map((p, i) => URINE_PARAMETERS[p].levels[i % 3 === 0 ? 1 : 0].color);
const img = kind === 'opk'
  ? renderSyntheticStrip({ width: W, height: H, angleDeg: 72, opk: { controlStrength: 0.6, testStrength: 0.75 } })
  : renderSyntheticStrip({ width: W, height: H, angleDeg: -34, pads });
const Y = Buffer.alloc(W * H), U = Buffer.alloc(W * H / 4), V = Buffer.alloc(W * H / 4);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = (y * W + x) * 4; const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
  Y[y * W + x] = Math.max(0, Math.min(255, 0.257 * r + 0.504 * g + 0.098 * b + 16));
  if (y % 2 === 0 && x % 2 === 0) {
    const j = (y / 2) * (W / 2) + x / 2;
    U[j] = Math.max(0, Math.min(255, -0.148 * r - 0.291 * g + 0.439 * b + 128));
    V[j] = Math.max(0, Math.min(255, 0.439 * r - 0.368 * g - 0.071 * b + 128));
  }
}
const frames: Buffer[] = [Buffer.from(`YUV4MPEG2 W${W} H${H} F15:1 Ip A1:1 C420jpeg\n`)];
for (let f = 0; f < 15; f++) frames.push(Buffer.from('FRAME\n'), Y, U, V);
writeFileSync(out, Buffer.concat(frames));
