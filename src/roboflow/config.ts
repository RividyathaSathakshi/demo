/**
 * Roboflow Workflow used to locate urine strip pads.
 *
 * Workflow: "Urine Test Strips (Main) vurine-test-strips-main-3jtim-gd0a1-1-yolo26s-t1 Logic"
 * Model:    sathakshi2-gmail-com/urine-test-strips-main-3jtim-gd0a1-1-yolo26s-t1 (YOLO26s)
 * Inputs:   image (InferenceImage)
 * Outputs:  predictions (object detections: one box per pad, classes named after
 *           the parameter, plus "strip" and "background")
 *
 * Key resolution, in order:
 *   1. a key the user entered in Settings (stored only in their browser),
 *   2. VITE_ROBOFLOW_API_KEY at build time,
 *   3. the workspace's publishable key below.
 *
 * The publishable key (rf_<workspaceId>) is not a secret: Roboflow issues it
 * for use in client-side code. It can run inference on the workspace's models
 * but cannot read or manage workspace data. Never put a private API key here
 * or in a VITE_ variable, because both end up in the public JavaScript.
 */
export const ROBOFLOW_API_URL = 'https://serverless.roboflow.com';
export const ROBOFLOW_WORKSPACE = 'sathakshi2-gmail-com';
export const ROBOFLOW_WORKFLOW_ID = 'urine-test-strips-main-vurine-test-strips-main-3jtim-gd0a1-1-yolo26s-t1-logic';

export const ROBOFLOW_WORKFLOW_URL = `${ROBOFLOW_API_URL}/${ROBOFLOW_WORKSPACE}/workflows/${ROBOFLOW_WORKFLOW_ID}`;

/** Publishable key of workspace sathakshi2-gmail-com (browser-safe by design). */
export const ROBOFLOW_PUBLISHABLE_KEY = 'rf_B33qtaXgx0OiKG6qm5kCQbKTXI22';

export function buildTimeRoboflowKey(): string {
  let fromEnv = '';
  try {
    fromEnv = (import.meta.env?.VITE_ROBOFLOW_API_KEY as string | undefined)?.trim() ?? '';
  } catch {
    /* not running under Vite */
  }
  return fromEnv || ROBOFLOW_PUBLISHABLE_KEY;
}

/** The key to use: the user's own key if set, otherwise the build-time key. */
export function resolveRoboflowKey(userKey: string | null | undefined): string {
  return userKey?.trim() || buildTimeRoboflowKey();
}
