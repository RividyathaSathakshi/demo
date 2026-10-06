import { useI18n } from '../../i18n';
import { Button, NumberedList } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { CaptureGuide } from '../../components/illustrations/CaptureGuide';
import type { ScanModule } from '../../cv/pipeline';

interface Props {
  module: ScanModule;
  onStart: () => void;
  onUpload: () => void;
  onSample: () => void;
  onManual: () => void;
}

export function CaptureInstructions({ module, onStart, onUpload, onSample, onManual }: Props) {
  const { t, tl } = useI18n();
  return (
    <div className="container-page max-w-5xl py-8 sm:py-12">
      <p className="flex items-center gap-2 text-label text-muted">
        <Icon name={module === 'urine' ? 'drop' : 'bloom'} size={18} className={module === 'urine' ? 'text-success' : 'text-rose'} />
        {t(`common.modules.${module}.name`)}
      </p>
      <h1 className="mt-2 text-h1">{t('instructions.title')}</h1>
      <p className="mt-2 text-body-lg text-muted">{t('instructions.lead')}</p>

      <div className="mt-8">
        <CaptureGuide />
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <NumberedList items={tl('instructions.steps')} />
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
  );
}
