/**
 * Interactive map of the search origin and nearby facilities.
 * Leaflet + OpenStreetMap tiles (no API key). Loaded lazily, only once there
 * are results to show. Popups are built with DOM text nodes, never innerHTML,
 * because OpenStreetMap names and addresses are user-contributed data.
 */
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Place } from './nearby';

export interface PlaceDescription {
  title: string;
  subtitle: string;
  address: string | null;
  directionsUrl: string;
  directionsLabel: string;
}

interface Props {
  origin: { lat: number; lon: number; label: string };
  places: Place[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  describe: (p: Place) => PlaceDescription;
  mapLabel: string;
}

const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

function popupNode(d: PlaceDescription): HTMLElement {
  const root = document.createElement('div');
  root.className = 'lmn-popup';
  const title = document.createElement('strong');
  title.textContent = d.title;
  const sub = document.createElement('div');
  sub.className = 'lmn-popup-sub';
  sub.textContent = d.subtitle;
  root.append(title, sub);
  if (d.address) {
    const addr = document.createElement('div');
    addr.textContent = d.address;
    root.append(addr);
  }
  const link = document.createElement('a');
  link.href = d.directionsUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.className = 'lmn-popup-link';
  link.textContent = d.directionsLabel;
  root.append(link);
  return root;
}

export default function NearbyMap({ origin, places, selectedId, onSelect, describe, mapLabel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef(new Map<string, L.Marker>());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true, scrollWheelZoom: false });
    L.tileLayer(OSM_TILES, { maxZoom: 19, attribution: OSM_ATTRIBUTION }).addTo(map);
    map.attributionControl.setPrefix(false);
    // Enable wheel zoom only after the user interacts, so page scrolling is not hijacked.
    map.once('focus click', () => map.scrollWheelZoom.enable());
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  // Draw markers whenever the results change, and fit the view to them.
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    markersRef.current.clear();

    const originMarker = L.marker([origin.lat, origin.lon], {
      icon: L.divIcon({ className: '', html: '<span class="lmn-origin" aria-hidden="true"></span>', iconSize: [22, 22], iconAnchor: [11, 11] }),
      keyboard: false,
      title: origin.label,
      zIndexOffset: 1000,
    });
    originMarker.bindTooltip(origin.label, { direction: 'top', offset: [0, -10] });
    layer.addLayer(originMarker);

    places.forEach((p, i) => {
      const m = L.marker([p.lat, p.lon], {
        icon: L.divIcon({ className: '', html: `<span class="lmn-pin"><span>${i + 1}</span></span>`, iconSize: [30, 30], iconAnchor: [15, 36], popupAnchor: [0, -34] }),
        title: describe(p).title,
        riseOnHover: true,
      });
      m.bindPopup(() => popupNode(describe(p)), { maxWidth: 260 });
      m.on('click', () => onSelectRef.current(p.id));
      layer.addLayer(m);
      markersRef.current.set(p.id, m);
    });

    const pts: L.LatLngExpression[] = [[origin.lat, origin.lon], ...places.map((p) => [p.lat, p.lon] as L.LatLngTuple)];
    // Extra top padding: pins point down, so their heads extend ~36 px above the location.
    if (pts.length > 1) map.fitBounds(L.latLngBounds(pts), { paddingTopLeft: [28, 48], paddingBottomRight: [28, 20], maxZoom: 16 });
    else map.setView([origin.lat, origin.lon], 14);
    // The container may have just become visible.
    setTimeout(() => map.invalidateSize(), 0);
  }, [origin.lat, origin.lon, origin.label, places, describe]);

  // Focus the selected facility.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const m = markersRef.current.get(selectedId);
    if (!m) return;
    map.setView(m.getLatLng(), Math.max(map.getZoom(), 16), { animate: true });
    m.openPopup();
    markersRef.current.forEach((mk, id) => mk.getElement()?.querySelector('.lmn-pin')?.classList.toggle('lmn-pin-active', id === selectedId));
  }, [selectedId]);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={mapLabel}
      className="h-[320px] w-full overflow-hidden rounded-xl border sm:h-[420px]"
      // isolate keeps Leaflet's internal z-indexes below the app's sticky header and tab bar.
      style={{ isolation: 'isolate' }}
    />
  );
}
