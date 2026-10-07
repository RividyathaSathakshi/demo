import { useI18n, type TKey } from '../i18n';
import { PageHeader } from './PageHeader';
import { PipelineDiagram } from '../components/illustrations/PipelineDiagram';
import { StripArt, SAMPLE_PADS } from '../components/illustrations/StripArt';
import { ButtonLink, CheckList } from '../components/ui';
import { Icon } from '../components/Icon';

const FLOW = ['capture', 'detect', 'normalize', 'analyze', 'understand'] as const;
const GUIDANCE = ['center', 'showEntire', 'moveCloser', 'improveLighting', 'reduceGlare', 'holdSteady', 'stripDetected', 'ready'] as const;

export default function HowItWorksPage() {
  const { t, tl } = useI18n();
  return (
    <>
      <PageHeader title={t('howPage.title')} lead={t('howPage.lead')}>
        <ol className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2" aria-label={t('howPage.flowTitle')}>
          {FLOW.map((s, i) => (
            <li key={s} className="flex items-center gap-3">
              <span className="font-display text-h3">{t(`home.how.steps.${s}.title` as TKey)}</span>
              {i < FLOW.length - 1 && <span aria-hidden="true" className="h-px w-6 bg-ink/40" />}
            </li>
          ))}
        </ol>
      </PageHeader>

      <section className="container-page py-14" aria-labelledby="tech-h">
        <h2 id="tech-h" className="text-h1">{t('home.tech.title')}</h2>
        <p className="mt-2 max-w-2xl text-body-lg text-muted">{t('home.tech.lead')}</p>
        <div className="mt-10">
          <PipelineDiagram />
        </div>
      </section>

      <section className="border-y bg-panel" aria-labelledby="scan-h">
        <div className="container-page grid gap-10 py-14 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 id="scan-h" className="text-h1">{t('howPage.scanTitle')}</h2>
            <p className="mt-3 text-body-lg text-muted">{t('howPage.scanBody')}</p>
            <h3 className="mt-8 text-label font-medium text-muted">{t('howPage.guidanceExamples')}</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {GUIDANCE.map((g) => (
                <li key={g} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-label">
                  <Icon name={g === 'ready' || g === 'stripDetected' ? 'checkCircle' : 'scan'} size={15} className={g === 'ready' || g === 'stripDetected' ? 'text-success' : 'text-gold'} />
                  {t(`guidance.${g}`)}
                </li>
              ))}
            </ul>
          </div>
          <div className="grain overflow-hidden rounded-2xl bg-[#2F3750]">
            <svg viewBox="0 0 400 300" className="block h-auto w-full" role="img" aria-label={t('detection.imageLabel')}>
              <StripArt pads={SAMPLE_PADS[10]} cx={200} cy={150} angle={-38} length={340} showOutline showBoxes outlineColor="#F3EFE6" boxColor="#5FB894" />
            </svg>
          </div>
        </div>
      </section>

      <section className="container-page grid gap-12 py-14 lg:grid-cols-2">
        <div>
          <h2 className="text-h2">{t('howPage.qualityTitle')}</h2>
          <p className="mt-3 text-muted">{t('howPage.qualityBody')}</p>
          <div className="mt-6">
            <CheckList items={tl('howPage.qualityChecks')} />
          </div>
        </div>
        <div>
          <h2 className="text-h2">{t('howPage.limitsTitle')}</h2>
          <div className="mt-6">
            <CheckList items={tl('howPage.limits')} icon="info" tone="muted" />
          </div>
          <ButtonLink to="/app/scan" className="mt-8" icon="camera">
            {t('common.buttons.startScreening')}
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
