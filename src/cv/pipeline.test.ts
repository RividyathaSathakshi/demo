import { describe, expect, it } from 'vitest';
import { renderSyntheticStrip } from './synthetic';
import { analyzeCapture } from './pipeline';
import { URINE_PARAMETERS, getUrineProduct } from '../config/strips';

function padsFor(productId: string, levelPick: (n: number) => number = () => 0) {
  const product = getUrineProduct(productId)!;
  return product.params.map((p) => {
    const levels = URINE_PARAMETERS[p].levels;
    const idx = Math.min(levels.length - 1, ((levelPick(levels.length) % levels.length) + levels.length) % levels.length);
    return { param: p, idx, color: levels[idx].color };
  });
}

describe('urine strip pipeline', () => {
  const counts = [
    ['urine-2', 2],
    ['urine-3', 3],
    ['urine-5', 5],
    ['urine-10', 10],
  ] as const;
  const angles = [0, 90, -90, 23, -38, 61, 180];

  for (const [productId, count] of counts) {
    for (const angle of angles) {
      it(`detects ${count} pads at ${angle}°`, () => {
        const pads = padsFor(productId, (n) => (angle + count) % n);
        const img = renderSyntheticStrip({ angleDeg: angle, pads: pads.map((p) => p.color), seed: angle + count });
        const res = analyzeCapture(img, 'urine');
        expect(res.issues).toEqual([]);
        expect(res.regionCount).toBe(count);
        expect(res.urine?.productId).toBe(productId);
        const got = res.urine!.readings.map((r) => r.levelIndex);
        expect(got).toEqual(pads.map((p) => p.idx));
      });
    }
  }

  it('classifies orientation', () => {
    const pads = padsFor('urine-5').map((p) => p.color);
    expect(analyzeCapture(renderSyntheticStrip({ angleDeg: 2, pads }), 'urine').detection.orientation).toBe('horizontal');
    expect(analyzeCapture(renderSyntheticStrip({ angleDeg: 88, pads }), 'urine').detection.orientation).toBe('vertical');
    expect(analyzeCapture(renderSyntheticStrip({ angleDeg: 35, pads }), 'urine').detection.orientation).toBe('rotated');
  });

  it('reads a flipped strip (handle on the other side) in the right order', () => {
    const pads = padsFor('urine-10', (n) => n - 2);
    const res = analyzeCapture(renderSyntheticStrip({ angleDeg: 12, flipped: true, pads: pads.map((p) => p.color) }), 'urine');
    expect(res.ok).toBe(true);
    expect(res.urine!.readings.map((r) => r.levelIndex)).toEqual(pads.map((p) => p.idx));
  });

  it('tolerates a mild warm colour cast via white balancing', () => {
    const pads = padsFor('urine-5', (n) => n >> 1);
    const res = analyzeCapture(renderSyntheticStrip({ pads: pads.map((p) => p.color), cast: [1.04, 1, 0.94] }), 'urine');
    expect(res.ok).toBe(true);
    expect(res.urine!.readings.map((r) => r.levelIndex)).toEqual(pads.map((p) => p.idx));
  });
});

describe('quality gate', () => {
  const pads = padsFor('urine-5').map((p) => p.color);

  it('rejects an empty frame', () => {
    const res = analyzeCapture(renderSyntheticStrip({ pads: [], length: 0.0001 }), 'urine');
    expect(res.ok).toBe(false);
    expect(res.issues[0]).toBe('noStrip');
  });

  it('rejects a strip cut off by the frame edge', () => {
    const res = analyzeCapture(renderSyntheticStrip({ pads, center: { x: 0.85, y: 0.5 } }), 'urine');
    expect(res.issues).toContain('partial');
  });

  it('rejects glare', () => {
    const res = analyzeCapture(renderSyntheticStrip({ pads, glare: true }), 'urine');
    expect(res.issues).toContain('glare');
  });

  it('rejects a dark image', () => {
    const res = analyzeCapture(renderSyntheticStrip({ pads, exposure: 0.35 }), 'urine');
    expect(res.issues).toContain('tooDark');
  });

  it('rejects a blurry image', () => {
    const res = analyzeCapture(renderSyntheticStrip({ pads, blur: 9 }), 'urine');
    expect(res.issues).toContain('blurry');
  });

  it('rejects strong coloured lighting', () => {
    const res = analyzeCapture(renderSyntheticStrip({ pads, cast: [1.0, 0.8, 0.55] }), 'urine');
    expect(res.issues).toContain('colorCast');
  });

  it('rejects a finger covering the strip', () => {
    const res = analyzeCapture(renderSyntheticStrip({ pads, finger: true, angleDeg: 15 }), 'urine');
    expect(res.ok).toBe(false);
  });
});

describe('OPK pipeline', () => {
  const cases = [
    { t: 0.15, c: 0.7, expected: 'low' },
    { t: 0.75, c: 0.45, expected: 'peak' },
    { t: 0.85, c: 0.6, expected: 'peak' },
  ] as const;
  for (const angle of [0, 90, 33, -57]) {
    for (const k of cases) {
      it(`classifies T=${k.t} C=${k.c} at ${angle}° as ${k.expected}`, () => {
        const img = renderSyntheticStrip({ angleDeg: angle, opk: { controlStrength: k.c, testStrength: k.t }, seed: 3 });
        const res = analyzeCapture(img, 'opk');
        expect(res.issues).toEqual([]);
        expect(res.opk?.category).toBe(k.expected);
      });
    }
  }

  it('detects a control line with no test line as low', () => {
    const res = analyzeCapture(renderSyntheticStrip({ opk: { controlStrength: 0.7, testStrength: 0 } }), 'opk');
    expect(res.ok).toBe(true);
    expect(res.opk?.category).toBe('low');
    expect(res.opk?.testDetected).toBe(false);
  });

  it('flags a missing control line', () => {
    const res = analyzeCapture(renderSyntheticStrip({ opk: { controlStrength: 0, testStrength: 0 } }), 'opk');
    expect(res.ok).toBe(false);
  });

  it('orders R monotonically with test strength', () => {
    const ratios = [0.2, 0.45, 0.6, 0.75, 0.9].map(
      (t) => analyzeCapture(renderSyntheticStrip({ opk: { controlStrength: 0.65, testStrength: t } }), 'opk').opk!.ratio,
    );
    for (let i = 1; i < ratios.length; i++) expect(ratios[i]).toBeGreaterThan(ratios[i - 1]);
  });
});
