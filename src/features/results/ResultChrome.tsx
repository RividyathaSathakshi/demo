import { useState, type ReactNode } from 'react';
import { useI18n } from '../../i18n';
import { Button, ButtonLink, Dialog } from '../../components/ui';
import { Icon, type IconName } from '../../components/Icon';
import type { RecordSource, TestRecord } from '../../store/types';

export interface ResultActions {
  unsaved?: boolean;
  saved?: boolean;
  onSave?: () => void;
  onRetake?: () => void;
  onDelete?: () => void;
  extra?: ReactNode;
}

const SOURCE_ICON: Record<RecordSource, IconName> = { camera: 'camera', upload: 'image', sample: 'sparkle', manual: 'edit' };

export function ResultHeaderMeta({ record }: { record: TestRecord }) {
  const { t, formatDate } = useI18n();
  const date = formatDate(record.createdAt, { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-label text-muted">
      <span className="inline-flex items-center gap-1.5">
        <Icon name={record.type === 'urine' ? 'drop' : 'bloom'} size={16} className={record.type === 'urine' ? 'text-success' : 'text-rose'} />
        {t(`common.modules.${record.type === 'urine' ? 'urine' : 'opk'}.name`)}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Icon name={SOURCE_ICON[record.source]} size={16} />
        {t(`common.source.${record.source}`)}
      </span>
      <time dateTime={record.createdAt}>{t('results.scannedAt', { date })}</time>
    </p>
  );
}

export function ResultFooter({ unsaved, saved, onSave, onRetake, onDelete, extra }: ResultActions & { record: TestRecord }) {
  const { t } = useI18n();
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      {unsaved && !saved && (
        <div className="sticky bottom-0 z-30 -mx-5 mt-10 border-t bg-bg/95 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <p className="hidden flex-1 text-label text-muted sm:block">{t('results.saveHint')}</p>
            <Button size="lg" icon="check" onClick={onSave}>
              {t('common.buttons.save')}
            </Button>
            {onRetake && (
              <Button size="lg" variant="secondary" icon="camera" onClick={onRetake}>
                {t('common.buttons.retake')}
              </Button>
            )}
            {extra}
          </div>
        </div>
      )}
      {saved && (
        <div className="mt-10 flex flex-col gap-3 rounded-2xl border border-success/40 bg-success/5 p-5 sm:flex-row sm:items-center" role="status">
          <p className="flex flex-1 items-center gap-2">
            <Icon name="checkCircle" size={22} className="text-success" />
            {t('results.savedNote')}
          </p>
          <ButtonLink to="/app" variant="secondary">
            {t('common.buttons.goToDashboard')}
          </ButtonLink>
          <ButtonLink to="/app/scan" icon="camera">
            {t('common.buttons.newScan')}
          </ButtonLink>
        </div>
      )}
      {onDelete && (
        <div className="mt-10 border-t pt-6">
          <Button variant="ghost" icon="trash" onClick={() => setConfirm(true)}>
            {t('results.deleteRecord')}
          </Button>
          <Dialog
            open={confirm}
            title={t('results.deleteRecord')}
            onClose={() => setConfirm(false)}
            footer={
              <>
                <Button variant="secondary" onClick={() => setConfirm(false)}>
                  {t('common.buttons.cancel')}
                </Button>
                <Button variant="danger" icon="trash" onClick={onDelete}>
                  {t('common.buttons.delete')}
                </Button>
              </>
            }
          >
            {t('results.deleteConfirm')}
          </Dialog>
        </div>
      )}
    </>
  );
}
