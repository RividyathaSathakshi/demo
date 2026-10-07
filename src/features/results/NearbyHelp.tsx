import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useI18n } from '../../i18n';
import { Button } from '../../components/ui';
import { Icon, type IconName } from '../../components/Icon';
import { directionsUrl, findNearby, geocode, googleDirectionsUrl, type NearbyCategory, type Place, type PlaceType } from './nearby';

type Where = { lat: number; lon: number; label: string | null };
type Status = 'idle' | 'locating' | 'searching' | 'done' | 'error' | 'denied' | 'unavailable' | 'placeNotFound';

const TYPE_ICON: Record<PlaceType, IconName> = {
  clinic: 'plus',
  doctors: 'plus',
  hospital: 'plus',
  pharmacy: 'drop',
  gynaecology: 'bloom',
  midwife: 'bloom',
  centre: 'plus',
  laboratory: 'layers',
  other: 'pin',
};

/**
 * Finds healthcare facilities near the user with OpenStreetMap data, after the
 * user shares a location (with permission) or types a place.
 */
export function NearbyHelp({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const { t, formatNumber } = useI18n();
  const [open, setOpen] = useState(defaultOpen);
  const [category, setCategory] = useState<NearbyCategory>('clinic');
  const [where, setWhere] = useState<Where | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [place, setPlace] = useState('');
  const [results, setResults] = useState<{ places: Place[]; radiusM: number } | null>(null);
  const inputId = useId();
  const abortRef = useRef<AbortController | null>(null);

  // Search whenever the location or category changes.
  useEffect(() => {
    if (!where) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setStatus('searching');
    findNearby(category, where.lat, where.lon, ac.signal)
      .then((r) => {
        setResults(r);
        setStatus('done');
      })
      .catch(() => {
        if (!ac.signal.aborted) setStatus('error');
      });
    return () => ac.abort();
  }, [where, category]);

  const locate = () => {
    if (!navigator.geolocation) {
      setStatus('unavailable');
      return;
    }
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => setWhere({ lat: pos.coords.latitude, lon: pos.coords.longitude, label: null }),
      (err) => setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 },
    );
  };

  const submitPlace = async (e: FormEvent) => {
    e.preventDefault();
    const text = place.trim();
    if (!text) return;
    setStatus('searching');
    try {
      const g = await geocode(text);
      if (!g) {
        setStatus('placeNotFound');
        return;
      }
      setWhere({ lat: g.lat, lon: g.lon, label: text });
    } catch {
      setStatus('error');
    }
  };

  const categoryLabel = t(`nearby.categories.${category}`);
  const q = t(`nearby.categoryQuery.${category}`);
  const fallbackLinks = where
    ? {
        osm: `https://www.openstreetmap.org/search?query=${encodeURIComponent(q)}#map=14/${where.lat.toFixed(4)}/${where.lon.toFixed(4)}`,
        google: `https://www.google.com/maps/search/${encodeURIComponent(q)}/@${where.lat.toFixed(4)},${where.lon.toFixed(4)},14z`,
      }
    : place.trim()
      ? {
          osm: `https://www.openstreetmap.org/search?query=${encodeURIComponent(`${q} ${place.trim()}`)}`,
          google: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${q} near ${place.trim()}`)}`,
        }
      : null;
  const fmtDist = (m: number) =>
    m < 1000 ? `${formatNumber(Math.round(m / 10) * 10)} m` : `${formatNumber(m / 1000, { maximumFractionDigits: 1 })} km`;
  const km = results ? formatNumber(results.radiusM / 1000) : '';

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
              {(['clinic', 'hospital', 'pharmacy', 'womens', 'other'] as NearbyCategory[]).map((c) => (
                <label key={c} className={`cursor-pointer rounded-full border px-3.5 py-2 text-label has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink ${category === c ? 'border-ink bg-ink text-bg' : 'hover:bg-panel-alt'}`}>
                  <input type="radio" name="nearby-cat" value={c} checked={category === c} onChange={() => setCategory(c)} className="sr-only" />
                  {t(`nearby.categories.${c}`)}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 md:grid-cols-[auto_1fr] md:items-end">
            <div>
              <Button icon="pin" onClick={locate} disabled={status === 'locating'}>
                {status === 'locating' ? t('nearby.locating') : t('nearby.useLocation')}
              </Button>
              <p className="hint">{t('nearby.askPermission')}</p>
            </div>
            <form onSubmit={submitPlace}>
              <label htmlFor={inputId} className="label">
                {t('nearby.manualLabel')}
              </label>
              <div className="flex gap-2">
                <input id={inputId} className="field min-w-0" value={place} placeholder={t('nearby.manualPlaceholder')} onChange={(e) => setPlace(e.target.value)} autoComplete="address-level2" />
                <Button type="submit" variant="secondary">
                  {t('nearby.search')}
                </Button>
              </div>
            </form>
          </div>
          <p className="flex gap-2 text-caption text-muted">
            <Icon name="lock" size={14} className="mt-0.5 shrink-0" />
            {t('nearby.privacy')}
          </p>

          <div aria-live="polite">
            {(status === 'denied' || status === 'unavailable' || status === 'error') && (
              <p className="flex gap-2 text-label text-danger" role="alert">
                <Icon name="info" size={18} className="shrink-0" />
                {t(`nearby.${status}`)}
              </p>
            )}
            {status === 'placeNotFound' && (
              <p className="text-label text-danger" role="alert">
                {t('nearby.placeNotFound', { place: place.trim() })}
              </p>
            )}
            {status === 'searching' && (
              <p className="flex items-center gap-2 text-label text-muted" role="status">
                <span className="h-2 w-2 animate-ping rounded-full bg-gold" />
                {t('nearby.searching')}
              </p>
            )}
            {status === 'done' && results && where && (
              <div>
                <p className="text-label text-muted">
                  {where.label ? t('nearby.near', { place: where.label }) : t('nearby.nearYou')}
                  {'. '}
                  {results.places.length
                    ? t('nearby.found', { n: results.places.length, km })
                    : t('nearby.none', { category: categoryLabel.toLowerCase(), km })}
                </p>
                {results.places.length > 0 && (
                  <ul className="mt-3 divide-y border-y">
                    {results.places.map((p) => {
                      const typeLabel = t(`nearby.placeTypes.${p.type}`);
                      return (
                        <li key={p.id} className="flex gap-3 py-3.5">
                          <Icon name={TYPE_ICON[p.type]} size={20} className="mt-0.5 shrink-0 text-rose" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{p.name ?? t('nearby.unnamed', { type: typeLabel.toLowerCase() })}</p>
                            <p className="text-label text-muted">
                              {typeLabel}, {t('nearby.away', { d: fmtDist(p.distanceM) })}
                            </p>
                            {p.address && <p className="text-label">{p.address}</p>}
                            {p.openingHours && <p className="break-words text-caption text-muted">{t('nearby.hours', { h: p.openingHours })}</p>}
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-label">
                              <a className="link inline-flex items-center gap-1" href={googleDirectionsUrl(p)} target="_blank" rel="noopener noreferrer">
                                <Icon name="pin" size={15} /> {t('nearby.directions')}
                              </a>
                              <a className="link inline-flex items-center gap-1" href={directionsUrl(p)} target="_blank" rel="noopener noreferrer">
                                OpenStreetMap <Icon name="external" size={14} />
                              </a>
                              {p.phone && (
                                <a className="link inline-flex items-center gap-1" href={`tel:${p.phone.split(';')[0].replace(/\s+/g, '')}`}>
                                  <Icon name="phone" size={15} /> {t('nearby.call')} <span className="text-muted">{p.phone.split(';')[0]}</span>
                                </a>
                              )}
                              {p.website && (
                                <a className="link inline-flex items-center gap-1" href={p.website} target="_blank" rel="noopener noreferrer">
                                  {t('nearby.website')} <Icon name="external" size={14} />
                                </a>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <p className="mt-3 text-caption text-muted">{t('nearby.dataNote')}</p>
                <p className="text-caption text-muted">{t('nearby.attribution')}</p>
              </div>
            )}
          </div>

          {fallbackLinks && (status === 'done' || status === 'error') && (
            <details className="text-label">
              <summary className="cursor-pointer text-muted">{t('nearby.mapSearch')}</summary>
              <ul className="mt-2 space-y-1.5">
                <li>
                  <a className="link inline-flex items-center gap-1.5" href={fallbackLinks.google} target="_blank" rel="noopener noreferrer">
                    {t('nearby.openGoogle', { category: categoryLabel })} <Icon name="external" size={14} />
                  </a>
                </li>
                <li>
                  <a className="link inline-flex items-center gap-1.5" href={fallbackLinks.osm} target="_blank" rel="noopener noreferrer">
                    {t('nearby.openOsm', { category: categoryLabel })} <Icon name="external" size={14} />
                  </a>
                </li>
              </ul>
              <p className="hint">{t('nearby.externalNote')}</p>
            </details>
          )}

          <p className="flex gap-2 text-label">
            <Icon name="octagon" size={18} className="shrink-0 text-danger" />
            {t('nearby.emergency')}
          </p>
        </div>
      )}
    </section>
  );
}
