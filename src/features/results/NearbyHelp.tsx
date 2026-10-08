import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useI18n } from '../../i18n';
import { Button } from '../../components/ui';
import { Icon, type IconName } from '../../components/Icon';
import {
  findNearby,
  geocode,
  googleDirectionsUrl,
  NearbyError,
  OSM_COPYRIGHT_URL,
  osmUrl,
  SEARCH_RADIUS_M,
  WIDE_RADIUS_M,
  type NearbyCategory,
  type NearbyErrorKind,
  type Place,
  type PlaceType,
} from './nearby';

/** Search origin. Held only in component memory; never stored, logged or put in a URL. */
type Origin = { lat: number; lon: number; label: string | null };

type Status =
  | { kind: 'idle' }
  | { kind: 'locating' }
  | { kind: 'geocoding'; place: string }
  | { kind: 'searching' }
  | { kind: 'done'; places: Place[]; radiusM: number }
  | { kind: 'locationError'; reason: 'denied' | 'unavailable' | 'noGeolocation' }
  | { kind: 'placeNotFound'; place: string }
  | { kind: 'error'; error: NearbyErrorKind };

const CATEGORIES: NearbyCategory[] = ['clinic', 'hospital', 'pharmacy', 'womens', 'other'];

const TYPE_ICON: Record<PlaceType, IconName> = {
  clinic: 'plus',
  doctors: 'plus',
  hospital: 'plus',
  pharmacy: 'drop',
  gynaecology: 'bloom',
  midwife: 'bloom',
  centre: 'plus',
  laboratory: 'layers',
  dentist: 'plus',
  other: 'pin',
};

/**
 * "Find wellness help nearby": real healthcare facilities from OpenStreetMap
 * around the user's location (with permission) or a place they type.
 */
export function NearbyHelp({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const { t, locale, formatNumber } = useI18n();
  const [open, setOpen] = useState(defaultOpen);
  const [category, setCategory] = useState<NearbyCategory>('clinic');
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [radiusM, setRadiusM] = useState(SEARCH_RADIUS_M);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [place, setPlace] = useState('');
  const [attempt, setAttempt] = useState(0);
  const inputId = useId();
  const abortRef = useRef<AbortController | null>(null);

  // Run the facility search whenever the origin, category, radius or a retry changes.
  useEffect(() => {
    if (!origin) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setStatus({ kind: 'searching' });
    findNearby(category, origin.lat, origin.lon, radiusM, ac.signal)
      .then((places) => setStatus({ kind: 'done', places, radiusM }))
      .catch((e) => {
        if (ac.signal.aborted) return;
        setStatus({ kind: 'error', error: e instanceof NearbyError ? e.kind : 'network' });
      });
    return () => ac.abort();
  }, [origin, category, radiusM, attempt]);

  // Forget the location when the section is closed or the screen is left.
  useEffect(() => () => abortRef.current?.abort(), []);

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus({ kind: 'locationError', reason: 'noGeolocation' });
      return;
    }
    setStatus({ kind: 'locating' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setRadiusM(SEARCH_RADIUS_M);
        setOrigin({ lat: pos.coords.latitude, lon: pos.coords.longitude, label: null });
      },
      (err) => setStatus({ kind: 'locationError', reason: err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable' }),
      { enableHighAccuracy: false, timeout: 20000, maximumAge: 300000 },
    );
  }, []);

  const submitPlace = async (e: FormEvent) => {
    e.preventDefault();
    const text = place.trim();
    if (!text || status.kind === 'geocoding') return;
    setStatus({ kind: 'geocoding', place: text });
    try {
      const g = await geocode(text, locale);
      if (!g) {
        setStatus({ kind: 'placeNotFound', place: text });
        return;
      }
      setRadiusM(SEARCH_RADIUS_M);
      setOrigin({ lat: g.lat, lon: g.lon, label: text });
    } catch (err) {
      setStatus({ kind: 'error', error: err instanceof NearbyError ? err.kind : 'network' });
    }
  };

  const retry = () => {
    if (origin) setAttempt((a) => a + 1);
    else setStatus({ kind: 'idle' });
  };

  const busy = status.kind === 'locating' || status.kind === 'geocoding' || status.kind === 'searching';
  const categoryLabel = t(`nearby.categories.${category}`);
  const km = (m: number) => formatNumber(m / 1000);
  const fmtDist = (m: number) =>
    m < 1000 ? `${formatNumber(Math.round(m / 10) * 10)} m` : `${formatNumber(m / 1000, { maximumFractionDigits: 1 })} km`;

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
            <legend className="label">{t('nearby.categoryLabel')}</legend>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <label
                  key={c}
                  className={`cursor-pointer rounded-full border px-3.5 py-2 text-label has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink ${category === c ? 'border-ink bg-ink text-bg' : 'hover:bg-panel-alt'}`}
                >
                  <input type="radio" name="nearby-cat" value={c} checked={category === c} onChange={() => setCategory(c)} className="sr-only" />
                  {t(`nearby.categories.${c}`)}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-5 md:grid-cols-[auto_1fr] md:items-start md:gap-6">
            <div>
              <Button icon="pin" onClick={locate} disabled={busy} aria-describedby="nearby-perm">
                {status.kind === 'locating' ? t('nearby.locating') : t('nearby.useLocation')}
              </Button>
              <p id="nearby-perm" className="hint max-w-xs">{t('nearby.askPermission')}</p>
            </div>
            <form onSubmit={submitPlace} className="min-w-0">
              <label htmlFor={inputId} className="label">
                {t('nearby.manualLabel')}
              </label>
              <div className="flex gap-2">
                <input
                  id={inputId}
                  className="field min-w-0"
                  value={place}
                  placeholder={t('nearby.manualPlaceholder')}
                  onChange={(e) => setPlace(e.target.value)}
                  autoComplete="off"
                  enterKeyHint="search"
                />
                <Button type="submit" variant="secondary" disabled={busy || !place.trim()}>
                  {t('nearby.search')}
                </Button>
              </div>
              <p className="hint">{t('nearby.manualHint')}</p>
            </form>
          </div>

          <p className="flex gap-2 text-caption text-muted">
            <Icon name="lock" size={14} className="mt-0.5 shrink-0" />
            {t('nearby.privacy')}
          </p>

          <div aria-live="polite" aria-busy={busy}>
            {(status.kind === 'locating' || status.kind === 'geocoding' || status.kind === 'searching') && (
              <p className="flex items-center gap-2 rounded-xl bg-panel-alt/60 p-3 text-label" role="status">
                <span className="h-2.5 w-2.5 shrink-0 animate-ping rounded-full bg-gold" />
                {status.kind === 'locating'
                  ? t('nearby.locating')
                  : status.kind === 'geocoding'
                    ? t('nearby.geocoding', { place: status.place })
                    : t('nearby.searching')}
              </p>
            )}

            {status.kind === 'locationError' && (
              <p className="flex gap-2 rounded-xl border border-gold/50 bg-gold/10 p-3 text-label" role="alert">
                <Icon name="info" size={18} className="mt-0.5 shrink-0 text-gold" />
                {t(`nearby.${status.reason}`)}
              </p>
            )}

            {status.kind === 'placeNotFound' && (
              <p className="flex gap-2 rounded-xl border border-gold/50 bg-gold/10 p-3 text-label" role="alert">
                <Icon name="info" size={18} className="mt-0.5 shrink-0 text-gold" />
                {t('nearby.placeNotFound', { place: status.place })}
              </p>
            )}

            {status.kind === 'error' && (
              <div className="flex flex-col gap-3 rounded-xl border border-danger/40 bg-danger/5 p-3 sm:flex-row sm:items-center" role="alert">
                <p className="flex flex-1 gap-2 text-label">
                  <Icon name="octagon" size={18} className="mt-0.5 shrink-0 text-danger" />
                  {t(`nearby.errors.${status.error}`)}
                </p>
                <Button variant="secondary" size="sm" icon="rotate" onClick={retry}>
                  {t('nearby.retry')}
                </Button>
              </div>
            )}

            {status.kind === 'done' && origin && (
              <div>
                <p className="text-label text-muted">
                  {origin.label ? t('nearby.near', { place: origin.label }) : t('nearby.nearYou')}
                  {'. '}
                  {status.places.length
                    ? t('nearby.found', { n: status.places.length, km: km(status.radiusM) })
                    : t('nearby.none', { category: categoryLabel.toLowerCase(), km: km(status.radiusM) })}
                </p>

                {status.places.length === 0 && status.radiusM < WIDE_RADIUS_M && (
                  <Button className="mt-3" variant="secondary" size="sm" icon="scan" onClick={() => setRadiusM(WIDE_RADIUS_M)}>
                    {t('nearby.widen', { km: km(WIDE_RADIUS_M) })}
                  </Button>
                )}

                {status.places.length > 0 && (
                  <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                    {status.places.map((p) => (
                      <PlaceCard key={p.id} place={p} distance={fmtDist(p.distanceM)} />
                    ))}
                  </ul>
                )}
                <p className="mt-3 text-caption text-muted">{t('nearby.dataNote')}</p>
              </div>
            )}
          </div>

          <p className="flex gap-2 text-label">
            <Icon name="octagon" size={18} className="shrink-0 text-danger" />
            {t('nearby.emergency')}
          </p>

          <p className="border-t pt-3 text-caption text-muted">
            {t('nearby.attributionData')}{' '}
            <a className="link" href={OSM_COPYRIGHT_URL} target="_blank" rel="noopener noreferrer">
              {t('nearby.attributionLink')}
            </a>
            {'. '}
            {t('nearby.attributionSearch')}.
          </p>
        </div>
      )}
    </section>
  );
}

function PlaceCard({ place: p, distance }: { place: Place; distance: string }) {
  const { t } = useI18n();
  const typeLabel = t(`nearby.placeTypes.${p.type}`);
  const phone = p.phone?.split(';')[0].trim();
  return (
    <li className="flex min-w-0 flex-col rounded-xl border bg-bg/40 p-4">
      <div className="flex gap-3">
        <Icon name={TYPE_ICON[p.type]} size={20} className="mt-0.5 shrink-0 text-rose" />
        <div className="min-w-0 flex-1">
          <p className={`break-words font-medium ${p.name ? '' : 'italic text-muted'}`}>
            {p.name ?? t('nearby.unnamed', { type: typeLabel.toLowerCase() })}
          </p>
          <p className="text-label text-muted">
            {typeLabel}
            {', '}
            {t('nearby.away', { d: distance })}
          </p>
          {p.address && <p className="mt-1 break-words text-label">{p.address}</p>}
          {p.openingHours && <p className="mt-1 break-words text-caption text-muted">{t('nearby.hours', { h: p.openingHours })}</p>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 pt-1">
        <a
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-ink px-3.5 text-label font-medium text-bg hover:bg-ink/90"
          href={googleDirectionsUrl(p)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon name="pin" size={16} /> {t('nearby.directions')}
        </a>
        {phone && (
          <a className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-3 text-label hover:bg-panel-alt" href={`tel:${phone.replace(/[^\d+]/g, '')}`}>
            <Icon name="phone" size={16} /> {t('nearby.call')}
          </a>
        )}
        <a className="link inline-flex items-center gap-1 text-caption" href={osmUrl(p)} target="_blank" rel="noopener noreferrer">
          {t('nearby.viewOnOsm')} <Icon name="external" size={13} />
        </a>
        {p.website && /^https?:\/\//i.test(p.website) && (
          <a className="link inline-flex items-center gap-1 text-caption" href={p.website} target="_blank" rel="noopener noreferrer">
            {t('nearby.website')} <Icon name="external" size={13} />
          </a>
        )}
      </div>
    </li>
  );
}
