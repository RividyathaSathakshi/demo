import { useI18n } from '../i18n';
import { ButtonLink } from '../components/ui';

export default function NotFoundPage() {
  const { t } = useI18n();
  return (
    <section className="container-page py-24">
      <h1 className="text-h1">{t('notFound.title')}</h1>
      <p className="mt-2 text-muted">{t('notFound.body')}</p>
      <ButtonLink to="/" className="mt-6">
        {t('notFound.home')}
      </ButtonLink>
    </section>
  );
}
