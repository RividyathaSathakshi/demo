/**
 * Live smoke test against the real Roboflow Workflow. Skipped unless
 * ROBOFLOW_API_KEY is set (and the network allows serverless.roboflow.com):
 *
 *   ROBOFLOW_API_KEY=... npx vitest run src/roboflow/smoke.test.ts
 */
import { describe, expect, it } from 'vitest';
import { runUrineStripWorkflow } from './client';
import { parseWorkflowDetections } from './parse';

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const key = env.ROBOFLOW_API_KEY ?? '';
// An image from the project's own dataset (served over https).
const SAMPLE = env.ROBOFLOW_SAMPLE_IMAGE_URL ?? 'https://source.roboflow.com/B33qtaXgx0OiKG6qm5kCQbKTXI22/NOyOXZ6BkUK7DuUBkTMD/original.jpg';

describe.skipIf(!key)('Roboflow workflow (live)', () => {
  it('returns the expected output keys for a sample image', { timeout: 60000 }, async () => {
    const outputs = await runUrineStripWorkflow({ type: 'url', value: SAMPLE }, { apiKey: key, timeoutMs: 45000 });
    expect(outputs.length).toBe(1);
    expect(Object.keys(outputs[0])).toContain('predictions');
    const parsed = parseWorkflowDetections(outputs);
    expect(parsed?.detections.length).toBeGreaterThan(0);
  });
});
