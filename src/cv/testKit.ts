/**
 * Interprets the test-kit-type model ("Test Strips v2"): which kind of test is
 * in the photo, and where it is. Fertility Tracking uses this to refuse
 * pregnancy or COVID tests and to crop the photo to the strip before the
 * on-device C/T line reader runs.
 */
import { createImage, type RGBAImage } from './image';
import type { Detection } from '../roboflow/parse';

export type TestKitKind = 'ovulation' | 'pregnancy' | 'covid';

/** Model class -> kind of test. Unknown classes are ignored. */
export const TEST_KIT_CLASSES: Record<string, TestKitKind> = {
  ovulation_test: 'ovulation',
  pregnancy_test: 'pregnancy',
  urine1_pregnancy: 'pregnancy',
  urine2_pregnancy: 'pregnancy',
  green_hcg: 'pregnancy',
  wh_hcg: 'pregnancy',
  spring_covid: 'covid',
  cas_covid: 'covid',
  hip_covid: 'covid',
};

export const MIN_KIT_CONFIDENCE = 0.35;

export interface TestKit {
  kind: TestKitKind;
  className: string;
  confidence: number;
  box: Pick<Detection, 'x' | 'y' | 'width' | 'height'>;
}

/** The most confident recognised kit, or null when nothing passes the threshold. */
export function classifyTestKit(detections: Detection[], scale = 1): TestKit | null {
  let best: TestKit | null = null;
  for (const d of detections) {
    const kind = TEST_KIT_CLASSES[d.className.toLowerCase()];
    if (!kind || d.confidence < MIN_KIT_CONFIDENCE) continue;
    if (!best || d.confidence > best.confidence) {
      best = {
        kind,
        className: d.className,
        confidence: d.confidence,
        box: { x: d.x * scale, y: d.y * scale, width: d.width * scale, height: d.height * scale },
      };
    }
  }
  return best;
}

/**
 * Crops a detection box (centre/size) out of a frame, padded so the strip's
 * edges and some background stay visible for the on-device detector.
 */
export function cropToBox(frame: RGBAImage, box: TestKit['box']): RGBAImage {
  const pad = Math.max(box.width, box.height) * 0.08 + Math.min(box.width, box.height) * 0.6;
  const x0 = Math.max(0, Math.floor(box.x - box.width / 2 - pad));
  const y0 = Math.max(0, Math.floor(box.y - box.height / 2 - pad));
  const x1 = Math.min(frame.width, Math.ceil(box.x + box.width / 2 + pad));
  const y1 = Math.min(frame.height, Math.ceil(box.y + box.height / 2 + pad));
  const w = Math.max(1, x1 - x0);
  const h = Math.max(1, y1 - y0);
  const out = createImage(w, h);
  for (let y = 0; y < h; y++) {
    const src = ((y0 + y) * frame.width + x0) * 4;
    out.data.set(frame.data.subarray(src, src + w * 4), y * w * 4);
  }
  return out;
}
