import { useState } from 'react';
import { useI18n } from '../../i18n';
import { Button, NumberedList } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { CaptureGuide } from '../../components/illustrations/CaptureGuide';
import type { ScanModule } from '../../cv/pipeline';
import { TakeTest } from './TakeTest';
import { TimerChip, type Countdown } from './TestTimer';

interface Props {
  module: ScanModule;
  onStart: () => void;
  onUpload: () => void;
  onSample: () => void;
  onManual: () => void;
  timer: Countdown;
  initialStep?: 1 | 2;
}

/** Two steps before the camera: how to take the test, then how to photograph it. */
export function CaptureInstructions({ module, onStart, onUpload, onSample, onManual, timer, initialStep = 1 }: Props) {
  const { t, tl } = useI18n();
  const [step, setStep] = useState<1 | 2>(initialStep);
  const go = (s: 1 | 2) => {
    setStep(s);
    window.scrollTo(0, 0);
  };

  return (
    <div className="container-page max-w-5xl py-8 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-label text-muted">
          <Icon name={module === 'urine' ? 'drop' : 'bloom'} size={18} className={module === 'urine' ? 'text-success' : 'text-rose'} />
          {t(`common.modules.${module}.name`)}
        </p>
        {step === 2 && <TimerChip timer={timer} />}
      </div>

      <nav aria-label={t('takeTest.stepLabel', { n: step })} className="mt-4">
        <ol className="grid grid-cols-2 gap-2">
          {([1, 2] as const).map((n) => (
            <li key={n}>
              <button
                type="button"
                onClick={() => go(n)}
                aria-current={step === n ? 'step' : undefined}
                className={`flex w-full items-center gap-2.5 border-t-4 pt-2 text-left text-label ${step === n ? 'border-rose font-medium text-ink' : 'border-[color:var(--border-strong)] text-muted hover:text-ink'}`}
              >
                <span className="font-display text-h3 tabular-nums">{n}</span>
                {t(n === 1 ? 'takeTest.stepTake' : 'takeTest.stepCapture')}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {step === 1 ? (
        <div className="mt-8">
          <TakeTest module={module} timer={timer} />
          <div className="sticky bottom-0 -mx-5 mt-10 border-t bg-bg/95 px-5 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <Button size="lg" onClick={() => go(2)} icon="camera">
                {t('takeTest.next')}
              </Button>
              <Button variant="ghost" onClick={() => go(2)}>
                {t('takeTest.skip')}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-8">
          <h1 className="text-h1">{module === 'opk' ? t('instructions.opkTitle') : t('instructions.title')}</h1>
          <p className="mt-2 text-body-lg text-muted">{t('instructions.lead')}</p>

          <div className="mt-8">
            <CaptureGuide kind={module} />
          </div>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <NumberedList items={tl(module === 'opk' ? 'instructions.opkSteps' : 'instructions.steps')} />
            </div>
            <aside className="space-y-4 self-start">
              <p className="flex gap-3 rounded-xl bg-panel-alt/70 p-4">
                <Icon name="rotate" size={22} className="shrink-0 text-rose" />
                {t('instructions.anyDirection')}
              </p>
              <p className="flex gap-3 rounded-xl border p-4 text-label">
                <Icon name="clock" size={20} className="shrink-0 text-gold" />
                {t('instructions.timing')}
              </p>
              <Button variant="ghost" size="sm" icon="chevronLeft" onClick={() => go(1)}>
                {t('takeTest.backToTest')}
              </Button>
            </aside>
          </div>

          <div className="sticky bottom-0 -mx-5 mt-10 border-t bg-bg/95 px-5 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
              <Button size="lg" icon="camera" onClick={onStart} className="sm:min-w-[14rem]">
                {t('instructions.start')}
              </Button>
              <div className="grid grid-cols-3 gap-1 sm:flex sm:flex-1 sm:flex-wrap sm:gap-2">
                <Button variant="ghost" size="sm" icon="image" onClick={onUpload} className="flex-col !gap-0.5 !px-1 py-1 text-caption sm:flex-row sm:!gap-1.5 sm:!px-3.5 sm:text-label">
                  {t('common.buttons.uploadPhoto')}
                </Button>
                <Button variant="ghost" size="sm" icon="sparkle" onClick={onSample} className="flex-col !gap-0.5 !px-1 py-1 text-caption sm:flex-row sm:!gap-1.5 sm:!px-3.5 sm:text-label">
                  {t('common.buttons.useSample')}
                </Button>
                <Button variant="ghost" size="sm" icon="edit" onClick={onManual} className="flex-col !gap-0.5 !px-1 py-1 text-caption sm:flex-row sm:!gap-1.5 sm:!px-3.5 sm:text-label">
                  {t('common.buttons.manualEntry')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
