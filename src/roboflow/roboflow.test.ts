import { describe, expect, it, vi } from 'vitest';
import fixture from './__fixtures__/workflow-response.json';
import { parseWorkflowDetections } from './parse';
import { RoboflowError, runUrineStripWorkflow } from './client';
import { analyzeWithDetections } from '../cv/roboflowAnalysis';
import { renderSyntheticStrip } from '../cv/synthetic';
import { URINE_PARAMETERS, getUrineProduct } from '../config/strips';

const MODEL_NAME: Record<string, string> = {
  glucose: 'Glucose', bilirubin: 'Bilirubin', ketones: 'Ketone', specificGravity: 'SpGravity', blood: 'Blood',
  ph: 'pH', protein: 'Protein', urobilinogen: 'Urobilinogen', nitrite: 'Nitrite', leukocytes: 'Leukocytes',
};

describe('Roboflow workflow response parsing', () => {
  it('reads detections from the real captured response', () => {
    const parsed = parseWorkflowDetections(fixture.outputs);
    expect(parsed?.image).toEqual({ width: 3024, height: 4032 });
    expect(parsed?.detections).toHaveLength(11);
    expect(parsed?.detections.map((d) => d.className)).toContain('strip');
    expect(parsed?.detections[0]).toEqual({ className: 'Bilirubin', confidence: 0.95263671875, x: 748, y: 3278.5, width: 144, height: 159 });
  });

  it('returns null for an unexpected shape', () => {
    expect(parseWorkflowDetections([{ something: 'else' }])).toBeNull();
    expect(parseWorkflowDetections([])).toBeNull();
  });
});

describe('Roboflow client', () => {
  const ok = () => new Response(JSON.stringify(fixture), { status: 200 });

  it('sends the key as a Bearer header and the image as an input', async () => {
    const fetchImpl = vi.fn(async () => ok());
    const out = await runUrineStripWorkflow({ type: 'base64', value: 'abc' }, { apiKey: 'rf_test', fetchImpl });
    expect(out).toHaveLength(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://serverless.roboflow.com/sathakshi2-gmail-com/workflows/urine-test-strips-main-vurine-test-strips-main-3jtim-5rdpn-1-yolo26s-t1-logic');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer rf_test');
    expect(url).not.toContain('api_key');
    expect(JSON.parse(init.body as string)).toEqual({ inputs: { image: { type: 'base64', value: 'abc' } } });
  });

  it('retries server errors, then succeeds', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(new Response('', { status: 503 })).mockResolvedValueOnce(ok());
    const out = await runUrineStripWorkflow({ type: 'url', value: 'https://x/y.jpg' }, { apiKey: 'k', fetchImpl, retries: 2 });
    expect(out).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('does not retry auth errors and raises a typed error', async () => {
    const fetchImpl = vi.fn(async () => new Response('', { status: 401 }));
    await expect(runUrineStripWorkflow({ type: 'base64', value: 'a' }, { apiKey: 'bad', fetchImpl })).rejects.toMatchObject({ kind: 'auth' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('refuses to run without a key', async () => {
    await expect(runUrineStripWorkflow({ type: 'base64', value: 'a' }, { apiKey: '' })).rejects.toBeInstanceOf(RoboflowError);
  });
});

describe('model-driven analysis', () => {
  it('reads pad colours inside the model boxes', () => {
    const product = getUrineProduct('urine-10')!;
    const idx = product.params.map((p, i) => (i * 2) % URINE_PARAMETERS[p].levels.length);
    const pads = product.params.map((p, i) => URINE_PARAMETERS[p].levels[idx[i]].color);
    const W = 960, H = 720, L = 576;
    const img = renderSyntheticStrip({ width: W, height: H, length: L, pads });
    // Same layout the synthetic renderer uses (horizontal strip, handle on the left).
    const sw = L / (4.2 + 10 * 1.55 + 0.35);
    const pad = sw * 0.9;
    const detections = product.params.map((p, i) => ({
      className: MODEL_NAME[p],
      confidence: 0.9,
      x: W / 2 - L / 2 + sw * 4.2 + i * sw * 1.55 + pad / 2,
      y: H / 2,
      width: pad,
      height: pad,
    }));
    detections.push({ className: 'strip', confidence: 0.6, x: W / 2, y: H / 2, width: L, height: sw });
    const report = analyzeWithDetections(img, detections);
    expect(report.issues).toEqual([]);
    expect(report.engine).toBe('roboflow');
    expect(report.urine?.productId).toBe('urine-10');
    expect(report.urine?.orderSource).toBe('model');
    expect(report.urine?.readings.map((r) => r.levelIndex)).toEqual(idx);
    expect(report.orientation).toBe('horizontal');
  });

  it('reports no regions when the model finds fewer than two pads', () => {
    const img = renderSyntheticStrip({ pads: [] });
    const report = analyzeWithDetections(img, [{ className: 'strip', confidence: 0.5, x: 480, y: 360, width: 500, height: 30 }]);
    expect(report.ok).toBe(false);
    expect(report.issues).toEqual(['noRegions']);
  });
});
