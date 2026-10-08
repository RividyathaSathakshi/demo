import { lazy, Suspense, useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useI18n } from '../../i18n';
import { Button } from '../../components/ui';
import { Icon, type IconName } from '../../components/Icon';
import {
  findNearby,
  geocode,
  googleDirectionsUrl,
  isValidLatLon,
  NearbyError,
  OSM_COPYRIGHT_URL,
  SEARCH_RADIUS_M,
  WIDE_RADIUS_M,
  type GeocodeResult,
  type NearbyCategory,
  type Place,
  type PlaceType,
} from './nearby';
import type { PlaceDescription } from './NearbyMap';

// Leaflet is only downloaded once there are results to show.
const NearbyMap = lazy(() => import('./NearbyMap'));

/**
 * Search origin. Held only in component state for the current search: never
 * written to storage, logged, sent to analytics or put in a URL.
 */
type Origin = { lat: number; lon: number; label: string | null };

type Status =
  | { kind: 'idle' }
  | { kind: 'locating' }
  | { kind: 'geocoding'; place: string }
  | { kind: 'choosePlace'; place: string; candidates: GeocodeResult[] }
  | { kind: 'searching' }
  | { kind: 'done'; places: Place[]; radiusM: number }
  | { kind: 'locationError'; reason: 'denied' | 'unavailable' | 'timeout' | 'noGeolocation' }
  | { kind: 'emptyInput' }
  | { kind: 'placeNotFound' }
  | { kind: 'error'; busy: boolean };

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

function StepTitle({ n, children, id }: { n: number; children: React.ReactNode; id?: string }) {
  return (
    <h3 id={id} className="mb-2 flex items-center gap-2 text-label font-medium">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-caption text-bg tabular-nums" aria-hidden="true">
        {n}
      </span>
      {children}
    </h3>
  );
}

function Notice({ tone, children }: { tone: 'info' | 'warn' | 'error'; children: React.ReactNode }) {
  const styles = {
    info: 'bg-panel-alt/60',
    warn: 'border border-gold/50 bg-gold/10',
    error: 'border border-danger/40 bg-danger/5',
  }[tone];
  const icon: IconName = tone === 'error' ? 'octagon' : 'info';
  return (
    <div className={`flex gap-2 rounded-xl p-3 text-label ${styles}`} role={tone === 'info' ? 'status' : 'alert'}>
      <Icon name={icon} size={18} className={`mt-0.5 shrink-0 ${tone === 'error' ? 'text-danger' : 'text-gold'}`} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/**
 * "Need professional guidance?": category -> location (device or typed place)
 * -> nearby OpenStreetMap healthcare facilities on a map and in a list ->
 * Get Directions in Google Maps.
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const inputId = useId();
  const searchAbort = useRef<AbortController | null>(null);
  const geoAbort = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLOListElement>(null);

  // Facility search: runs when the origin, category, radius or a retry changes.
  useEffect(() => {
    if (!origin) return;
    searchAbort.current?.abort();
    const ac = new AbortController();
    searchAbort.current = ac;
    setSelectedId(null);
    setStatus({ kind: 'searching' });
    findNearby(category, origin.lat, origin.lon, radiusM, ac.signal)
      .then((places) => {
        if (!ac.signal.aborted) setStatus({ kind: 'done', places, radiusM });
      })
      .catch((e) => {
        if (ac.signal.aborted) return;
        setStatus({ kind: 'error', busy: e instanceof NearbyError && e.kind === 'busy' });
      });
    return () => ac.abort();
  }, [origin, category, radiusM, attempt]);

  // Cancel requests and forget the location when the panel unmounts.
  useEffect(
    () => () => {
      searchAbort.current?.abort();
      geoAbort.current?.abort();
    },
    [],
  );

  const busy = status.kind === 'locating' || status.kind === 'geocoding' || status.kind === 'searching';

  const startSearchAt = (o: Origin) => {
    if (!isValidLatLon(o.lat, o.lon)) {
      setStatus({ kind: 'error', busy: false });
      return;
    }
    setRadiusM(SEARCH_RADIUS_M);
    setOrigin(o);
  };

  const locate = useCallback(() => {
    if (busy) return;
    if (!('geolocation' in navigator) || !navigator.geolocation) {
      setStatus({ kind: 'locationError', reason: 'noGeolocation' });
      return;
    }
    setOrigin(null);
    setStatus({ kind: 'locating' });
    navigator.geolocation.getCurrentPosition(
      (pos) => startSearchAt({ lat: pos.coords.latitude, lon: pos.coords.longitude, label: null }),
      (err) =>
        setStatus({
          kind: 'locationError',
          reason: err.code === err.PERMISSION_DENIED ? 'denied' : err.code === err.TIMEOUT ? 'timeout' : 'unavailable',
        }),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  const submitPlace = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const text = place.trim();
    if (!text) {
      setStatus({ kind: 'emptyInput' });
      return;
    }
    geoAbort.current?.abort();
    const ac = new AbortController();
    geoAbort.current = ac;
    setOrigin(null);
    setStatus({ kind: 'geocoding', place: text });
    try {
      const candidates = await geocode(text, locale, ac.signal);
      if (ac.signal.aborted) return;
      if (!candidates.length) setStatus({ kind: 'placeNotFound' });
      else if (candidates.length === 1) startSearchAt({ lat: candidates[0].lat, lon: candidates[0].lon, label: candidates[0].label });
      else setStatus({ kind: 'choosePlace', place: text, candidates });
    } catch (err) {
      if (ac.signal.aborted) return;
      setStatus({ kind: 'error', busy: err instanceof NearbyError && err.kind === 'busy' });
    }
  };

  const retry = () => {
    if (origin) setAttempt((a) => a + 1);
    else setStatus({ kind: 'idle' });
  };

  const selectPlace = (id: string, scroll: boolean) => {
    setSelectedId(id);
    if (scroll) {
      const el = listRef.current?.querySelector<HTMLElement>(`[data-place-id="${CSS.escape(id)}"]`);
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };

  const km = (m: number) => formatNumber(m / 1000);
  const fmtDist = (m: number) =>
    m < 1000 ? `${formatNumber(Math.round(m / 10) * 10)} m` : `${formatNumber(m / 1000, { maximumFractionDigits: 1 })} km`;

  const describe = useCallback(
    (p: Place): PlaceDescription => {
      const typeLabel = t(`nearby.placeTypes.${p.type}`);
      return {
        title: p.name ?? t('nearby.unnamed', { type: typeLabel.toLowerCase() }),
        subtitle: `${typeLabel}, ${t('nearby.away', { d: fmtDist(p.distanceM) })}`,
        address: p.address,
        directionsUrl: googleDirectionsUrl(p),
        directionsLabel: t('nearby.directions'),
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, formatNumber],
  );

  const originLabel = origin ? origin.label ?? t('nearby.yourLocation') : '';

  return (
    <section aria-labelledby="nearby-h" className="rounded-2xl border bg-panel p-5 sm:p-6">
      <h2 id="nearby-h" className="text-h3">{t('nearby.title')}</h2>
      {!open ? (
        <Button className="mt-4" variant="secondary" icon="pin" onClick={() => setOpen(true)} aria-expanded={false}>
          {t('nearby.action')}
        </Button>
      ) : (
        <div className="mt-3 space-y-6">
          <p className="text-muted">{t('nearby.lead')}</p>

          {/* Step 1: category */}
          <fieldset>
            <legend className="contents">
              <StepTitle n={1}>{t('nearby.step1')}</StepTitle>
            </legend>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <label
                  key={c}
                  className={`flex min-h-[44px] cursor-pointer items-center rounded-full border px-4 text-label has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink ${category === c ? 'border-ink bg-ink text-bg' : 'hover:bg-panel-alt'}`}
                >
                  <input type="radio" name="nearby-cat" value={c} checked={category === c} onChange={() => setCategory(c)} className="sr-only" />
                  {t(`nearby.categories.${c}`)}
                </label>
              ))}
            </div>
            {category === 'womens' && <p className="mt-2 text-caption text-muted">{t('nearby.womensNote')}</p>}
          </fieldset>

          {/* Step 2: location */}
          <div>
            <StepTitle n={2}>{t('nearby.step2')}</StepTitle>
            <div className="grid gap-4 md:grid-cols-[auto_auto_1fr] md:items-start">
              <div>
                <Button icon="pin" onClick={locate} disabled={busy} className="w-full md:w-auto" aria-describedby="nearby-perm">
                  {t('nearby.useLocation')}
                </Button>
                <p id="nearby-perm" className="hint max-w-xs">{t('nearby.askPermission')}</p>
              </div>
              <p className="text-center text-label text-muted md:pt-3" aria-hidden="true">{t('nearby.or')}</p>
              <form onSubmit={submitPlace} className="min-w-0" noValidate>
                <label htmlFor={inputId} className="label">
                  {t('nearby.manualLabel')}
                </label>
                <div className="flex gap-2">
                  <input
                    id={inputId}
                    className="field min-w-0"
                    value={place}
                    placeholder={t('nearby.manualPlaceholder')}
                    onChange={(e) => {
                      setPlace(e.target.value);
                      if (status.kind === 'emptyInput') setStatus({ kind: 'idle' });
                    }}
                    autoComplete="off"
                    enterKeyHint="search"
                    aria-invalid={status.kind === 'emptyInput' || status.kind === 'placeNotFound'}
                  />
                  <Button type="submit" variant="secondary" disabled={busy}>
                    {t('nearby.search')}
                  </Button>
                </div>
                <p className="hint">{t('nearby.manualHint')}</p>
              </form>
            </div>
          </div>

          <p className="flex gap-2 text-caption text-muted">
            <Icon name="lock" size={14} className="mt-0.5 shrink-0" />
            {t('nearby.privacy')}
          </p>

          {/* Status, candidate choice and results */}
          <div aria-live="polite" aria-busy={busy} className="space-y-4">
            {status.kind === 'locating' && <Notice tone="info">{t('nearby.locating')}</Notice>}
            {status.kind === 'geocoding' && <Notice tone="info">{t('nearby.geocoding', { place: status.place })}</Notice>}
            {status.kind === 'searching' && (
              <Notice tone="info">
                {t('nearby.searching')}
                {origin && <span className="block text-caption text-muted">{t('nearby.searchingNear', { place: originLabel })}</span>}
              </Notice>
            )}
            {status.kind === 'emptyInput' && <Notice tone="warn">{t('nearby.emptyInput')}</Notice>}
            {status.kind === 'locationError' && <Notice tone="warn">{t(`nearby.${status.reason}`)}</Notice>}
            {status.kind === 'placeNotFound' && <Notice tone="warn">{t('nearby.placeNotFound')}</Notice>}
            {status.kind === 'error' && (
              <Notice tone="error">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span>{t(status.busy ? 'nearby.failedBusy' : 'nearby.failed')}</span>
                  <Button variant="secondary" size="sm" icon="rotate" onClick={retry}>
                    {t('nearby.retry')}
                  </Button>
                </div>
              </Notice>
            )}

            {status.kind === 'choosePlace' && (
              <fieldset className="rounded-xl border p-4">
                <legend className="px-1 font-medium">{t('nearby.choosePlace')}</legend>
                <p className="text-caption text-muted">{t('nearby.choosePlaceHint', { place: status.place })}</p>
                <ul className="mt-3 space-y-2">
                  {status.candidates.map((c, i) => (
                    <li key={`${c.lat},${c.lon},${i}`}>
                      <button
                        type="button"
                        onClick={() => startSearchAt({ lat: c.lat, lon: c.lon, label: c.label })}
                        className="flex min-h-[48px] w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left hover:bg-panel-alt"
                      >
                        <Icon name="pin" size={18} className="mt-0.5 shrink-0 text-rose" />
                        <span className="min-w-0 break-words text-label">{c.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </fieldset>
            )}

            {status.kind === 'done' && origin && (
              <div>
                <StepTitle n={3}>{t('nearby.step3')}</StepTitle>
                <p className="flex flex-wrap items-baseline gap-x-2 text-label text-muted">
                  <span className="break-words">{t('nearby.searchingNear', { place: originLabel })}</span>
                  {status.places.length > 0 && <span>{t('nearby.found', { n: status.places.length, km: km(status.radiusM) })}</span>}
                </p>

                {status.places.length === 0 ? (
                  <div className="mt-3">
                    <Notice tone="warn">
                      {t('nearby.none')} <span className="text-muted">{t('nearby.noneDetail', { km: km(status.radiusM) })}</span>
                    </Notice>
                    {status.radiusM < WIDE_RADIUS_M && (
                      <Button className="mt-3" variant="secondary" size="sm" icon="scan" onClick={() => setRadiusM(WIDE_RADIUS_M)}>
                        {t('nearby.widen', { km: km(WIDE_RADIUS_M) })}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 grid gap-4 lg:grid-cols-[1.15fr_1fr]">
                    <Suspense fallback={<div className="h-[320px] animate-pulse rounded-xl bg-panel-alt sm:h-[420px]" />}>
                      <NearbyMap
                        origin={{ lat: origin.lat, lon: origin.lon, label: originLabel }}
                        places={status.places}
                        selectedId={selectedId}
                        onSelect={(id) => selectPlace(id, true)}
                        describe={describe}
                        mapLabel={t('nearby.mapLabel')}
                      />
                    </Suspense>
                    <ol ref={listRef} aria-label={t('nearby.listLabel')} className="space-y-3 lg:max-h-[420px] lg:overflow-y-auto lg:pr-1">
                      {status.places.map((p, i) => (
                        <PlaceCard
                          key={p.id}
                          index={i + 1}
                          place={p}
                          description={describe(p)}
                          selected={selectedId === p.id}
                          onShow={() => selectPlace(p.id, false)}
                        />
                      ))}
                    </ol>
                  </div>
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

function PlaceCard({
  index,
  place: p,
  description: d,
  selected,
  onShow,
}: {
  index: number;
  place: Place;
  description: PlaceDescription;
  selected: boolean;
  onShow: () => void;
}) {
  const { t } = useI18n();
  const phone = p.phone?.split(';')[0].trim();
  const tel = phone?.replace(/[^\d+]/g, '');
  return (
    <li data-place-id={p.id} className={`rounded-xl border p-3 transition-colors sm:p-4 ${selected ? 'border-ink bg-panel-alt/70 ring-2 ring-ink' : 'bg-bg/40'}`}>
      <button type="button" onClick={onShow} className="flex w-full gap-3 rounded-lg text-left" aria-pressed={selected} aria-label={`${t('nearby.showOnMap')}: ${d.title}`}>
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-rose text-caption font-semibold text-white tabular-nums" aria-hidden="true">
          {index}
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block break-words font-medium ${p.name ? '' : 'italic text-muted'}`}>{d.title}</span>
          <span className="flex items-center gap-1 text-label text-muted">
            <Icon name={TYPE_ICON[p.type]} size={14} />
            {d.subtitle}
          </span>
          <span className={`mt-1 block break-words text-label ${p.address ? '' : 'text-muted'}`}>{p.address ?? t('nearby.addressUnavailable')}</span>
          {p.openingHours && <span className="mt-1 block break-words text-caption text-muted">{t('nearby.hours', { h: p.openingHours })}</span>}
        </span>
      </button>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-ink px-4 text-label font-medium text-bg hover:bg-ink/90"
          href={d.directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={t('nearby.directionsHint')}
        >
          <Icon name="pin" size={16} /> {d.directionsLabel}
          <Icon name="external" size={14} />
        </a>
        {tel && (
          <a className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border px-3 text-label hover:bg-panel-alt" href={`tel:${tel}`}>
            <Icon name="phone" size={16} /> {t('nearby.call')}
          </a>
        )}
        {p.website && /^https?:\/\//i.test(p.website) && (
          <a className="link inline-flex min-h-[44px] items-center gap-1 text-label" href={p.website} target="_blank" rel="noopener noreferrer">
            {t('nearby.website')} <Icon name="external" size={13} />
          </a>
        )}
      </div>
    </li>
  );
}
