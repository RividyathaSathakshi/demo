/// <reference lib="webworker" />
import { analyzeCapture, toScanReport, type CaptureOptions, type ScanModule } from './pipeline';
import type { RGBAImage } from './image';

interface Request {
  id: number;
  image: RGBAImage;
  module: ScanModule;
  options: CaptureOptions;
}

self.onmessage = (e: MessageEvent<Request>) => {
  const { id, image, module, options } = e.data;
  try {
    const report = toScanReport(analyzeCapture(image, module, options));
    (self as unknown as Worker).postMessage({ id, report });
  } catch (err) {
    (self as unknown as Worker).postMessage({ id, error: String(err) });
  }
};
