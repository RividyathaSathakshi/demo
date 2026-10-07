/**
 * Nearby healthcare search using OpenStreetMap's public services:
 * Nominatim to turn a typed place into coordinates, and Overpass to find
 * healthcare facilities around a point. Both are called directly from the
 * browser; nothing passes through a Lumenova server and nothing is stored.
 */

export type NearbyCategory = 'clinic' | 'hospital' | 'pharmacy' | 'womens' | 'other';
export type PlaceType = 'clinic' | 'doctors' | 'hospital' | 'pharmacy' | 'gynaecology' | 'midwife' | 'centre' | 'laboratory' | 'other';

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

const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

/** Overpass filters per category (each line becomes nwr(around:...)<filter>;). */
const FILTERS: Record<NearbyCategory, string[]> = {
  clinic: ['[amenity~"^(clinic|doctors)$"]', '[healthcare~"^(clinic|doctor)$"]'],
  hospital: ['[amenity=hospital]', '[healthcare=hospital]'],
  pharmacy: ['[amenity=pharmacy]', '[healthcare=pharmacy]'],
  womens: [
    '["healthcare:speciality"~"gynaecology|obstetrics|midwifery|family_planning|fertility"]',
    '[healthcare~"^(midwife|birthing_centre)$"]',
  ],
  other: ['[healthcare~"^(centre|laboratory|counselling|nurse)$"]', '[amenity=health_post]'],
};

export function buildOverpassQuery(category: NearbyCategory, lat: number, lon: number, radiusM: number): string {
  const around = `(around:${Math.round(radiusM)},${lat.toFixed(5)},${lon.toFixed(5)})`;
  const parts = FILTERS[category].map((f) => `nwr${around}${f};`).join('');
  return `[out:json][timeout:20];(${parts});out center tags 60;`;
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

function placeType(tags: Record<string, string>): PlaceType {
  const spec = tags['healthcare:speciality'] ?? '';
  if (/gynaecology|obstetrics|midwifery|family_planning|fertility/.test(spec)) return 'gynaecology';
  const a = tags.amenity;
  const h = tags.healthcare;
  if (a === 'hospital' || h === 'hospital') return 'hospital';
  if (a === 'pharmacy' || h === 'pharmacy') return 'pharmacy';
  if (h === 'midwife' || h === 'birthing_centre') return 'midwife';
  if (a === 'doctors' || h === 'doctor') return 'doctors';
  if (a === 'clinic' || h === 'clinic') return 'clinic';
  if (h === 'laboratory') return 'laboratory';
  if (h === 'centre' || a === 'health_post') return 'centre';
  return 'other';
}

function address(tags: Record<string, string>): string | null {
  if (tags['addr:full']) return tags['addr:full'];
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  const parts = [street, tags['addr:suburb'], tags['addr:city'] ?? tags['addr:town'] ?? tags['addr:village'], tags['addr:postcode']].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

export function parseOverpass(json: { elements?: OverpassElement[] }, lat: number, lon: number): Place[] {
  const seen = new Set<string>();
  const out: Place[] = [];
  for (const el of json.elements ?? []) {
    const plat = el.lat ?? el.center?.lat;
    const plon = el.lon ?? el.center?.lon;
    if (plat === undefined || plon === undefined) continue;
    const tags = el.tags ?? {};
    const name = tags.name ?? tags['name:en'] ?? tags.operator ?? null;
    // The same facility is often mapped as both a node and a building outline.
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
  // Named places first, then by distance.
  return out.sort((a, b) => (a.name ? 0 : 1) - (b.name ? 0 : 1) || a.distanceM - b.distanceM);
}

async function fetchJson(url: string, init: RequestInit, signal?: AbortSignal): Promise<unknown> {
  const res = await fetch(url, { ...init, signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function findNearby(
  category: NearbyCategory,
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<{ places: Place[]; radiusM: number }> {
  let lastError: unknown = null;
  for (const radiusM of [3000, 10000, 25000]) {
    const body = `data=${encodeURIComponent(buildOverpassQuery(category, lat, lon, radiusM))}`;
    let json: { elements?: OverpassElement[] } | null = null;
    for (const endpoint of OVERPASS) {
      try {
        json = (await fetchJson(endpoint, { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, signal)) as {
          elements?: OverpassElement[];
        };
        break;
      } catch (e) {
        if (signal?.aborted) throw e;
        lastError = e;
      }
    }
    if (!json) throw lastError ?? new Error('overpass');
    const places = parseOverpass(json, lat, lon);
    if (places.length >= 3 || radiusM === 25000) return { places: places.slice(0, 15), radiusM };
  }
  return { places: [], radiusM: 25000 };
}

export async function geocode(query: string, signal?: AbortSignal): Promise<{ lat: number; lon: number; label: string } | null> {
  const url = `${NOMINATIM}?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
  const json = (await fetchJson(url, { headers: { Accept: 'application/json' } }, signal)) as { lat: string; lon: string; display_name: string }[];
  if (!json.length) return null;
  return { lat: Number(json[0].lat), lon: Number(json[0].lon), label: json[0].display_name };
}

export function directionsUrl(p: Place): string {
  return `https://www.openstreetmap.org/directions?to=${p.lat.toFixed(5)}%2C${p.lon.toFixed(5)}`;
}

export function googleDirectionsUrl(p: Place): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${p.lat.toFixed(5)},${p.lon.toFixed(5)}`;
}
