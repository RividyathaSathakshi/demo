import { useId, useState, type FormEvent } from 'react';
import { useI18n } from '../../i18n';
import { Button } from '../../components/ui';
import { Icon } from '../../components/Icon';

type Category = 'clinic' | 'hospital' | 'pharmacy' | 'womens' | 'other';
type Where = { kind: 'coords'; lat: number; lon: number } | { kind: 'place'; text: string };

/**
 * Prototype: there is no provider directory, so this never lists places.
 * It builds search links for external maps after the user shares a location
 * (with permission) or types one in.
 */
export function NearbyHelp() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>('clinic');
  const [where, setWhere] = useState<Where | null>(null);
  const [geoState, setGeoState] = useState<'idle' | 'locating' | 'denied' | 'unavailable'>('idle');
  const [place, setPlace] = useState('');
  const inputId = useId();

  const locate = () => {
    if (!navigator.geolocation) {
      setGeoState('unavailable');
      return;
    }
    setGeoState('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoState('idle');
        setWhere({ kind: 'coords', lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      (err) => setGeoState(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 },
    );
  };

  const submitPlace = (e: FormEvent) => {
    e.preventDefault();
    if (place.trim()) setWhere({ kind: 'place', text: place.trim() });
  };

  const q = t(`nearby.categoryQuery.${category}`);
  const links = where
    ? where.kind === 'coords'
      ? {
          osm: `https://www.openstreetmap.org/search?query=${encodeURIComponent(q)}#map=14/${where.lat.toFixed(4)}/${where.lon.toFixed(4)}`,
          google: `https://www.google.com/maps/search/${encodeURIComponent(q)}/@${where.lat.toFixed(4)},${where.lon.toFixed(4)},14z`,
        }
      : {
          osm: `https://www.openstreetmap.org/search?query=${encodeURIComponent(`${q} ${where.text}`)}`,
          google: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${q} near ${where.text}`)}`,
        }
    : null;
  const categoryLabel = t(`nearby.categories.${category}`);

  return (
    <section aria-labelledby="nearby-h" className="rounded-2xl border bg-panel p-5 sm:p-6">
      <h2 id="nearby-h" className="text-h3">{t('nearby.title')}</h2>
      {!open ? (
        <Button className="mt-4" variant="secondary" icon="pin" onClick={() => setOpen(true)} aria-expanded={false}>
          {t('nearby.action')}
        </Button>
      ) : (
        <div className="mt-3 space-y-5">
          <p className="text-muted">{t('nearby.lead')}</p>
          <fieldset>
            <legend className="sr-only">{t('nearby.action')}</legend>
            <div className="flex flex-wrap gap-2">
              {(['clinic', 'hospital', 'pharmacy', 'womens', 'other'] as Category[]).map((c) => (
                <label key={c} className={`cursor-pointer rounded-full border px-3.5 py-2 text-label ${category === c ? 'border-ink bg-ink text-bg' : 'hover:bg-panel-alt'}`}>
                  <input type="radio" name="nearby-cat" value={c} checked={category === c} onChange={() => setCategory(c)} className="sr-only" />
                  {t(`nearby.categories.${c}`)}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Button icon="pin" onClick={locate} disabled={geoState === 'locating'}>
                {geoState === 'locating' ? t('nearby.locating') : t('nearby.useLocation')}
              </Button>
              <p className="hint">{t('nearby.askPermission')}</p>
              {(geoState === 'denied' || geoState === 'unavailable') && (
                <p className="mt-2 text-label text-danger" role="alert">
                  {t(geoState === 'denied' ? 'nearby.denied' : 'nearby.unavailable')}
                </p>
              )}
            </div>
            <form onSubmit={submitPlace}>
              <label htmlFor={inputId} className="label">
                {t('nearby.manualLabel')}
              </label>
              <div className="flex gap-2">
                <input id={inputId} className="field" value={place} placeholder={t('nearby.manualPlaceholder')} onChange={(e) => setPlace(e.target.value)} autoComplete="address-level2" />
                <Button type="submit" variant="secondary">
                  {t('nearby.search')}
                </Button>
              </div>
            </form>
          </div>

          <div className="rounded-xl border border-dashed border-[color:var(--border-strong)] p-4">
            <p className="flex items-center gap-2 font-medium">
              <Icon name="info" size={18} className="text-gold" /> {t('nearby.prototypeTitle')}
            </p>
            <p className="mt-1 text-label text-muted">{t('nearby.prototypeBody')}</p>
            {links && (
              <div className="mt-4">
                <p className="text-label">{where?.kind === 'coords' ? t('nearby.usingCoords') : t('nearby.usingPlace', { place: (where as { text: string }).text })}</p>
                <ul className="mt-2 space-y-2">
                  <li>
                    <a className="link inline-flex items-center gap-1.5" href={links.osm} target="_blank" rel="noopener noreferrer">
                      {t('nearby.openOsm', { category: categoryLabel })} <Icon name="external" size={16} />
                    </a>
                  </li>
                  <li>
                    <a className="link inline-flex items-center gap-1.5" href={links.google} target="_blank" rel="noopener noreferrer">
                      {t('nearby.openGoogle', { category: categoryLabel })} <Icon name="external" size={16} />
                    </a>
                  </li>
                </ul>
                <p className="hint">{t('nearby.externalNote')}</p>
              </div>
            )}
          </div>
          <p className="flex gap-2 text-label">
            <Icon name="octagon" size={18} className="shrink-0 text-danger" />
            {t('nearby.emergency')}
          </p>
        </div>
      )}
    </section>
  );
}
