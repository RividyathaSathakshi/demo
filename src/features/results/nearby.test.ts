import { describe, expect, it } from 'vitest';
import { buildOverpassQuery, haversineM, parseOverpass } from './nearby';

describe('nearby search helpers', () => {
  it('builds an Overpass query for the category and radius', () => {
    const q = buildOverpassQuery('pharmacy', 12.97, 77.59, 3000);
    expect(q).toContain('nwr(around:3000,12.97000,77.59000)[amenity=pharmacy];');
    expect(q).toContain('out center tags');
  });

  it('parses, de-duplicates and sorts places by distance', () => {
    const places = parseOverpass(
      {
        elements: [
          { type: 'way', id: 2, center: { lat: 12.98, lon: 77.59 }, tags: { amenity: 'hospital', name: 'City Hospital', 'addr:street': 'MG Road', 'addr:city': 'Bengaluru' } },
          { type: 'node', id: 1, lat: 12.971, lon: 77.59, tags: { amenity: 'pharmacy', name: 'Apollo Pharmacy', phone: '+91 80 1234' } },
          { type: 'node', id: 3, lat: 12.98, lon: 77.59, tags: { amenity: 'hospital', name: 'City Hospital' } },
          { type: 'node', id: 4, lat: 12.975, lon: 77.59, tags: { healthcare: 'clinic', 'healthcare:speciality': 'gynaecology' } },
        ],
      },
      12.97,
      77.59,
    );
    expect(places.map((p) => p.name)).toEqual(['Apollo Pharmacy', 'City Hospital', null]);
    expect(places[0].phone).toBe('+91 80 1234');
    expect(places[1].address).toBe('MG Road, Bengaluru');
    expect(places[2].type).toBe('gynaecology');
  });

  it('computes great-circle distance', () => {
    expect(Math.round(haversineM(0, 0, 0, 1) / 1000)).toBe(111);
  });
});
