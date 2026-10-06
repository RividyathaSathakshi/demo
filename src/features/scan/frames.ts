import type { RGBAImage } from '../../cv/image';

/** Draws the current video frame into an RGBA buffer, longest side <= maxSide. */
export function grabVideoFrame(video: HTMLVideoElement, maxSide: number, canvas?: HTMLCanvasElement): RGBAImage | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;
  const s = Math.min(1, maxSide / Math.max(vw, vh));
  const w = Math.round(vw * s);
  const h = Math.round(vh * s);
  const c = canvas ?? document.createElement('canvas');
  if (c.width !== w) c.width = w;
  if (c.height !== h) c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h);
  return { width: w, height: h, data: d.data };
}

/** Decodes an image file into RGBA, honouring EXIF orientation where supported. */
export async function imageFileToRGBA(file: File, maxSide = 1800): Promise<RGBAImage> {
  let source: CanvasImageSource;
  let sw: number;
  let sh: number;
  if ('createImageBitmap' in window) {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
    source = bmp;
    sw = bmp.width;
    sh = bmp.height;
  } else {
    const url = URL.createObjectURL(file);
    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error('decode'));
      img.src = url;
    });
    URL.revokeObjectURL(url);
    source = img;
    sw = img.naturalWidth;
    sh = img.naturalHeight;
  }
  const s = Math.min(1, maxSide / Math.max(sw, sh));
  const c = document.createElement('canvas');
  c.width = Math.round(sw * s);
  c.height = Math.round(sh * s);
  const ctx = c.getContext('2d')!;
  ctx.drawImage(source, 0, 0, c.width, c.height);
  const d = ctx.getImageData(0, 0, c.width, c.height);
  return { width: c.width, height: c.height, data: d.data };
}
