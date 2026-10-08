/**
 * Roboflow Workflow used to locate urine strip pads.
 *
 * Workflow: "Urine Test Strips (Main) vurine-test-strips-main-3jtim-gd0a1-1-yolo26s-t1 Logic"
 * Model:    sathakshi2-gmail-com/urine-test-strips-main-3jtim-gd0a1-1-yolo26s-t1 (YOLO26s)
 * Inputs:   image (InferenceImage)
 * Outputs:  predictions (object detections: one box per pad, classes named after
 *           the parameter, plus "strip" and "background")
 *
 * The API key is never hardcoded. It comes from, in order:
 *   1. the key a user enters in Settings (stored only in their browser), or
 *   2. VITE_ROBOFLOW_API_KEY at build time.
 * A Vite build inlines VITE_ variables into public JavaScript, so only use a
 * publishable (rf_...) key there, never a private API key.
 */
export const ROBOFLOW_API_URL = 'https://serverless.roboflow.com';
export const ROBOFLOW_WORKSPACE = 'sathakshi2-gmail-com';
export const ROBOFLOW_WORKFLOW_ID = 'urine-test-strips-main-vurine-test-strips-main-3jtim-gd0a1-1-yolo26s-t1-logic';

export const ROBOFLOW_WORKFLOW_URL = `${ROBOFLOW_API_URL}/${ROBOFLOW_WORKSPACE}/workflows/${ROBOFLOW_WORKFLOW_ID}`;

export function buildTimeRoboflowKey(): string {
  try {
    return (import.meta.env?.VITE_ROBOFLOW_API_KEY as string | undefined)?.trim() ?? '';
  } catch {
    return '';
  }
}

/** The key to use: the user's own key if set, otherwise the build-time key. */
export function resolveRoboflowKey(userKey: string | null | undefined): string {
  return userKey?.trim() || buildTimeRoboflowKey();
}
