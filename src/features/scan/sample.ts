/**
 * Generates a simulated strip photo for demonstrations (clearly labelled as a
 * sample in the interface and in saved history).
 */
import { renderSyntheticStrip } from '../../cv/synthetic';
import { URINE_PARAMETERS, getUrineProduct } from '../../config/strips';
import type { ScanModule } from '../../cv/pipeline';
import type { RGBAImage } from '../../cv/image';

const BACKGROUNDS = ['#4E5A6E', '#3B5D7A', '#6B5A4E', '#2F3A2E', '#5A4E6E'];

export function makeSampleImage(module: ScanModule): RGBAImage {
  const r = Math.random;
  const angle = Math.round(r() * 170 - 85);
  const background = BACKGROUNDS[Math.floor(r() * BACKGROUNDS.length)];
  const seed = Math.floor(r() * 1e6);
  if (module === 'opk') {
    const testStrength = [0.12, 0.35, 0.55, 0.8][Math.floor(r() * 4)];
    return renderSyntheticStrip({ angleDeg: angle, background, seed, opk: { controlStrength: 0.62, testStrength } });
  }
  const product = getUrineProduct(['urine-3', 'urine-5', 'urine-10'][Math.floor(r() * 3)])!;
  const pads = product.params.map((p) => {
    const levels = URINE_PARAMETERS[p].levels;
    // Mostly normal values, occasionally one step higher, like a typical demo strip.
    const normalIdx = levels.findIndex((l) => l.status === 'normal');
    const base = normalIdx < 0 ? 0 : normalIdx;
    const idx = r() < 0.2 ? Math.min(levels.length - 1, base + 1 + Math.floor(r() * 2)) : base + (p === 'ph' || p === 'specificGravity' ? Math.floor(r() * 3) : 0);
    return levels[Math.min(levels.length - 1, idx)].color;
  });
  return renderSyntheticStrip({ angleDeg: angle, background, seed, pads, flipped: r() < 0.3 });
}
