import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { Icon } from '../../components/Icon';
import { StripArt, SAMPLE_PADS } from '../../components/illustrations/StripArt';
import type { ScanModule } from '../../cv/pipeline';

export default function ScanChooser() {
  const { t } = useI18n();
  const modules: ScanModule[] = ['urine', 'opk'];
  return (
    <div className="container-page max-w-4xl py-8 sm:py-12">
      <h1 className="text-h1">{t('scanChooser.title')}</h1>
      <p className="mt-2 text-body-lg text-muted">{t('scanChooser.lead')}</p>
      <ul className="mt-8 grid gap-5 md:grid-cols-2">
        {modules.map((m) => (
          <li key={m}>
            <Link to={`/app/scan/${m}`} className="group block overflow-hidden rounded-2xl border bg-panel transition-colors hover:border-[color:var(--border-strong)]">
              <div className="grain bg-[#2F3750]">
                <svg viewBox="0 0 320 120" className="block h-auto w-full" aria-hidden="true">
                  {m === 'urine' ? (
                    <StripArt pads={SAMPLE_PADS[5]} cx={160} cy={60} angle={-12} length={250} showBoxes boxColor="#5FB894" />
                  ) : (
                    <StripArt kind="opk" cx={160} cy={60} angle={8} length={270} showBoxes labels boxColor="#5FB894" />
                  )}
                </svg>
              </div>
              <div className="flex items-start gap-3 p-5">
                <Icon name={m === 'urine' ? 'drop' : 'bloom'} size={28} className={m === 'urine' ? 'text-success' : 'text-rose'} />
                <div className="flex-1">
                  <h2 className="text-h3">{t(`common.modules.${m}.name`)}</h2>
                  <p className="mt-1 text-muted">{t(`common.modules.${m}.short`)}</p>
                </div>
                <Icon name="chevronRight" size={22} className="mt-1 text-muted transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-label text-muted">{t('scanChooser.manual')}</p>
      <div className="mt-2 flex flex-wrap gap-4">
        {modules.map((m) => (
          <Link key={m} to={`/app/manual/${m}`} className="link inline-flex items-center gap-1.5 text-label">
            <Icon name="edit" size={16} /> {t(`common.modules.${m}.name`)}
          </Link>
        ))}
      </div>
    </div>
  );
}
