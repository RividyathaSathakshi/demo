import { useI18n } from '../i18n';
import { PageHeader } from './PageHeader';
import { Icon, type IconName } from '../components/Icon';

export default function AboutPage() {
  const { t, tl } = useI18n();
  const principles: { k: 'care' | 'privacy' | 'clarity'; icon: IconName }[] = [
    { k: 'care', icon: 'shield' },
    { k: 'privacy', icon: 'lock' },
    { k: 'clarity', icon: 'sun' },
  ];
  return (
    <>
      <PageHeader title={t('about.title')} lead={t('about.lead')} />
      <section className="container-page grid gap-12 py-14 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-10">
          <div>
            <h2 className="text-h2">{t('about.missionTitle')}</h2>
            <p className="mt-3 text-body-lg">{t('about.mission')}</p>
          </div>
          <div>
            <h2 className="text-h2">{t('about.purposeTitle')}</h2>
            <p className="mt-3 text-body-lg text-ink/85">{t('about.purpose')}</p>
          </div>
        </div>
        <div>
          <h2 className="text-h2">{t('about.principlesTitle')}</h2>
          <dl className="mt-4 divide-y border-y">
            {principles.map(({ k, icon }) => (
              <div key={k} className="py-5">
                <dt className="flex items-center gap-2 text-h3 font-display">
                  <Icon name={icon} size={22} className="text-rose" /> {t(`about.principles.${k}.title`)}
                </dt>
                <dd className="mt-1.5 text-muted">{t(`about.principles.${k}.body`)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
      <section className="border-t bg-panel-alt/50">
        <div className="container-page py-12">
          <h2 className="text-h2">{t('productPage.roadmapTitle')}</h2>
          <p className="mt-1 text-muted">{t('productPage.roadmapNote')}</p>
          <ul className="mt-6 grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {tl('productPage.roadmap').map((r) => (
              <li key={r} className="flex items-center gap-2 text-muted">
                <Icon name="plus" size={16} /> {r}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
