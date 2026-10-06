import { useI18n } from '../../i18n';
import { StripArt, SAMPLE_PADS } from './StripArt';

function Tile({ children, caption, wide = false }: { children: React.ReactNode; caption: string; wide?: boolean }) {
  return (
    <figure className={`flex flex-col ${wide ? '' : ''}`}>
      <div className="grain relative overflow-hidden rounded-xl border bg-[#2F3750]">
        <svg viewBox="0 0 320 200" className="block h-auto w-full" aria-hidden="true">
          {children}
        </svg>
      </div>
      <figcaption className="mt-2.5 text-label font-medium">{caption}</figcaption>
    </figure>
  );
}

export function DetectionShowcase() {
  const { t } = useI18n();
  return (
    <div className="space-y-10">
      <div className="grid gap-6 sm:grid-cols-3">
        {([2, 5, 10] as const).map((n) => (
          <Tile key={n} caption={t('home.showcase.counts', { n })}>
            <StripArt pads={SAMPLE_PADS[n]} cx={160} cy={100} length={n === 2 ? 170 : n === 5 ? 250 : 290} showBoxes showOutline outlineColor="#F3EFE6" boxColor="#5FB894" />
          </Tile>
        ))}
      </div>
      <div>
        <h3 className="mb-4 text-h3">{t('home.showcase.orientationsTitle')}</h3>
        <div className="grid grid-cols-3 gap-3 sm:gap-6">
          <Tile caption={t('home.showcase.horizontal')}>
            <StripArt pads={SAMPLE_PADS[3]} cx={160} cy={100} length={220} showBoxes showOutline outlineColor="#F3EFE6" boxColor="#5FB894" />
          </Tile>
          <Tile caption={t('home.showcase.vertical')}>
            <StripArt pads={SAMPLE_PADS[3]} cx={160} cy={100} angle={90} length={180} showBoxes showOutline outlineColor="#F3EFE6" boxColor="#5FB894" />
          </Tile>
          <Tile caption={t('home.showcase.rotated')}>
            <StripArt pads={SAMPLE_PADS[3]} cx={160} cy={100} angle={-32} length={210} showBoxes showOutline outlineColor="#F3EFE6" boxColor="#5FB894" />
          </Tile>
        </div>
      </div>
    </div>
  );
}
