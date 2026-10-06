import { useCallback, useRef, useState, type ChangeEvent } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { Button } from '../../components/ui';
import { Icon } from '../../components/Icon';
import type { RGBAImage } from '../../cv/image';
import type { CaptureOptions, ScanModule, ScanReport } from '../../cv/pipeline';
import { runScan } from '../../cv/runScan';
import { addRecord } from '../../store/store';
import type { RecordSource, TestRecord } from '../../store/types';
import { CaptureInstructions } from './CaptureInstructions';
import { CameraView, type CameraError } from './CameraView';
import { QualityFailure } from './QualityFailure';
import { UnsupportedStrip } from './UnsupportedStrip';
import { CheckingOverlay, DetectionReveal } from './DetectionReveal';
import { imageFileToRGBA } from './frames';
import { makeSampleImage } from './sample';
import { opkRecordFromReport, urineRecordFromReport } from '../results/format';
import { UrineResultView } from '../results/UrineResultView';
import { OpkResultView } from '../results/OpkResultView';

type Step =
  | { kind: 'instructions' }
  | { kind: 'camera' }
  | { kind: 'cameraError'; error: CameraError }
  | { kind: 'checking' }
  | { kind: 'quality'; report: ScanReport }
  | { kind: 'unsupported'; report: ScanReport }
  | { kind: 'reveal'; report: ScanReport }
  | { kind: 'result'; report: ScanReport; record: TestRecord; saved: boolean };

/**
 * The core journey: instructions -> camera -> quality check -> detection
 * overlay -> analysis -> immediate result -> save.
 */
export default function ScanFlow() {
  const { module: param } = useParams();
  if (param !== 'urine' && param !== 'opk') return <Navigate to="/app/scan" replace />;
  return <Flow key={param} module={param} />;
}

function Flow({ module }: { module: ScanModule }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>({ kind: 'instructions' });
  const frameRef = useRef<{ image: RGBAImage; source: RecordSource } | null>(null);
  const optionsRef = useRef<CaptureOptions>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const toRecord = useCallback(
    (report: ScanReport, source: RecordSource): TestRecord =>
      module === 'urine' ? urineRecordFromReport(report, source) : opkRecordFromReport(report, source),
    [module],
  );

  const analyze = useCallback(
    async (image: RGBAImage, source: RecordSource, options: CaptureOptions = {}, skipReveal = false) => {
      frameRef.current = { image, source };
      optionsRef.current = options;
      setStep({ kind: 'checking' });
      const report = await runScan(image, module, options);
      if (report.ok) {
        const record = toRecord(report, source);
        setStep(skipReveal ? { kind: 'result', report, record, saved: false } : { kind: 'reveal', report });
      } else if (report.issues.includes('unsupportedLayout')) setStep({ kind: 'unsupported', report });
      else setStep({ kind: 'quality', report });
    },
    [module, toRecord],
  );

  const onCapture = useCallback((image: RGBAImage) => analyze(image, 'camera'), [analyze]);
  const onCameraError = useCallback((error: CameraError) => setStep({ kind: 'cameraError', error }), []);
  const retake = () => setStep({ kind: 'camera' });
  const toManual = (reason: 'denied' | 'quality' | 'unsupported') => navigate(`/app/manual/${module}?reason=${reason}`);
  const upload = () => fileRef.current?.click();
  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const img = await imageFileToRGBA(file);
      analyze(img, 'upload');
    } catch {
      setStep({ kind: 'cameraError', error: 'generic' });
    }
  };
  const sample = () => {
    setStep({ kind: 'checking' });
    // Let the overlay paint before the synchronous render.
    window.setTimeout(() => analyze(makeSampleImage(module), 'sample'), 30);
  };

  const fileInput = <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} aria-hidden="true" tabIndex={-1} />;

  switch (step.kind) {
    case 'instructions':
      return (
        <>
          {fileInput}
          <CaptureInstructions module={module} onStart={() => setStep({ kind: 'camera' })} onUpload={upload} onSample={sample} onManual={() => toManual('denied')} />
        </>
      );
    case 'camera':
      return (
        <>
          {fileInput}
          <CameraView module={module} onCapture={onCapture} onError={onCameraError} onClose={() => setStep({ kind: 'instructions' })} onUpload={upload} onManual={() => toManual('denied')} />
        </>
      );
    case 'cameraError':
      return (
        <div className="container-page max-w-2xl py-12">
          {fileInput}
          <Icon name="camera" size={36} className="text-gold" />
          <h1 className="mt-3 text-h2">{t(`camera.errors.${step.error}.title`)}</h1>
          <p className="mt-2 text-body-lg text-muted">{t(`camera.errors.${step.error}.body`)}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button size="lg" icon="edit" onClick={() => toManual('denied')}>
              {t('common.buttons.manualEntry')}
            </Button>
            <Button size="lg" variant="secondary" icon="image" onClick={upload}>
              {t('common.buttons.uploadPhoto')}
            </Button>
            <Button size="lg" variant="ghost" icon="rotate" onClick={retake}>
              {t('common.buttons.tryAgain')}
            </Button>
          </div>
        </div>
      );
    case 'checking':
      return <CheckingOverlay />;
    case 'quality':
      return <QualityFailure report={step.report} onRetake={retake} onManual={() => toManual('quality')} />;
    case 'unsupported':
      return <UnsupportedStrip report={step.report} onRetake={retake} onManual={() => toManual('unsupported')} onChoose={() => toManual('unsupported')} />;
    case 'reveal':
      return (
        <DetectionReveal
          report={step.report}
          onDone={() => setStep({ kind: 'result', report: step.report, record: toRecord(step.report, frameRef.current?.source ?? 'camera'), saved: false })}
        />
      );
    case 'result': {
      const actions = {
        unsaved: true,
        saved: step.saved,
        onSave: () => {
          addRecord(step.record);
          setStep({ ...step, saved: true });
        },
        onRetake: retake,
      };
      if (step.record.type === 'urine') return <UrineResultView record={step.record} report={step.report} {...actions} />;
      return (
        <OpkResultView
          record={step.record}
          report={step.report}
          {...actions}
          onSwapLines={
            step.saved || !frameRef.current
              ? undefined
              : () => analyze(frameRef.current!.image, frameRef.current!.source, { ...optionsRef.current, swapLines: !optionsRef.current.swapLines }, true)
          }
        />
      );
    }
  }
}
