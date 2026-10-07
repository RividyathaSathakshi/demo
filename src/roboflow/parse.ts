/**
 * Defensive parsing of the Workflow result. Rather than assuming an output
 * name, it finds the first output holding object-detection predictions.
 * Only the fields Lumenova uses are kept.
 */
export interface Detection {
  className: string;
  confidence: number;
  /** Box centre and size in pixels of the submitted image. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ParsedDetections {
  image: { width: number; height: number } | null;
  detections: Detection[];
}

function isDetectionLike(v: unknown): v is Record<string, unknown> {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.class === 'string' && typeof o.x === 'number' && typeof o.y === 'number' && typeof o.width === 'number' && typeof o.height === 'number';
}

function fromBlock(v: unknown): ParsedDetections | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const list = Array.isArray(o.predictions) ? o.predictions : Array.isArray(v) ? (v as unknown[]) : null;
  if (!list) return null;
  const detections = list.filter(isDetectionLike).map((d) => ({
    className: String(d.class),
    confidence: typeof d.confidence === 'number' ? d.confidence : 0,
    x: d.x as number,
    y: d.y as number,
    width: d.width as number,
    height: d.height as number,
  }));
  if (!detections.length && list.length) return null;
  const img = o.image as { width?: unknown; height?: unknown } | undefined;
  const image = img && typeof img.width === 'number' && typeof img.height === 'number' ? { width: img.width, height: img.height } : null;
  return { image, detections };
}

/** Extracts detections from the first result entry (one entry per input image). */
export function parseWorkflowDetections(outputs: Record<string, unknown>[]): ParsedDetections | null {
  const entry = outputs[0];
  if (!entry || typeof entry !== 'object') return null;
  // Prefer an output literally named "predictions", then any detections-shaped output.
  const keys = Object.keys(entry).sort((a, b) => (a === 'predictions' ? -1 : b === 'predictions' ? 1 : 0));
  for (const k of keys) {
    const parsed = fromBlock(entry[k]);
    if (parsed) return parsed;
  }
  return null;
}
