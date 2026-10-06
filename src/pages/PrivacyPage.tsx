import { useI18n } from '../i18n';
import { PageHeader } from './PageHeader';
import { CheckList, Disclaimer } from '../components/ui';
import { Icon, type IconName } from '../components/Icon';

const POINTS: { k: 'account' | 'backend' | 'images' | 'local' | 'clear' | 'camera'; icon: IconName }[] = [
  { k: 'account', icon: 'shield' },
  { k: 'backend', icon: 'layers' },
  { k: 'images', icon: 'image' },
  { k: 'local', icon: 'phone' },
  { k: 'clear', icon: 'trash' },
  { k: 'camera', icon: 'camera' },
];

export default function PrivacyPage() {
  const { t, tl } = useI18n();
  return (
    <>
      <PageHeader title={t('privacyPage.title')} lead={t('privacyPage.lead')} />
      <section className="container-page py-14" aria-labelledby="how-h">
        <h2 id="how-h" className="text-h2">{t('privacyPage.howTitle')}</h2>
        <dl className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {POINTS.map(({ k, icon }) => (
            <div key={k}>
              <dt className="flex items-center gap-2 font-medium">
                <Icon name={icon} size={22} className="text-success" />
                {t(`privacyPage.points.${k}.title`)}
              </dt>
              <dd className="mt-1.5 text-muted">{t(`privacyPage.points.${k}.body`)}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="border-y bg-panel">
        <div className="container-page grid gap-12 py-14 lg:grid-cols-2">
          <div>
            <h2 className="text-h2">{t('privacyPage.limitsTitle')}</h2>
            <div className="mt-5">
              <CheckList items={tl('privacyPage.limits')} icon="info" tone="muted" />
            </div>
          </div>
          <div>
            <h2 className="text-h2">{t('privacyPage.disclaimerTitle')}</h2>
            <div className="mt-5 space-y-5">
              <CheckList items={tl('privacyPage.disclaimerPoints')} icon="shield" tone="rose" />
              <Disclaimer />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
