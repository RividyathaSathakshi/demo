/**
 * Browser glue: send a captured frame to the Roboflow model, then read the
 * pad colours on-device inside the returned boxes.
 *
 * Only the photo is sent. The image is encoded as JPEG, posted, and dropped;
 * nothing is stored, and the response is reduced to the boxes Lumenova uses.
 */
import { downscale, type RGBAImage } from '../cv/image';
import { analyzeWithDetections } from '../cv/roboflowAnalysis';
import type { ScanReport } from '../cv/pipeline';
import { runUrineStripWorkflow, RoboflowError } from './client';
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
