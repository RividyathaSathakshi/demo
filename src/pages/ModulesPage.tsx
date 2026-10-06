import { useI18n } from '../i18n';
import { PageHeader } from './PageHeader';
import { ButtonLink, CheckList } from '../components/ui';
import { Icon } from '../components/Icon';
import { StripArt } from '../components/illustrations/StripArt';
import { SUPPORTED_PAD_COUNTS, URINE_PARAMETERS, type UrineParamId } from '../config/strips';

export default function ModulesPage() {
  const { t, tl } = useI18n();
  const params = Object.keys(URINE_PARAMETERS) as UrineParamId[];
  return (
    <>
      <PageHeader title={t('modulesPage.title')} lead={t('modulesPage.lead')} />
      <section className="container-page grid gap-12 py-14 lg:grid-cols-[1.2fr_1fr]" aria-labelledby="urine-h">
        <div>
          <Icon name="drop" size={36} className="text-success" />
          <h2 id="urine-h" className="mt-3 text-h1">{t('modulesPage.urine.title')}</h2>
          <p className="mt-3 text-body-lg text-muted">{t('modulesPage.urine.body')}</p>
          <h3 className="mt-8 text-h3">{t('modulesPage.urine.flowTitle')}</h3>
          <div className="mt-3">
            <CheckList items={tl('modulesPage.urine.flow')} />
          </div>
          <ButtonLink to="/app/scan/urine" className="mt-8" icon="camera">
            {t('common.buttons.startScreening')}
          </ButtonLink>
        </div>
        <div className="space-y-8">
          <div>
            <h3 className="text-label font-medium text-muted">{t('modulesPage.urine.supportedTitle')}</h3>
            <p className="mt-1 font-display text-h2">{t('modulesPage.urine.supported', { list: SUPPORTED_PAD_COUNTS.join(', ') })}</p>
          </div>
          <div>
            <h3 className="text-label font-medium text-muted">{t('modulesPage.urine.paramsTitle')}</h3>
            <ul className="mt-3 divide-y border-y">
              {params.map((p) => (
                <li key={p} className="flex items-center gap-3 py-2.5">
                  <span className="flex gap-0.5" aria-hidden="true">
                    {URINE_PARAMETERS[p].levels.slice(0, 4).map((l, i) => (
                      <span key={i} className="h-4 w-4 rounded-sm border border-black/10" style={{ background: l.color }} />
                    ))}
                  </span>
                  <span className="font-medium">{t(`params.${p}.name`)}</span>
                  <span className="ml-auto hidden text-label text-muted sm:inline">{t(`params.${p}.about`)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-t bg-panel" aria-labelledby="opk-h">
        <div className="container-page grid gap-12 py-14 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <Icon name="bloom" size={36} className="text-rose" />
            <h2 id="opk-h" className="mt-3 text-h1">{t('modulesPage.opk.title')}</h2>
            <p className="mt-3 text-body-lg text-muted">{t('modulesPage.opk.body')}</p>
            <div className="mt-6">
              <CheckList items={tl('modulesPage.opk.flow')} />
            </div>
            <ButtonLink to="/app/scan/opk" className="mt-8" icon="camera">
              {t('common.buttons.startScreening')}
            </ButtonLink>
          </div>
          <div>
            <div className="grain overflow-hidden rounded-2xl bg-[#2F3750]">
              <svg viewBox="0 0 360 140" className="block h-auto w-full" aria-hidden="true">
                <StripArt kind="opk" cx={180} cy={70} length={320} showBoxes labels boxColor="#5FB894" testStrength={0.85} />
              </svg>
            </div>
            <h3 className="mt-6 text-h3">{t('modulesPage.opk.ratioTitle')}</h3>
            <p className="mt-2 font-display text-h2">R = T / C</p>
            <p className="mt-2 text-muted">{t('modulesPage.opk.ratioBody')}</p>
            <ul className="mt-4 space-y-2">
              {(['low', 'rising', 'peak'] as const).map((k) => (
                <li key={k} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                  <Icon name={k === 'peak' ? 'sparkle' : k === 'rising' ? 'triangle' : 'checkCircle'} size={18} className={k === 'peak' ? 'text-rose' : k === 'rising' ? 'text-gold' : 'text-muted'} />
                  {t(`modulesPage.opk.scale.${k}`)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
