import { describe, expect, it, vi } from 'vitest';
import fixture from './__fixtures__/test-type-response.json';
import { parseWorkflowDetections } from './parse';
import { runTestTypeWorkflow } from './client';
import { classifyTestKit, cropToBox } from '../cv/testKit';
import { renderSyntheticStrip } from '../cv/synthetic';
import { analyzeCapture } from '../cv/pipeline';

describe('test-type workflow (Test Strips v2)', () => {
  it('parses the real captured response and picks the most confident kit', () => {
    const parsed = parseWorkflowDetections(fixture.result)!;
    expect(parsed.image).toEqual({ width: 640, height: 640 });
    expect(parsed.detections).toHaveLength(2);
    const kit = classifyTestKit(parsed.detections)!;
    expect(kit.kind).toBe('ovulation');
    expect(kit.className).toBe('ovulation_test');
    expect(kit.confidence).toBeCloseTo(0.7598, 3);
    expect(kit.box).toEqual({ x: 323, y: 397, width: 610, height: 38 });
  });

  it('recognises pregnancy and COVID kits so they are never read as ovulation strips', () => {
    const d = (className: string, confidence: number) => ({ className, confidence, x: 50, y: 50, width: 80, height: 10 });
    expect(classifyTestKit([d('urine1_pregnancy', 0.9), d('ovulation_test', 0.5)])?.kind).toBe('pregnancy');
    expect(classifyTestKit([d('wh_hcg', 0.8)])?.kind).toBe('pregnancy');
    expect(classifyTestKit([d('hip_covid', 0.7)])?.kind).toBe('covid');
    expect(classifyTestKit([d('ovulation_test', 0.2)])).toBeNull();
    expect(classifyTestKit([d('something_else', 0.99)])).toBeNull();
  });

  it('scales boxes to the submitted frame', () => {
    const kit = classifyTestKit([{ className: 'ovulation_test', confidence: 0.8, x: 100, y: 50, width: 200, height: 20 }], 2)!;
    expect(kit.box).toEqual({ x: 200, y: 100, width: 400, height: 40 });
  });

  it('crops a padded region around the box', () => {
    const frame = { width: 200, height: 100, data: new Uint8ClampedArray(200 * 100 * 4) };
    const crop = cropToBox(frame, { x: 100, y: 50, width: 120, height: 10 });
    expect(crop.width).toBeGreaterThan(120);
    expect(crop.width).toBeLessThanOrEqual(200);
    expect(crop.height).toBeGreaterThan(10);
  });

  it('reads the C/T lines from the cropped strip', () => {
    // A 960x720 synthetic photo with a horizontal ovulation strip at a surge.
    const L = 576;
    const img = renderSyntheticStrip({ width: 960, height: 720, length: L, opk: { controlStrength: 0.5, testStrength: 0.8 } });
    const kit = classifyTestKit([{ className: 'ovulation_test', confidence: 0.76, x: 480, y: 360, width: L, height: L / 14 }])!;
    const res = analyzeCapture(cropToBox(img, kit.box), 'opk');
    expect(res.issues).toEqual([]);
    expect(res.opk?.category).toBe('peak');
  });

  it('calls the test-type workflow URL with a Bearer header', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ outputs: fixture.result }), { status: 200 }));
    await runTestTypeWorkflow({ type: 'base64', value: 'abc' }, { apiKey: 'rf_test', fetchImpl });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://serverless.roboflow.com/sathakshi2-gmail-com/workflows/test-strips-v2-vtest-strips-v2-b3uiv-1-yolo26s-t1-logic');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer rf_test');
    expect(JSON.parse(init.body as string)).toEqual({ inputs: { image: { type: 'base64', value: 'abc' } } });
  });
});
