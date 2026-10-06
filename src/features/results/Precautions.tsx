import { useI18n } from '../../i18n';
import { CheckList } from '../../components/ui';

export function Precautions() {
  const { t, tl } = useI18n();
  return (
    <section aria-labelledby="precautions-h" className="rounded-2xl border border-gold/40 bg-gold/5 p-5 sm:p-6">
      <h2 id="precautions-h" className="text-h3">{t('precautions.title')}</h2>
      <div className="mt-3">
        <CheckList items={tl('precautions.items')} icon="shield" tone="gold" />
      </div>
    </section>
  );
}
