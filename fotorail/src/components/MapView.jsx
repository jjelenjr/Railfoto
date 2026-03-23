import { useEffect, useRef, useCallback, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useApp } from '../context/AppContext';
import { setMapInstance } from '../hooks/useMapInstance';

const MAPYCZ_API_KEY = '35EKo7UffSWvfZNmflSF28IUk0ulQvxfwNiinl81seA';

function dotSize(z) { return Math.round(8 + (z - 8) * 1.6); }

function getMapPixelsPerMeter(map) {
  const center = map.getCenter();
  const zoom = map.getZoom();
  const mpp = 156543.03392 * Math.cos(center.lat * Math.PI / 180) / Math.pow(2, zoom);
  return 1 / mpp;
}

export default function MapView({ onPhotoClick, activePhotoId }) {
  const { photos, isPhotoVisible, getCatById, pdfState, setPdfState } = useApp();
  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const markerLayerRef = useRef(null);
  const tileBaseRef = useRef(null);
  const tileAerialRef = useRef(null);
  const [isAerial, setIsAerial] = useState(false);
  const pdfCanvasRef = useRef(null);
  const tooltipRef = useRef(null);
  const adjustStartedRef = useRef(false);
  const zoomTimerRef = useRef(null);
  const currentZoomRef = useRef(12);
  const pdfStateRef = useRef(pdfState);

  // Keep pdfStateRef in sync
  useEffect(() => { pdfStateRef.current = pdfState; }, [pdfState]);

  // Init map once
  useEffect(() => {
    if (mapRef.current) return;
    const map = L.map(mapDivRef.current, { zoomControl: true }).setView([49.3, 18.0], 12);
    tileBaseRef.current = L.tileLayer(
      `https://api.mapy.com/v1/maptiles/basic/256/{z}/{x}/{y}.png?apikey=${MAPYCZ_API_KEY}`,
      { maxZoom: 20, attribution: '© <a href="https://mapy.com">Mapy.com</a>' }
    ).addTo(map);
    tileAerialRef.current = L.tileLayer(
      `https://api.mapy.com/v1/maptiles/aerial/256/{z}/{x}/{y}.png?apikey=${MAPYCZ_API_KEY}`,
      { maxZoom: 20 }
    );
    markerLayerRef.current = L.layerGroup().addTo(map);

    map.on('zoomend', () => {
      clearTimeout(zoomTimerRef.current);
      zoomTimerRef.current = setTimeout(() => {
        currentZoomRef.current = map.getZoom();
        rebuildMarkers(map);
      }, 150);
    });
    map.on('moveend', () => { if (pdfStateRef.current.placed) renderPDF(map); });
    map.on('zoomend', () => { if (pdfStateRef.current.placed) renderPDF(map); });

    mapRef.current = map;
    setMapInstance(map);
  }, []);

  // ── Markers ───────────────────────────────────────────────────────
  const buildMarker = useCallback((photo, map) => {
    if (!photo.lat) return;
    const cat = getCatById(photo.catId);
    const color = cat?.color || '#8b5cf6';
    const size = dotSize(currentZoomRef.current);
    const total = size + 12;
    const icon = L.divIcon({
      className: '',
      html: `<div style="width:${total}px;height:${total}px;display:flex;align-items:center;justify-content:center;">
               <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2.5px solid rgba(255,255,255,.85);box-shadow:0 2px 8px rgba(0,0,0,.5);cursor:pointer;"></div>
             </div>`,
      iconSize: [total, total], iconAnchor: [total / 2, total / 2],
    });
    const marker = L.marker([photo.lat, photo.lng], { icon });
    marker.on('mouseover', e => showTooltip(photo, e.originalEvent.clientX, e.originalEvent.clientY));
    marker.on('mousemove', e => moveTooltip(e.originalEvent.clientX, e.originalEvent.clientY));
    marker.on('mouseout', hideTooltip);
    marker.on('click', () => onPhotoClick(photo.id));
    markerLayerRef.current.addLayer(marker);
  }, [getCatById, onPhotoClick]);

  const rebuildMarkers = useCallback((map) => {
    if (!markerLayerRef.current) return;
    markerLayerRef.current.clearLayers();
    photos.filter(p => p.lat && isPhotoVisible(p)).forEach(p => buildMarker(p, map));
  }, [photos, isPhotoVisible, buildMarker]);

  useEffect(() => {
    if (mapRef.current) rebuildMarkers(mapRef.current);
  }, [rebuildMarkers]);

  // Fit map when photos loaded
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const pts = photos.filter(p => p.lat && isPhotoVisible(p));
    if (!pts.length) return;
    if (pts.length === 1) { map.setView([pts[0].lat, pts[0].lng], 16); return; }
    map.fitBounds(pts.map(p => [p.lat, p.lng]), { padding: [40, 40], maxZoom: 17 });
  }, [photos.length]);

  // Focus active photo on map
  useEffect(() => {
    if (!activePhotoId || !mapRef.current) return;
    const p = photos.find(x => String(x.id) === String(activePhotoId));
    if (p?.lat) mapRef.current.setView([p.lat, p.lng], 17);
  }, [activePhotoId]);

  // ── Aerial toggle ─────────────────────────────────────────────────
  const toggleAerial = () => {
    const map = mapRef.current;
    if (!map) return;
    if (!isAerial) {
      map.removeLayer(tileBaseRef.current);
      tileAerialRef.current.addTo(map);
      tileAerialRef.current.bringToBack();
    } else {
      map.removeLayer(tileAerialRef.current);
      tileBaseRef.current.addTo(map);
      tileBaseRef.current.bringToBack();
    }
    setIsAerial(v => !v);
  };

  // ── PDF rendering ─────────────────────────────────────────────────
  const renderPDF = useCallback(async (map) => {
    const canvas = pdfCanvasRef.current;
    const s = pdfStateRef.current;
    if (!s.placed || !s.mapRef || !map || !canvas) return;
    if (!s.visible) { canvas.style.display = 'none'; return; }

    if (s.doc) {
      const page = await s.doc.getPage(s.currentPage);
      const vp = page.getViewport({ scale: 2 });
      canvas.width = vp.width;
      canvas.height = vp.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    }

    const { refPt, mapRef: mapLatLng, metersPerPx, canvasW, canvasH, rotation, pdfOpacity, mapOpacity } = s;
    if (!refPt || !mapLatLng) return;

    const refFromLeftM = refPt.x * canvasW * metersPerPx;
    const refFromTopM = refPt.y * canvasH * metersPerPx;
    const totalWidthM = canvasW * metersPerPx;
    const totalHeightM = canvasH * metersPerPx;
    const refMapPt = map.latLngToContainerPoint(mapLatLng);
    const mpp = getMapPixelsPerMeter(map);

    canvas.style.position = 'absolute';
    canvas.style.left = (refMapPt.x - refFromLeftM * mpp) + 'px';
    canvas.style.top = (refMapPt.y - refFromTopM * mpp) + 'px';
    canvas.style.width = (totalWidthM * mpp) + 'px';
    canvas.style.height = (totalHeightM * mpp) + 'px';
    canvas.style.display = 'block';
    canvas.style.transformOrigin = `${refFromLeftM * mpp}px ${refFromTopM * mpp}px`;
    canvas.style.transform = `rotate(${rotation}deg)`;
    canvas.style.opacity = pdfOpacity / 100;
    document.querySelectorAll('.leaflet-tile-pane').forEach(el => { el.style.opacity = mapOpacity / 100; });
  }, []);

  // Re-render PDF when state changes
  useEffect(() => {
    if (mapRef.current) renderPDF(mapRef.current);
  }, [pdfState.placed, pdfState.visible, pdfState.rotation, pdfState.currentPage, pdfState.pdfOpacity, pdfState.mapOpacity]);

  // Restore map opacity when PDF removed
  useEffect(() => {
    if (!pdfState.doc) {
      const canvas = pdfCanvasRef.current;
      if (canvas) canvas.style.display = 'none';
      document.querySelectorAll('.leaflet-tile-pane').forEach(el => { el.style.opacity = 1; });
    }
  }, [pdfState.doc]);

  // ── PDF Adjust mode — interactive rotation ────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !pdfState.adjustMode || !pdfState.placed) return;
    adjustStartedRef.current = false;
    map.getContainer().style.cursor = 'crosshair';

    const refMapPt = () => map.latLngToContainerPoint(pdfStateRef.current.mapRef);

    const onMouseMove = (e) => {
      if (!adjustStartedRef.current) return;
      const containerPt = map.mouseEventToContainerPoint(e.originalEvent);
      const rp = refMapPt();
      const dx = containerPt.x - rp.x;
      const dy = containerPt.y - rp.y;
      const angle = Math.atan2(dx, -dy) * (180 / Math.PI);
      setPdfState(s => ({ ...s, rotation: angle }));
    };

    const onClick = () => {
      if (!adjustStartedRef.current) {
        adjustStartedRef.current = true;
        return; // first click — start tracking
      }
      // second click — confirm
      map.off('mousemove', onMouseMove);
      map.off('click', onClick);
      map.getContainer().style.cursor = '';
      adjustStartedRef.current = false;
      setPdfState(s => ({ ...s, adjustMode: false }));
    };

    map.on('mousemove', onMouseMove);
    map.on('click', onClick);

    return () => {
      map.off('mousemove', onMouseMove);
      map.off('click', onClick);
      map.getContainer().style.cursor = '';
    };
  }, [pdfState.adjustMode]);

  // ── Tooltip ───────────────────────────────────────────────────────
  const showTooltip = (photo, x, y) => {
    const tt = tooltipRef.current;
    if (!tt) return;
    const cat = getCatById(photo.catId);
    tt.querySelector('.tt-cat').style.color = cat?.color || '#8b5cf6';
    tt.querySelector('.tt-cat').textContent = (cat?.name || '—') + (photo.sub ? ' — ' + photo.sub : '');
    tt.querySelector('.tt-name').textContent = photo.name;
    tt.querySelector('.tt-date').textContent = (photo.date || '—') + (photo.timeStr ? ' ' + photo.timeStr : '');
    const img = tt.querySelector('.tt-img');
    if (photo.url) { img.src = photo.url; img.style.display = 'block'; }
    else img.style.display = 'none';
    tt.style.display = 'block';
    tt.style.left = x + 'px';
    tt.style.top = y + 'px';
  };
  const moveTooltip = (x, y) => {
    const tt = tooltipRef.current;
    if (tt) { tt.style.left = x + 'px'; tt.style.top = y + 'px'; }
  };
  const hideTooltip = () => { if (tooltipRef.current) tooltipRef.current.style.display = 'none'; };

  return (
    <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
      <div ref={mapDivRef} style={{ width: '100%', height: '100%' }} />

      {/* PDF overlay */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50 }}>
        <canvas ref={pdfCanvasRef} style={{ position: 'absolute', display: 'none', transformOrigin: 'top left' }} />
      </div>

      {/* Map controls */}
      <div style={{
        position: 'absolute', bottom: 24, right: 10,
        display: 'flex', flexDirection: 'column', gap: 6, zIndex: 1000,
      }}>
        <button
          className={`btn btn-sm ${isAerial ? 'btn-active' : 'btn-ghost'}`}
          onClick={toggleAerial}
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,.4)' }}
        >
          🛰 Letecká
        </button>
      </div>

      {/* Hover tooltip */}
      <div ref={tooltipRef} className="map-tooltip">
        <div className="tt-wrap">
          <img className="tt-img" src="" alt="" style={{ display: 'none' }} />
          <div className="tt-body">
            <div className="tt-cat"></div>
            <div className="tt-name"></div>
            <div className="tt-date"></div>
          </div>
        </div>
        <div className="tt-arr"></div>
      </div>
    </div>
  );
}
