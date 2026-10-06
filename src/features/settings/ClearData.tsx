import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { Button, Dialog } from '../../components/ui';
import { clearAllData } from '../../store/store';

export function ClearDataButton() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const word = t('clearData.confirmWord');
  const close = () => {
    setOpen(false);
    setTyped('');
  };
  return (
    <>
      <Button variant="secondary" icon="trash" onClick={() => setOpen(true)} className="!text-danger">
        {t('clearData.button')}
      </Button>
      <Dialog
        open={open}
        title={t('clearData.title')}
        onClose={close}
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              {t('common.buttons.cancel')}
            </Button>
            <Button
              variant="danger"
              icon="trash"
              disabled={typed.trim().toUpperCase() !== word.toUpperCase()}
              onClick={() => {
                clearAllData();
                close();
                navigate('/', { replace: true });
              }}
            >
              {t('clearData.confirm')}
            </Button>
          </>
        }
      >
        <p>{t('clearData.body')}</p>
        <label htmlFor="confirm-word" className="label mt-4">
          {t('clearData.typeToConfirm')}
        </label>
        <input id="confirm-word" className="field" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
      </Dialog>
    </>
  );
}
