import { useI18n } from '../i18n';
import { PageHeader } from './PageHeader';
import { ButtonLink, NumberedList, StatusBadge } from '../components/ui';
import { Icon, type IconName } from '../components/Icon';
import { StripArt, SAMPLE_PADS } from '../components/illustrations/StripArt';
import { CycleRing } from '../components/CycleRing';

const SCREENS: { key: 'onboarding' | 'scanning' | 'results' | 'calendar' | 'history'; icon: IconName }[] = [
  { key: 'onboarding', icon: 'sparkle' },
  { key: 'scanning', icon: 'scan' },
  { key: 'results', icon: 'checkCircle' },
  { key: 'calendar', icon: 'calendar' },
  { key: 'history', icon: 'clock' },
];

function Screen({ k }: { k: (typeof SCREENS)[number]['key'] }) {
  const { t } = useI18n();
  switch (k) {
    case 'onboarding':
      return (
        <div className="space-y-2 p-4">
          <p className="font-display text-body-lg">{t('onboarding.trackTitle')}</p>
          {(['urine', 'fertility', 'both'] as const).map((o, i) => (
            <div key={o} className={`rounded-lg border px-3 py-2 text-label ${i === 2 ? 'border-ink bg-panel-alt' : ''}`}>
              {t(`onboarding.track.${o}.title`)}
            </div>
          ))}
        </div>
      );
    case 'scanning':
      return (
        <svg viewBox="0 0 200 200" className="block h-full w-full bg-[#2F3750]" aria-hidden="true">
          <StripArt pads={SAMPLE_PADS[5]} cx={100} cy={100} angle={70} length={170} showOutline showBoxes outlineColor="#F3EFE6" boxColor="#5FB894" />
        </svg>
      );
    case 'results':
      return (
        <div className="space-y-2 p-4">
          <p className="text-caption text-muted">{t('results.screeningResult')}</p>
          <div className="flex items-center justify-between"><span className="text-label">{t('params.glucose.name')}</span><StatusBadge status="normal" size="sm" /></div>
          <div className="flex items-center justify-between"><span className="text-label">{t('params.protein.name')}</span><StatusBadge status="borderline" size="sm" /></div>
          <div className="flex items-center justify-between"><span className="text-label">{t('params.ph.name')}</span><StatusBadge status="normal" size="sm" /></div>
        </div>
      );
    case 'calendar':
      return (
        <div className="grid grid-cols-7 gap-1 p-4" aria-hidden="true">
          {Array.from({ length: 28 }, (_, i) => (
            <span
              key={i}
              className={`grid aspect-square place-items-center rounded text-[10px] ${i < 5 ? 'bg-rose/25' : i >= 9 && i <= 15 ? 'bg-gold/20' : 'bg-panel-alt/60'} ${i === 13 ? 'ring-2 ring-gold' : ''}`}
            >
              {i + 1}
            </span>
          ))}
        </div>
      );
    case 'history':
      return (
        <div className="flex items-center justify-center p-4">
          <CycleRing day={16} length={29} periodLength={5} fertileStart={10} fertileEnd={16} ovulationDay={15} size={150} label="" centerMain="16" />
        </div>
      );
  }
}

export default function ProductPage() {
  const { t, tl } = useI18n();
  return (
    <>
      <PageHeader title={t('productPage.title')} lead={t('productPage.lead')} />
      <section className="container-page grid gap-12 py-14 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 className="text-h2">{t('productPage.journeyTitle')}</h2>
          <div className="mt-6">
            <NumberedList items={tl('productPage.journey')} />
          </div>
          <ButtonLink to="/app" className="mt-8">
            {t('nav.openApp')}
          </ButtonLink>
        </div>
        <ul className="grid gap-6 sm:grid-cols-2">
          {SCREENS.map((s, i) => (
            <li key={s.key} className={i === 0 ? 'sm:col-span-2' : ''}>
              <div className={`overflow-hidden rounded-2xl border bg-panel ${i === 0 ? 'sm:grid sm:grid-cols-2' : ''}`}>
                <div className="h-48 overflow-hidden border-b sm:h-52">
                  <Screen k={s.key} />
                </div>
                <div className="p-4">
                  <h3 className="flex items-center gap-2 text-h3">
                    <Icon name={s.icon} size={20} className="text-rose" />
                    {t(`productPage.screens.${s.key}.title`)}
                  </h3>
                  <p className="mt-1 text-muted">{t(`productPage.screens.${s.key}.body`)}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className="border-t bg-panel-alt/50">
        <div className="container-page py-12">
          <h2 className="text-h2">{t('productPage.roadmapTitle')}</h2>
          <p className="mt-1 text-muted">{t('productPage.roadmapNote')}</p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {tl('productPage.roadmap').map((r) => (
              <li key={r} className="rounded-full border border-dashed border-[color:var(--border-strong)] px-3.5 py-1.5 text-label text-muted">
                {r}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
