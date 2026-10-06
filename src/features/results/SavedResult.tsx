import { useNavigate, useParams } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { deleteRecord, useAppState } from '../../store/store';
import { ButtonLink } from '../../components/ui';
import { UrineResultView } from './UrineResultView';
import { OpkResultView } from './OpkResultView';

export default function SavedResult() {
  const { id } = useParams();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { records } = useAppState();
  const record = records.find((r) => r.id === id);
  if (!record) {
    return (
      <div className="container-page py-16">
        <p className="text-body-lg">{t('results.notFound')}</p>
        <ButtonLink to="/app/history" className="mt-4">
          {t('nav.history')}
        </ButtonLink>
      </div>
    );
  }
  const onDelete = () => {
    deleteRecord(record.id);
    navigate('/app/history', { replace: true });
  };
  return record.type === 'urine' ? <UrineResultView record={record} onDelete={onDelete} /> : <OpkResultView record={record} onDelete={onDelete} />;
}
