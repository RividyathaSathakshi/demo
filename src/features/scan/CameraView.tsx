import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n';
import { Icon } from '../../components/Icon';
import { evaluateLiveFrame, type GuidanceKey, type LiveGuidance } from '../../cv/live';
import type { RGBAImage } from '../../cv/image';
import type { ScanModule } from '../../cv/pipeline';
import { grabVideoFrame } from './frames';
import { quadPoints } from './RgbaCanvas';
import { updateSettings, useAppState } from '../../store/store';

export type CameraError = 'denied' | 'notFound' | 'insecure' | 'generic';

interface Props {
  module: ScanModule;
  onCapture: (image: RGBAImage) => void;
  onError: (e: CameraError) => void;
  onClose: () => void;
  onUpload: () => void;
  onManual: () => void;
}

const LIVE_MAX_SIDE = 320;
const LIVE_INTERVAL_MS = 140;
const READY_FRAMES = 5;
const AUTO_CAPTURE_FRAMES = 11;

export function CameraView({ module, onCapture, onError, onClose, onUpload, onManual }: Props) {
  const { t } = useI18n();
  const { settings } = useAppState();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const prevGray = useRef<Float32Array | null>(null);
  const stableCount = useRef(0);
  const lastCount = useRef(-1);
  const captured = useRef(false);
  const [starting, setStarting] = useState(true);
  const [live, setLive] = useState<LiveGuidance | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [stable, setStable] = useState(0);
  const [announce, setAnnounce] = useState<GuidanceKey | null>(null);
  // Keep the latest callbacks without restarting the camera when they change.
  const onErrorRef = useRef(onError);
  const onCaptureRef = useRef(onCapture);
  onErrorRef.current = onError;
  onCaptureRef.current = onCapture;

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  }, []);

  // Start the camera.
  useEffect(() => {
    let cancelled = false;
    const onError = (e: CameraError) => onErrorRef.current(e);
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        onError(window.isSecureContext ? 'notFound' : 'insecure');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          await v.play().catch(() => undefined);
        }
        setStarting(false);
      } catch (err) {
        const name = (err as DOMException)?.name;
        if (name === 'NotAllowedError' || name === 'SecurityError') onError('denied');
        else if (name === 'NotFoundError' || name === 'OverconstrainedError') onError('notFound');
        else onError('generic');
      }
    }
    start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [stop]);

  const doCapture = useCallback(() => {
    const v = videoRef.current;
    if (!v || captured.current) return;
    const frame = grabVideoFrame(v, 1600);
    if (!frame) return;
    captured.current = true;
    stop();
    onCaptureRef.current(frame);
  }, [stop]);

  // Live analysis loop.
  useEffect(() => {
    if (starting) return;
    let timer = 0;
    const tick = () => {
      const v = videoRef.current;
      if (v && !captured.current && v.readyState >= 2) {
        if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
        const img = grabVideoFrame(v, LIVE_MAX_SIDE, canvasRef.current);
        if (img) {
          const g = evaluateLiveFrame(img, module, prevGray.current);
          prevGray.current = g.gray;
          setDims((d) => (d && d.w === img.width && d.h === img.height ? d : { w: img.width, h: img.height }));
          if (g.key === 'regionsDetected' && g.regionCount === lastCount.current) stableCount.current++;
          else stableCount.current = g.key === 'regionsDetected' ? 1 : 0;
          lastCount.current = g.regionCount;
          setStable(stableCount.current);
          setLive(g);
        }
      }
      timer = window.setTimeout(tick, LIVE_INTERVAL_MS);
    };
    tick();
    return () => window.clearTimeout(timer);
  }, [starting, module]);

  const ready = stable >= READY_FRAMES;
  const key: GuidanceKey = ready ? 'ready' : live?.key ?? 'center';

  // Auto-capture once the strip has been steady and ready for a moment.
  useEffect(() => {
    if (settings.autoCapture && stable >= AUTO_CAPTURE_FRAMES) doCapture();
  }, [stable, settings.autoCapture, doCapture]);

  // Announce guidance changes to screen readers without flooding them.
  useEffect(() => {
    const id = window.setTimeout(() => setAnnounce(key), 700);
    return () => window.clearTimeout(id);
  }, [key]);

  const good = key === 'ready' || key === 'regionsDetected' || key === 'stripDetected';
  const progress = settings.autoCapture ? Math.min(1, Math.max(0, (stable - READY_FRAMES) / (AUTO_CAPTURE_FRAMES - READY_FRAMES))) : 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0E1120] text-[#F3EFE6]">
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} playsInline muted autoPlay aria-label={t('camera.videoLabel')} className="absolute inset-0 h-full w-full object-cover" />
        {dims && (
          <svg viewBox={`0 0 ${dims.w} ${dims.h}`} preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
            {live?.stripCorners ? (
              <>
                <polygon points={quadPoints(live.stripCorners)} fill="rgba(243,239,230,0.06)" stroke={ready ? '#5FB894' : '#F3EFE6'} strokeWidth={2} strokeLinejoin="round" />
                {live.regionQuads.map((q, i) => (
                  <polygon key={i} points={quadPoints(q)} fill="none" stroke={ready ? '#5FB894' : '#E0A94F'} strokeWidth={1.4} />
                ))}
              </>
            ) : (
              <g stroke="rgba(243,239,230,0.7)" strokeWidth={2.5} fill="none" strokeLinecap="round">
                {(() => {
                  const m = Math.min(dims.w, dims.h) * 0.12;
                  const L = Math.min(dims.w, dims.h) * 0.1;
                  const { w, h } = dims;
                  return (
                    <path d={`M${m} ${m + L}V${m}H${m + L} M${w - m - L} ${m}H${w - m}V${m + L} M${w - m} ${h - m - L}V${h - m}H${w - m - L} M${m + L} ${h - m}H${m}V${h - m - L}`} />
                  );
                })()}
              </g>
            )}
          </svg>
        )}

        {/* Top bar */}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-gradient-to-b from-[#0E1120]/80 to-transparent p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button type="button" onClick={onClose} className="grid h-12 w-12 place-items-center rounded-full bg-[#14182A]/70" aria-label={t('camera.close')}>
            <Icon name="close" size={24} />
          </button>
          <div className="flex flex-col items-center gap-2 pt-1">
            <p className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-body font-medium ${good ? 'bg-[#1E3B33]/90' : 'bg-[#14182A]/85'}`}>
              <Icon name={good ? 'checkCircle' : 'scan'} size={18} className={good ? 'text-[#5FB894]' : 'text-[#E0A94F]'} />
              {starting ? t('camera.starting') : t(`guidance.${key}`)}
            </p>
            {live?.orientation && (
              <p className="flex flex-wrap justify-center gap-2 text-caption">
                <span className="rounded-full bg-[#14182A]/75 px-2.5 py-1">
                  {t('camera.orientation', { orientation: t(`common.orientation.${live.orientation}`), angle: Math.round(Math.abs(live.angleDeg)) })}
                </span>
                {live.regionCount > 0 && (
                  <span className="rounded-full bg-[#14182A]/75 px-2.5 py-1">
                    {module === 'urine' ? t('camera.regions', { n: live.regionCount }) : t('detection.lines', { n: live.regionCount })}
                  </span>
                )}
              </p>
            )}
          </div>
          <span className="w-12" />
        </div>
        {!live?.stripFound && !starting && (
          <p className="absolute inset-x-0 bottom-6 text-center text-label text-[#F3EFE6]/85">{t('camera.frameHint')}</p>
        )}
        <p className="sr-only" aria-live="polite">
          {announce ? t(`guidance.${announce}`) : ''}
        </p>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-3 items-center gap-2 bg-[#0E1120] px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
        <button type="button" onClick={onUpload} className="flex flex-col items-center gap-1 text-caption text-[#F3EFE6]/85">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[#262C48]">
            <Icon name="image" size={22} />
          </span>
          {t('common.buttons.uploadPhoto')}
        </button>
        <div className="flex justify-center">
          <button
            type="button"
            onClick={doCapture}
            disabled={starting}
            aria-label={t('camera.capture')}
            className={`relative grid h-20 w-20 place-items-center rounded-full border-4 ${ready ? 'animate-pulse-ring border-[#5FB894]' : 'border-[#F3EFE6]'}`}
          >
            <span className={`h-[62px] w-[62px] rounded-full ${ready ? 'bg-[#5FB894]' : 'bg-[#F3EFE6]'}`} />
            {progress > 0 && (
              <svg viewBox="0 0 80 80" className="absolute inset-[-4px] h-[88px] w-[88px] -rotate-90" aria-hidden="true">
                <circle cx="40" cy="40" r="38" fill="none" stroke="#E0A94F" strokeWidth="4" strokeDasharray={`${progress * 238.8} 238.8`} />
              </svg>
            )}
          </button>
        </div>
        <button type="button" onClick={onManual} className="flex flex-col items-center gap-1 text-caption text-[#F3EFE6]/85">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[#262C48]">
            <Icon name="edit" size={22} />
          </span>
          {t('common.buttons.manualEntry')}
        </button>
        <label className="col-span-3 mt-2 flex items-center justify-center gap-2 text-caption text-[#F3EFE6]/80">
          <input
            type="checkbox"
            checked={settings.autoCapture}
            onChange={(e) => updateSettings({ autoCapture: e.target.checked })}
            className="h-4 w-4 accent-[#5FB894]"
          />
          {t('camera.autoCapture')}
        </label>
      </div>
    </div>
  );
}
