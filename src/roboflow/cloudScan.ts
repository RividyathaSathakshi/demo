/**
 * Browser glue for the Roboflow models.
 *  - Urine: the pad detector locates each pad; colours are read on-device.
 *  - Ovulation: the test-kit model confirms the photo shows an ovulation (LH)
 *    test (not a pregnancy or COVID test) and locates it; the on-device C/T
 *    line reader then runs on the cropped strip.
 *
 * Only the photo is sent. The image is encoded as JPEG, posted, and dropped;
 * nothing is stored, and the response is reduced to the boxes Lumenova uses.
 */
import { downscale, type RGBAImage } from '../cv/image';
import { analyzeWithDetections } from '../cv/roboflowAnalysis';
import type { CaptureOptions, ScanReport } from '../cv/pipeline';
import { runScan } from '../cv/runScan';
import { classifyTestKit, cropToBox } from '../cv/testKit';
import { runTestTypeWorkflow, runUrineStripWorkflow, RoboflowError } from './client';
import { parseWorkflowDetections } from './parse';

const SEND_MAX_SIDE = 1600;

async function toJpegBase64(img: RGBAImage): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new RoboflowError('badRequest', 'Could not prepare the image');
  ctx.putImageData(new ImageData(new Uint8ClampedArray(img.data), img.width, img.height), 0, 0);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.9));
  if (!blob) throw new RoboflowError('badRequest', 'Could not encode the image');
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });
  return dataUrl.slice(dataUrl.indexOf(',') + 1);
}

export async function runCloudUrineScan(image: RGBAImage, apiKey: string, signal?: AbortSignal): Promise<ScanReport> {
  const { image: frame } = downscale(image, SEND_MAX_SIDE);
  const value = await toJpegBase64(frame);
  const outputs = await runUrineStripWorkflow({ type: 'base64', value }, { apiKey, signal, timeoutMs: 30000, retries: 2 });
  const parsed = parseWorkflowDetections(outputs);
  if (!parsed) throw new RoboflowError('badResponse', 'The model response had no detections output');
  // Coordinates refer to the submitted image; rescale if the service reports another size.
  const scale = parsed.image && parsed.image.width ? frame.width / parsed.image.width : 1;
  return analyzeWithDetections(frame, parsed.detections, scale);
}

/**
 * Fertility Tracking: confirm the kit type with the test-type model, then read
 * the C and T lines on-device from the cropped strip.
 */
export async function runCloudOpkScan(
  image: RGBAImage,
  apiKey: string,
  options: CaptureOptions = {},
  signal?: AbortSignal,
): Promise<ScanReport> {
  const { image: frame } = downscale(image, SEND_MAX_SIDE);
  const value = await toJpegBase64(frame);
  const outputs = await runTestTypeWorkflow({ type: 'base64', value }, { apiKey, signal, timeoutMs: 30000, retries: 2 });
  const parsed = parseWorkflowDetections(outputs);
  if (!parsed) throw new RoboflowError('badResponse', 'The model response had no detections output');
  const scale = parsed.image && parsed.image.width ? frame.width / parsed.image.width : 1;
  const kit = classifyTestKit(parsed.detections, scale);
  const kitInfo = kit ? { kind: kit.kind, className: kit.className, confidence: kit.confidence } : null;

  if (!kit) {
    // The model did not recognise a kit: read the whole photo on-device and say so.
    return { ...(await runScan(frame, 'opk', options)), testKit: null };
  }

  const b = kit.box;
  const boxQuad = [
    { x: b.x - b.width / 2, y: b.y - b.height / 2 },
    { x: b.x + b.width / 2, y: b.y - b.height / 2 },
    { x: b.x + b.width / 2, y: b.y + b.height / 2 },
    { x: b.x - b.width / 2, y: b.y + b.height / 2 },
  ];

  if (kit.kind !== 'ovulation') {
    // Never read a pregnancy or COVID test as an ovulation strip.
    const base = await runScan(frame, 'opk', options);
    return {
      ...base,
      ok: false,
      issues: [kit.kind === 'pregnancy' ? 'pregnancyTest' : 'covidTest'],
      opk: undefined,
      stripCorners: boxQuad,
      overlays: [],
      engine: 'roboflow',
      testKit: kitInfo,
    };
  }

  // Ovulation test: read the lines from the cropped strip, falling back to the
  // full photo if the crop does not give a reading.
  const cropped = await runScan(cropToBox(frame, b), 'opk', options);
  if (cropped.ok) return { ...cropped, engine: 'roboflow', testKit: kitInfo };
  const full = await runScan(frame, 'opk', options);
  if (full.ok) return { ...full, engine: 'roboflow', testKit: kitInfo };
  return { ...cropped, engine: 'roboflow', testKit: kitInfo };
}
