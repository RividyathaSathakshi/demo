/**
 * Runs the capture pipeline in a Web Worker so the interface stays
 * responsive, with an in-thread fallback for environments without workers.
 */
import { analyzeCapture, toScanReport, type CaptureOptions, type ScanModule, type ScanReport } from './pipeline';
import type { RGBAImage } from './image';

let worker: Worker | null = null;
let workerFailed = false;
let nextId = 1;

function getWorker(): Worker | null {
  if (workerFailed || typeof Worker === 'undefined') return null;
  if (!worker) {
    try {
      worker = new Worker(new URL('./scan.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      workerFailed = true;
      return null;
    }
  }
  return worker;
}

export function runScan(image: RGBAImage, module: ScanModule, options: CaptureOptions = {}): Promise<ScanReport> {
  const w = getWorker();
  if (!w) return new Promise((resolve) => setTimeout(() => resolve(toScanReport(analyzeCapture(image, module, options))), 16));
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const onMessage = (e: MessageEvent<{ id: number; report?: ScanReport; error?: string }>) => {
      if (e.data.id !== id) return;
      w.removeEventListener('message', onMessage);
      w.removeEventListener('error', onError);
      if (e.data.report) resolve(e.data.report);
      else reject(new Error(e.data.error));
    };
    const onError = () => {
      w.removeEventListener('message', onMessage);
      w.removeEventListener('error', onError);
      workerFailed = true;
      worker = null;
      resolve(toScanReport(analyzeCapture(image, module, options)));
    };
    w.addEventListener('message', onMessage);
    w.addEventListener('error', onError);
    // Copy so the caller keeps its frame for retries.
    const copy = { width: image.width, height: image.height, data: new Uint8ClampedArray(image.data) };
    w.postMessage({ id, image: copy, module, options }, [copy.data.buffer]);
  });
}
