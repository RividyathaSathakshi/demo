/**
 * Nearby healthcare search using OpenStreetMap's public services, called
 * directly from the browser (no Lumenova server, nothing stored):
 *
 *  - Nominatim turns a typed place into coordinates. One request per explicit
 *    Search click (no autocomplete), at most one request per second, results
 *    cached in memory for the session, per the Nominatim usage policy:
 *    https://operations.osmfoundation.org/policies/nominatim/
 *  - Overpass finds healthcare facilities around a point (about 5 km).
 *
 * Data © OpenStreetMap contributors, ODbL: https://www.openstreetmap.org/copyright
 */

export type NearbyCategory = 'clinic' | 'hospital' | 'pharmacy' | 'womens' | 'other';
export type PlaceType =
  | 'clinic'
  | 'doctors'
  | 'hospital'
  | 'pharmacy'
  | 'gynaecology'
  | 'midwife'
  | 'centre'
  | 'laboratory'
  | 'dentist'
  | 'other';

export interface Place {
  id: string;
  name: string | null;
  type: PlaceType;
  lat: number;
  lon: number;
  distanceM: number;
  address: string | null;
  phone: string | null;
  website: string | null;
  openingHours: string | null;
}

export type NearbyErrorKind = 'network' | 'timeout' | 'busy' | 'server';

export class NearbyError extends Error {
  constructor(public readonly kind: NearbyErrorKind, message: string) {
    super(message);
    this.name = 'NearbyError';
  }
}

export const SEARCH_RADIUS_M = 5000;
export const WIDE_RADIUS_M = 15000;
const REQUEST_TIMEOUT_MS = 25000;
const MAX_RESULTS = 20;

export const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
export const OSM_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright';

const WOMENS_NAME = 'women|woman|maternity|gyn|obstet|fertility|ivf|antenatal|prenatal|mahila|matern';

/** Overpass filters per category (each becomes nwr(around:...)<filter>;). Only real OSM tags. */
const FILTERS: Record<NearbyCategory, string[]> = {
  clinic: ['[amenity~"^(clinic|doctors)$"]', '[healthcare~"^(clinic|doctor)$"]'],
  hospital: ['[amenity=hospital]', '[healthcare=hospital]'],
  pharmacy: ['[amenity=pharmacy]', '[healthcare=pharmacy]'],
  womens: [
    '["healthcare:speciality"~"gynaecology|obstetrics|midwifery|family_planning|fertility|reproductive"]',
    '[healthcare~"^(midwife|birthing_centre)$"]',
    `[amenity~"^(clinic|doctors|hospital)$"][name~"${WOMENS_NAME}",i]`,
  ],
  other: [
    '[healthcare~"^(centre|laboratory|dentist|physiotherapist|counselling|nurse|rehabilitation|blood_donation|dialysis|sample_collection)$"]',
    '[amenity~"^(health_post|dentist)$"]',
  ],
};

export function buildOverpassQuery(category: NearbyCategory, lat: number, lon: number, radiusM: number): string {
  const around = `(around:${Math.round(radiusM)},${lat.toFixed(5)},${lon.toFixed(5)})`;
  const parts = FILTERS[category].map((f) => `nwr${around}${f};`).join('');
  return `[out:json][timeout:25];(${parts});out center tags 80;`;
}

export function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements?: OverpassElement[];
  remark?: string;
}

function placeType(tags: Record<string, string>): PlaceType {
  const spec = tags['healthcare:speciality'] ?? '';
  const a = tags.amenity;
  const h = tags.healthcare;
  if (/gynaecology|obstetrics|midwifery|family_planning|fertility|reproductive/.test(spec)) return 'gynaecology';
  if (h === 'midwife' || h === 'birthing_centre') return 'midwife';
  if (a === 'hospital' || h === 'hospital') return 'hospital';
  if (a === 'pharmacy' || h === 'pharmacy') return 'pharmacy';
  if (a === 'dentist' || h === 'dentist') return 'dentist';
  if (a === 'doctors' || h === 'doctor') return 'doctors';
  if (a === 'clinic' || h === 'clinic') return 'clinic';
  if (h === 'laboratory' || h === 'sample_collection') return 'laboratory';
  if (h === 'centre' || a === 'health_post') return 'centre';
  return 'other';
}

function address(tags: Record<string, string>): string | null {
  if (tags['addr:full']) return tags['addr:full'];
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  const parts = [
    tags['addr:place'] ?? street,
    tags['addr:suburb'],
    tags['addr:city'] ?? tags['addr:town'] ?? tags['addr:village'],
    tags['addr:postcode'],
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

export function parseOverpass(json: OverpassResponse, lat: number, lon: number): Place[] {
  const seen = new Set<string>();
  const out: Place[] = [];
  for (const el of json.elements ?? []) {
    const plat = el.lat ?? el.center?.lat;
    const plon = el.lon ?? el.center?.lon;
    if (plat === undefined || plon === undefined) continue;
    const tags = el.tags ?? {};
    const name = tags.name ?? tags['name:en'] ?? tags.brand ?? tags.operator ?? null;
    // The same facility is often mapped as both a point and a building outline.
    const key = name ? `${name.toLowerCase()}@${plat.toFixed(3)},${plon.toFixed(3)}` : `${el.type}/${el.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: `${el.type}/${el.id}`,
      name,
      type: placeType(tags),
      lat: plat,
      lon: plon,
      distanceM: haversineM(lat, lon, plat, plon),
      address: address(tags),
      phone: tags.phone ?? tags['contact:phone'] ?? null,
      website: tags.website ?? tags['contact:website'] ?? null,
      openingHours: tags.opening_hours ?? null,
    });
  }
  return out.sort((a, b) => a.distanceM - b.distanceM);
}

async function fetchWithTimeout(url: string, init: RequestInit, signal?: AbortSignal): Promise<Response> {
  const ctl = new AbortController();
  const onAbort = () => ctl.abort();
  signal?.addEventListener('abort', onAbort);
  const timer = setTimeout(() => ctl.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } catch (e) {
    if (signal?.aborted) throw e;
    if (ctl.signal.aborted) throw new NearbyError('timeout', 'The request timed out');
    throw new NearbyError('network', 'The service could not be reached');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

/**
 * Healthcare facilities within `radiusM` of a point. Tries the Overpass
 * mirrors in turn and throws a NearbyError if none answers properly; it never
 * returns made-up or cached facilities.
 */
export async function findNearby(
  category: NearbyCategory,
  lat: number,
  lon: number,
  radiusM = SEARCH_RADIUS_M,
  signal?: AbortSignal,
): Promise<Place[]> {
  const body = `data=${encodeURIComponent(buildOverpassQuery(category, lat, lon, radiusM))}`;
  let lastError: NearbyError = new NearbyError('network', 'The service could not be reached');
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetchWithTimeout(
        endpoint,
        { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
        signal,
      );
      if (res.status === 429 || res.status === 504) {
        lastError = new NearbyError('busy', `Overpass is busy (${res.status})`);
        continue;
      }
      if (!res.ok) {
        lastError = new NearbyError('server', `Overpass returned ${res.status}`);
        continue;
      }
      const json = (await res.json()) as OverpassResponse;
      // Overpass reports query timeouts and overload as a "remark" with HTTP 200.
      if (json.remark && /error|timed out|out of memory/i.test(json.remark)) {
        lastError = new NearbyError('busy', json.remark);
        continue;
      }
      return parseOverpass(json, lat, lon).slice(0, MAX_RESULTS);
    } catch (e) {
      if (signal?.aborted) throw e;
      lastError = e instanceof NearbyError ? e : new NearbyError('server', 'Unexpected response');
    }
  }
  throw lastError;
}

// --- Nominatim (typed place -> coordinates) -------------------------------

export interface GeocodeResult {
  lat: number;
  lon: number;
  label: string;
}

const geocodeCache = new Map<string, GeocodeResult | null>();
let lastNominatimCall = 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Geocodes one place name. Called only when the user presses Search; spaced
 * at least 1 s apart and cached for the session, as Nominatim's policy requires.
 */
export async function geocode(query: string, lang?: string, signal?: AbortSignal): Promise<GeocodeResult | null> {
  const key = query.trim().toLowerCase();
  if (geocodeCache.has(key)) return geocodeCache.get(key)!;
  const wait = lastNominatimCall + 1100 - Date.now();
  if (wait > 0) await sleep(wait);
  lastNominatimCall = Date.now();
  const params = new URLSearchParams({ format: 'jsonv2', limit: '1', q: query.trim() });
  if (lang) params.set('accept-language', lang);
  const res = await fetchWithTimeout(`${NOMINATIM}?${params}`, { headers: { Accept: 'application/json' } }, signal);
  if (res.status === 429) throw new NearbyError('busy', 'Nominatim rate limit');
  if (!res.ok) throw new NearbyError('server', `Nominatim returned ${res.status}`);
  const json = (await res.json()) as { lat: string; lon: string; display_name: string }[];
  const result = json.length ? { lat: Number(json[0].lat), lon: Number(json[0].lon), label: json[0].display_name } : null;
  geocodeCache.set(key, result);
  return result;
}

/** For tests. */
export function resetNominatimState() {
  geocodeCache.clear();
  lastNominatimCall = 0;
}

// --- Directions (destination only; the user's position is never put in a URL) ---

export function googleDirectionsUrl(p: Place): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${p.lat.toFixed(6)},${p.lon.toFixed(6)}`;
}

export function osmUrl(p: Place): string {
  const [type, id] = p.id.split('/');
  return `https://www.openstreetmap.org/${type}/${id}`;
}
