import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildOverpassQuery,
  findNearby,
  geocode,
  googleDirectionsUrl,
  haversineM,
  NearbyError,
  parseOverpass,
  resetNominatimState,
  SEARCH_RADIUS_M,
} from './nearby';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('Overpass query', () => {
  it('searches about 5 km with real OSM tags for each category', () => {
    expect(SEARCH_RADIUS_M).toBe(5000);
    const q = buildOverpassQuery('pharmacy', 51.5, -0.12, SEARCH_RADIUS_M);
    expect(q).toContain('nwr(around:5000,51.50000,-0.12000)[amenity=pharmacy];');
    expect(q).toContain('[healthcare=pharmacy]');
    expect(buildOverpassQuery('clinic', 0, 0, 5000)).toContain('[amenity~"^(clinic|doctors)$"]');
    expect(buildOverpassQuery('hospital', 0, 0, 5000)).toContain('[amenity=hospital]');
    expect(buildOverpassQuery('womens', 0, 0, 5000)).toContain('["healthcare:speciality"~"gynaecology');
    expect(buildOverpassQuery('other', 0, 0, 5000)).toContain('[healthcare~"^(centre|laboratory');
  });
});

describe('parsing', () => {
  it('de-duplicates, keeps unnamed places, and sorts by distance', () => {
    const places = parseOverpass(
      {
        elements: [
          { type: 'way', id: 2, center: { lat: 51.51, lon: -0.12 }, tags: { amenity: 'hospital', name: 'St Example Hospital', 'addr:street': 'High Street', 'addr:city': 'Town' } },
          { type: 'node', id: 1, lat: 51.501, lon: -0.12, tags: { amenity: 'pharmacy', name: 'Corner Pharmacy', phone: '+44 20 1234' } },
          { type: 'node', id: 3, lat: 51.51, lon: -0.12, tags: { amenity: 'hospital', name: 'St Example Hospital' } },
          { type: 'node', id: 4, lat: 51.505, lon: -0.12, tags: { healthcare: 'clinic', 'healthcare:speciality': 'gynaecology' } },
        ],
      },
      51.5,
      -0.12,
    );
    expect(places.map((p) => p.name)).toEqual(['Corner Pharmacy', null, 'St Example Hospital']);
    expect(places[1].type).toBe('gynaecology');
    expect(places[2].address).toBe('High Street, Town');
  });

  it('computes great-circle distance', () => {
    expect(Math.round(haversineM(0, 0, 0, 1) / 1000)).toBe(111);
  });

  it('builds a directions link from the facility only', () => {
    const url = googleDirectionsUrl({ id: 'node/1', name: 'x', type: 'clinic', lat: 1.5, lon: 2.5, distanceM: 0, address: null, phone: null, website: null, openingHours: null });
    expect(url).toBe('https://www.google.com/maps/dir/?api=1&destination=1.500000,2.500000');
  });
});

describe('findNearby', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns parsed places from Overpass', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ elements: [{ type: 'node', id: 1, lat: 10.001, lon: 20, tags: { amenity: 'clinic', name: 'A Clinic' } }] })));
    const places = await findNearby('clinic', 10, 20);
    expect(places).toHaveLength(1);
    expect(places[0].name).toBe('A Clinic');
  });

  it('tries the next mirror when one is busy', async () => {
    const f = vi.fn().mockResolvedValueOnce(new Response('', { status: 429 })).mockResolvedValueOnce(json({ elements: [] }));
    vi.stubGlobal('fetch', f);
    expect(await findNearby('hospital', 10, 20)).toEqual([]);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('treats an Overpass runtime-error remark as a failure, not as "no results"', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ elements: [], remark: 'runtime error: Query timed out in "query" at line 1' })));
    await expect(findNearby('pharmacy', 10, 20)).rejects.toMatchObject({ kind: 'busy' });
  });

  it('throws a network error when every mirror is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await expect(findNearby('clinic', 10, 20)).rejects.toBeInstanceOf(NearbyError);
  });
});

describe('geocode (Nominatim)', () => {
  beforeEach(() => resetNominatimState());
  afterEach(() => vi.unstubAllGlobals());

  it('returns coordinates and caches repeat searches', async () => {
    const f = vi.fn(async () => json([{ lat: '48.85', lon: '2.35', display_name: 'Paris, France' }]));
    vi.stubGlobal('fetch', f);
    expect(await geocode('Paris')).toEqual({ lat: 48.85, lon: 2.35, label: 'Paris, France' });
    expect(await geocode('  paris ')).toEqual({ lat: 48.85, lon: 2.35, label: 'Paris, France' });
    expect(f).toHaveBeenCalledTimes(1);
    const url = String((f.mock.calls[0] as unknown as [string])[0]);
    expect(url).toContain('nominatim.openstreetmap.org/search');
    expect(url).toContain('limit=1');
  });

  it('returns null when the place is not found', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json([])));
    expect(await geocode('zzzzqqq')).toBeNull();
  });

  it('spaces requests at least one second apart', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json([])));
    const t0 = Date.now();
    await geocode('first place');
    await geocode('second place');
    expect(Date.now() - t0).toBeGreaterThanOrEqual(1000);
  });
});
