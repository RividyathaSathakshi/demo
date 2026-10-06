import { useEffect, useRef, type ReactNode } from 'react';
import type { RGBAImage, Point } from '../../cv/image';

/** Renders an RGBA buffer with an SVG overlay in the same coordinate space. */
export function RgbaCanvas({ image, label, children, className = '' }: { image: RGBAImage; label: string; children?: ReactNode; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.width = image.width;
    c.height = image.height;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const data = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
    ctx.putImageData(data, 0, 0);
  }, [image]);
  return (
    <div className={`relative ${className}`} role="img" aria-label={label}>
      <canvas ref={ref} className="block h-auto w-full" />
      {children && (
        <svg viewBox={`0 0 ${image.width} ${image.height}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
          {children}
        </svg>
      )}
    </div>
  );
}

export function quadPoints(q: Point[]): string {
  return q.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}
