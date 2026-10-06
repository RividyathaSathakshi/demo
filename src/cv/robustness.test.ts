import { describe, expect, it } from 'vitest';
import { renderSyntheticStrip } from './synthetic';
import { analyzeCapture } from './pipeline';
import { URINE_PARAMETERS, URINE_PRODUCTS } from '../config/strips';

describe('robustness sweep', () => {
  it('reads strips across backgrounds, sizes, angles and flips', { timeout: 180000 }, () => {
    const backgrounds = ['#4E5A6E', '#2A2A2A', '#B08A5E', '#7C8B6F', '#C9C9C4', '#3B5D7A'];
    const fails: string[] = [];
    let seed = 1;
    for (const bg of backgrounds) {
      for (const prod of URINE_PRODUCTS) {
        for (let k = 0; k < 4; k++) {
          seed++;
          const angle = ((seed * 47) % 180) - 90;
          const idx = prod.params.map((p, i) => (seed + i * 3) % URINE_PARAMETERS[p].levels.length);
          const pads = prod.params.map((p, i) => URINE_PARAMETERS[p].levels[idx[i]].color);
          const length = 400 + ((seed * 31) % 250);
          const res = analyzeCapture(
            renderSyntheticStrip({ angleDeg: angle, pads, background: bg, length, seed, flipped: seed % 3 === 0 }),
            'urine',
          );
          const good = res.ok && res.urine!.productId === prod.id && res.urine!.readings.every((r, i) => r.levelIndex === idx[i]);
          if (!good) fails.push(`${bg} ${prod.id} angle=${angle} length=${length} issues=${res.issues} regions=${res.regionCount}`);
        }
      }
      for (const [t, c] of [[0.1, 0.6], [0.55, 0.6], [0.8, 0.5]]) {
        seed++;
        const angle = ((seed * 53) % 180) - 90;
        const res = analyzeCapture(renderSyntheticStrip({ angleDeg: angle, background: bg, opk: { controlStrength: c, testStrength: t }, seed }), 'opk');
        if (!res.ok) fails.push(`${bg} opk angle=${angle} issues=${res.issues}`);
      }
    }
    expect(fails).toEqual([]);
  });
});
