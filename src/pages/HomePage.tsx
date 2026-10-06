import { Link } from 'react-router-dom';
import { useI18n, type TKey } from '../i18n';
import { ButtonLink } from '../components/ui';
import { Icon, type IconName } from '../components/Icon';
import { PhoneMockup } from '../components/illustrations/PhoneMockup';
import { DetectionShowcase } from '../components/illustrations/DetectionShowcase';
import { CycleRing } from '../components/CycleRing';

const HOW_STEPS: { key: string; icon: IconName }[] = [
  { key: 'capture', icon: 'camera' },
  { key: 'detect', icon: 'scan' },
  { key: 'normalize', icon: 'rotate' },
  { key: 'analyze', icon: 'layers' },
  { key: 'understand', icon: 'sparkle' },
];

const TECH = ['camera', 'strip', 'orientation', 'normalize', 'regions', 'sampling', 'reference', 'result'] as const;

export function HomePage() {
  const { t, tl } = useI18n();
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="absolute -right-40 top-10 hidden h-[36rem] w-[36rem] rounded-full bg-panel-alt lg:block" />
        <div className="container-page relative grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <h1 className="font-display text-[3.25rem] font-semibold leading-[3.5rem] tracking-tight sm:text-[4.5rem] sm:leading-[4.75rem]">
              {t('home.hero.title')}
            </h1>
            <p className="mt-3 font-display text-h2 italic text-rose sm:text-[2.25rem] sm:leading-[2.75rem]">{t('home.hero.tagline')}</p>
            <p className="mt-6 max-w-xl text-body-lg text-ink/85">{t('home.hero.body')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to="/app/scan" size="lg" icon="camera">
                {t('home.hero.primary')}
              </ButtonLink>
              <ButtonLink to="/how-it-works" size="lg" variant="secondary">
                {t('home.hero.secondary')}
              </ButtonLink>
            </div>
            <p className="mt-5 flex items-center gap-2 text-label text-muted">
              <Icon name="lock" size={16} /> {t('home.hero.note')}
            </p>
          </div>
          <div className="relative">
            <PhoneMockup />
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="border-y bg-panel">
        <div className="container-page grid gap-10 py-16 lg:grid-cols-2">
          <div>
            <h2 className="text-h1">{t('home.problem.title')}</h2>
            <p className="mt-4 text-body-lg text-muted">{t('home.problem.body')}</p>
          </div>
          <ul className="divide-y border-y">
            {tl('home.problem.points').map((p, i) => (
              <li key={i} className="flex gap-5 py-4">
                <span className="font-display text-h3 text-muted tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                <span className="pt-0.5 text-body-lg">{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section className="container-page py-16 sm:py-20" aria-labelledby="how-h">
        <div className="max-w-2xl">
          <h2 id="how-h" className="text-h1">{t('home.how.title')}</h2>
          <p className="mt-3 text-body-lg text-muted">{t('home.how.lead')}</p>
        </div>
        <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
          {HOW_STEPS.map((s, i) => (
            <li key={s.key} className="relative border-t-2 border-ink pt-4">
              <div className="flex items-center justify-between">
                <span className="font-display text-h2 tabular-nums">{i + 1}</span>
                <Icon name={s.icon} size={26} className="text-muted" />
              </div>
              <h3 className="mt-3 text-h3">{t(`home.how.steps.${s.key}.title` as TKey)}</h3>
              <p className="mt-1.5 text-muted">{t(`home.how.steps.${s.key}.body` as TKey)}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Dynamic detection showcase */}
      <section className="bg-panel-alt/70" aria-labelledby="showcase-h">
        <div className="container-page py-16 sm:py-20">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr] lg:items-end">
            <h2 id="showcase-h" className="text-h1">{t('home.showcase.title')}</h2>
            <p className="text-body-lg text-muted">{t('home.showcase.body')}</p>
          </div>
          <div className="mt-10">
            <DetectionShowcase />
          </div>
          <blockquote className="mt-12 border-l-4 border-rose pl-5">
            <p className="font-display text-h2 italic">{t('home.showcase.caption')}</p>
          </blockquote>
        </div>
      </section>

      {/* Technology + trust */}
      <section className="container-page py-16 sm:py-20" aria-labelledby="tech-h">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <h2 id="tech-h" className="text-h1">{t('home.tech.title')}</h2>
            <p className="mt-3 text-body-lg text-muted">{t('home.tech.lead')}</p>
            <ol className="mt-8 flex flex-col gap-0" aria-label={t('home.tech.title')}>
              {TECH.map((s, i) => (
                <li key={s} className="flex items-stretch gap-4">
                  <div className="flex w-6 flex-col items-center">
                    <span className={`mt-1.5 h-3 w-3 rounded-full ${i === TECH.length - 1 ? 'bg-rose' : 'border-2 border-ink bg-bg'}`} />
                    {i < TECH.length - 1 && <span className="w-px flex-1 bg-[color:var(--border-strong)]" />}
                  </div>
                  <p className="pb-3 text-body-lg">{t(`home.tech.steps.${s}.title` as TKey)}</p>
                </li>
              ))}
            </ol>
            <Link to="/how-it-works" className="link mt-4 inline-block">
              {t('common.buttons.learnMore')}
            </Link>
          </div>
          <div>
            <h3 className="text-h2">{t('home.trust.title')}</h3>
            <dl className="mt-6 grid gap-x-8 gap-y-8 sm:grid-cols-2">
              {(['quality', 'honest', 'language', 'science'] as const).map((k, i) => (
                <div key={k} className="border-t pt-4">
                  <dt className="flex items-center gap-2 font-medium">
                    <Icon name={(['shield', 'question', 'info', 'layers'] as IconName[])[i]} size={20} className="text-rose" />
                    {t(`home.trust.items.${k}.title`)}
                  </dt>
                  <dd className="mt-1.5 text-muted">{t(`home.trust.items.${k}.body`)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Modules */}
      <section className="border-y bg-panel" aria-labelledby="modules-h">
        <div className="container-page py-16">
          <h2 id="modules-h" className="text-h1">{t('home.modules.title')}</h2>
          <div className="mt-8 grid gap-px overflow-hidden rounded-2xl border bg-[color:var(--border)] md:grid-cols-2">
            {(['urine', 'opk'] as const).map((m) => (
              <article key={m} className="bg-panel p-6 sm:p-8">
                <Icon name={m === 'urine' ? 'drop' : 'bloom'} size={32} className={m === 'urine' ? 'text-success' : 'text-rose'} />
                <h3 className="mt-4 text-h2">{t(`common.modules.${m}.name`)}</h3>
                <p className="mt-2 text-muted">{t(m === 'urine' ? 'home.modules.urine' : 'home.modules.opk')}</p>
                <ButtonLink to={`/app/scan/${m}`} variant="secondary" className="mt-6" icon="camera">
                  {t('common.buttons.startScreening')}
                </ButtonLink>
              </article>
            ))}
          </div>
          <Link to="/modules" className="link mt-6 inline-block">
            {t('home.modules.explore')}
          </Link>
        </div>
      </section>

      {/* Privacy + dashboard preview */}
      <section className="container-page grid gap-12 py-16 sm:py-20 lg:grid-cols-2" aria-label={t('home.privacy.title')}>
        <div>
          <Icon name="lock" size={40} className="text-success" />
          <h2 className="mt-4 text-h1">{t('home.privacy.title')}</h2>
          <p className="mt-3 text-body-lg text-muted">{t('home.privacy.body')}</p>
          <Link to="/privacy" className="link mt-5 inline-block">
            {t('home.privacy.link')}
          </Link>
        </div>
        <div>
          <h2 className="text-h2">{t('home.preview.title')}</h2>
          <p className="mt-2 text-muted">{t('home.preview.body')}</p>
          <DashboardPreview />
          <Link to="/product" className="link mt-5 inline-block">
            {t('home.preview.link')}
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#1E2438] text-[#F3EFE6]">
        <div className="container-page flex flex-col gap-6 py-16 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 className="text-h1">{t('home.cta.title')}</h2>
            <p className="mt-2 text-body-lg text-[#F3EFE6]/80">{t('home.cta.body')}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink to="/app/scan" size="lg" className="!bg-[#F3EFE6] !text-[#1E2438] hover:!bg-white" icon="camera">
              {t('home.hero.primary')}
            </ButtonLink>
            <ButtonLink to="/how-it-works" size="lg" variant="ghost" className="!text-[#F3EFE6] hover:!bg-white/10">
              {t('home.hero.secondary')}
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}

/** Static illustration of the dashboard (not live data). */
function DashboardPreview() {
  const { t } = useI18n();
  return (
    <div aria-hidden="true" className="mt-6 grid gap-3 rounded-2xl border bg-panel p-4 sm:grid-cols-[auto_1fr]">
      <div className="flex justify-center">
        <CycleRing day={12} length={28} periodLength={5} fertileStart={9} fertileEnd={15} ovulationDay={14} size={150} label="" centerTop={t('cycle.cycleDay')} centerMain="12" />
      </div>
      <div className="space-y-3">
        <div className="rounded-xl bg-panel-alt/70 p-3">
          <p className="text-caption text-muted">{t('dashboard.lhTrend')}</p>
          <svg viewBox="0 0 200 60" className="mt-1 h-14 w-full">
            <line x1="0" x2="200" y1="22" y2="22" stroke="rgb(var(--gold))" strokeDasharray="4 3" />
            <polyline points="0,52 30,50 60,46 90,40 120,30 150,14 175,28 200,44" fill="none" stroke="rgb(var(--rose))" strokeWidth="2.5" />
            {[0, 30, 60, 90, 120, 150, 175, 200].map((x, i) => (
              <circle key={i} cx={x} cy={[52, 50, 46, 40, 30, 14, 28, 44][i]} r="3" fill="rgb(var(--rose))" />
            ))}
          </svg>
        </div>
        <div className="flex items-center justify-between rounded-xl border p-3">
          <span className="text-label">{t('dashboard.latestUrine')}</span>
          <span className="inline-flex items-center gap-1 text-label font-medium">
            <Icon name="checkCircle" size={16} className="text-success" /> {t('common.status.normal')}
          </span>
        </div>
      </div>
    </div>
  );
}
