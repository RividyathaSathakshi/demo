/**
 * Minimal client for the Roboflow serverless Workflow API.
 *
 *   POST https://serverless.roboflow.com/<workspace>/workflows/<workflow-id>
 *   Authorization: Bearer <key>
 *   { "inputs": { "image": { "type": "base64" | "url", "value": "..." } } }
 *
 * The response is { outputs: [ { <outputName>: ... } ] }: one entry per input
 * image, keyed by the workflow's own output names.
 */
import { ROBOFLOW_TEST_TYPE_WORKFLOW_ID, ROBOFLOW_WORKFLOW_ID, roboflowWorkflowUrl } from './config';

export type RoboflowErrorKind = 'notConfigured' | 'auth' | 'timeout' | 'network' | 'server' | 'badRequest' | 'badResponse';

export class RoboflowError extends Error {
  constructor(
    public readonly kind: RoboflowErrorKind,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'RoboflowError';
  }
}

export type RoboflowImageInput = { type: 'base64'; value: string } | { type: 'url'; value: string };

export interface RunWorkflowOptions {
  apiKey: string;
  timeoutMs?: number;
  retries?: number;
  signal?: AbortSignal;
  parameters?: Record<string, unknown>;
  /** Injected for tests. */
  fetchImpl?: typeof fetch;
}

const RETRYABLE = new Set(['timeout', 'network', 'server']);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function attempt(workflowId: string, image: RoboflowImageInput, opts: RunWorkflowOptions): Promise<Record<string, unknown>[]> {
  const ctl = new AbortController();
  const onAbort = () => ctl.abort();
  opts.signal?.addEventListener('abort', onAbort);
  const timer = setTimeout(() => ctl.abort(), opts.timeoutMs ?? 30000);
  let res: Response;
  try {
    res = await (opts.fetchImpl ?? fetch)(roboflowWorkflowUrl(workflowId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${opts.apiKey}` },
      body: JSON.stringify({ inputs: { image, ...(opts.parameters ?? {}) } }),
      signal: ctl.signal,
    });
  } catch {
    if (opts.signal?.aborted) throw new RoboflowError('network', 'Request cancelled');
    if (ctl.signal.aborted) throw new RoboflowError('timeout', 'Roboflow did not respond in time');
    throw new RoboflowError('network', 'Could not reach Roboflow');
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onAbort);
  }
  if (res.status === 401 || res.status === 403) throw new RoboflowError('auth', 'Roboflow rejected the API key', res.status);
  if (res.status === 429 || res.status >= 500) throw new RoboflowError('server', `Roboflow returned ${res.status}`, res.status);
  if (!res.ok) throw new RoboflowError('badRequest', `Roboflow returned ${res.status}`, res.status);
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new RoboflowError('badResponse', 'Roboflow returned invalid JSON');
  }
  // The REST API wraps results in `outputs`; some tooling uses `result`.
  const j = json as { outputs?: unknown; result?: unknown };
  const outputs = j?.outputs ?? j?.result;
  if (!Array.isArray(outputs)) throw new RoboflowError('badResponse', 'Roboflow response had no outputs list');
  return outputs as Record<string, unknown>[];
}

/**
 * Runs a Workflow in the Lumenova workspace on one image, with a timeout and
 * up to `retries` retries (exponential backoff) for network, timeout and 5xx/429.
 */
export async function runWorkflow(workflowId: string, image: RoboflowImageInput, opts: RunWorkflowOptions): Promise<Record<string, unknown>[]> {
  if (!opts.apiKey) throw new RoboflowError('notConfigured', 'No Roboflow API key is configured');
  const retries = opts.retries ?? 2;
  for (let i = 0; ; i++) {
    try {
      return await attempt(workflowId, image, opts);
    } catch (e) {
      const err = e as RoboflowError;
      if (i >= retries || !RETRYABLE.has(err.kind) || opts.signal?.aborted) throw err;
      await sleep(800 * 2 ** i);
    }
  }
}

/** Urine strip pad detector. */
export function runUrineStripWorkflow(image: RoboflowImageInput, opts: RunWorkflowOptions) {
  return runWorkflow(ROBOFLOW_WORKFLOW_ID, image, opts);
}

/** Test kit type detector (ovulation / pregnancy / COVID tests). */
export function runTestTypeWorkflow(image: RoboflowImageInput, opts: RunWorkflowOptions) {
  return runWorkflow(ROBOFLOW_TEST_TYPE_WORKFLOW_ID, image, opts);
}
