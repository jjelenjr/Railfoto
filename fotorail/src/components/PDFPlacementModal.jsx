import { useRef, useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { getMapInstance } from '../hooks/useMapInstance';

export default function PDFPlacementModal({ onClose }) {
  const { pdfState, setPdfState, showToast } = useApp();
  const [step, setStep] = useState(1);
  const [refPt, setRefPt] = useState(null);   // {x,y} fraction 0-1
  const [northPt, setNorthPt] = useState(null);
  const [scaleStr, setScaleStr] = useState('500');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const previewCanvasRef = useRef(null);
  const outerRef = useRef(null);

  const renderPage = useCallback(async () => {
    if (!pdfState.doc || !previewCanvasRef.current) return;
    const page = await pdfState.doc.getPage(pdfState.currentPage);
    const vp = page.getViewport({ scale: 2 });
    const canvas = previewCanvasRef.current;
    canvas.width = vp.width;
    canvas.height = vp.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
  }, [pdfState.doc, pdfState.currentPage]);

  useEffect(() => { renderPage(); }, [renderPage]);

  const getClickFraction = (e) => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  const handleCanvasClick = (e) => {
    if (step === 1) {
      const pt = getClickFraction(e);
      setRefPt(pt);
      setStep(2);
    } else if (step === 2) {
      const pt = getClickFraction(e);
      setNorthPt(pt);
      setStep(3);
    }
  };

  // Wheel zoom on outer container
  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;
    const handler = (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.2 : -0.2;
      setZoom(z => Math.min(8, Math.max(0.5, z + delta)));
    };
    outer.addEventListener('wheel', handler, { passive: false });
    return () => outer.removeEventListener('wheel', handler);
  }, []);

  const startPan = (e) => {
    if (e.button === 1 || e.altKey) {
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
      e.preventDefault();
    }
  };
  const doPan = (e) => {
    if (!isPanning.current) return;
    setPan({
      x: panStart.current.px + (e.clientX - panStart.current.x),
      y: panStart.current.py + (e.clientY - panStart.current.y),
    });
  };
  const stopPan = () => { isPanning.current = false; };

  const confirmAndGoToMap = () => {
    const scaleVal = parseInt(scaleStr);
    if (!scaleVal || scaleVal < 1) { showToast('Zadej platné měřítko', 'warn'); return; }
    if (!refPt) { showToast('Nejdřív klikni referenční bod na výkresu', 'warn'); return; }
    if (!northPt) { showToast('Nejdřív klikni šipku severu na výkresu', 'warn'); return; }

    const mmPerPx = 25.4 / 144;
    const metersPerPx = (mmPerPx / 1000) * scaleVal;
    const canvas = previewCanvasRef.current;

    setPdfState(s => ({
      ...s,
      refPt,
      northPt,
      scale: scaleVal,
      metersPerPx,
      canvasW: canvas?.width || s.canvasW,
      canvasH: canvas?.height || s.canvasH,
    }));

    onClose();
    showToast('Klikni na mapě — stejný referenční bod jako na výkresu', 'ok');

    const map = getMapInstance();
    if (map) {
      map.getContainer().style.cursor = 'crosshair';
      map.once('click', (e) => {
        map.getContainer().style.cursor = '';
        const dx = northPt.x - refPt.x;
        const dy = northPt.y - refPt.y;
        const rotation = Math.atan2(dx, -dy) * (180 / Math.PI);
        setPdfState(s => ({
          ...s,
          mapRef: e.latlng,
          rotation,
          placed: true,
        }));
        showToast(`✓ Výkres umístěn · natočení ${rotation.toFixed(1)}° · měřítko 1:${scaleVal}`, 'ok');
      });
    }
  };

  const canvas = previewCanvasRef.current;
  const cw = canvas?.width || 1;
  const ch = canvas?.height || 1;

  const steps = ['Referenční bod', 'Šipka severu', 'Měřítko', 'Bod na mapě'];
  const stepHints = [
    '🔴 Klikni na výkres — vyber referenční bod (křížení, roh budovy...)',
    '🔵 Klikni na šipku SEVERU na výkresu',
    'Zadej měřítko výkresu a klikni Dále',
    'Klikni na stejný referenční bod na mapě',
  ];

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal pdf-placement-modal">
        <div className="modal-header">
          <div>
            <div className="modal-title">Umístit výkres — krok {step} / 4</div>
            <div className="modal-sub">{stepHints[step - 1]}</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ gap: 10 }}>

          {/* Step indicator */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {steps.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div className={`pdf-step ${i + 1 < step ? 'done' : i + 1 === step ? 'active' : ''}`}>
                  {i + 1 < step ? '✓ ' : `${i + 1}. `}{s}
                </div>
                {i < 3 && <span style={{ color: 'var(--text3)', fontSize: 12 }}>→</span>}
              </div>
            ))}
          </div>

          {/* PDF preview */}
          <div
            ref={outerRef}
            className="pdf-preview-outer"
            onMouseDown={startPan}
            onMouseMove={doPan}
            onMouseUp={stopPan}
            onMouseLeave={stopPan}
          >
            <div
              style={{
                position: 'absolute', top: 0, left: 0,
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'top left',
                cursor: step <= 2 ? 'crosshair' : 'default',
              }}
              onClick={step <= 2 ? handleCanvasClick : undefined}
            >
              <canvas ref={previewCanvasRef} style={{ display: 'block' }} />

              {/* SVG overlays for points */}
              {(refPt || northPt) && (
                <svg
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                  viewBox={`0 0 ${cw} ${ch}`}
                  preserveAspectRatio="none"
                >
                  {refPt && northPt && (
                    <line
                      x1={refPt.x * cw} y1={refPt.y * ch}
                      x2={northPt.x * cw} y2={northPt.y * ch}
                      stroke="#3b82f6" strokeWidth="3" strokeDasharray="10 5" opacity="0.9"
                    />
                  )}
                  {refPt && (
                    <>
                      <circle cx={refPt.x * cw} cy={refPt.y * ch} r="10" fill="#ef4444" stroke="white" strokeWidth="2.5" />
                      <text x={refPt.x * cw + 14} y={refPt.y * ch + 5} fill="#ef4444" fontSize="20" fontFamily="DM Mono,monospace" fontWeight="bold">REF</text>
                    </>
                  )}
                  {northPt && (
                    <>
                      <circle cx={northPt.x * cw} cy={northPt.y * ch} r="10" fill="#3b82f6" stroke="white" strokeWidth="2.5" />
                      <text x={northPt.x * cw + 14} y={northPt.y * ch + 5} fill="#3b82f6" fontSize="20" fontFamily="DM Mono,monospace" fontWeight="bold">N</text>
                    </>
                  )}
                </svg>
              )}
            </div>

            {/* Zoom controls */}
            <div className="pdf-zoom-controls">
              <button onClick={() => setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)))}>−</button>
              <span className="pdf-zoom-val">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(8, +(z + 0.25).toFixed(2)))}>+</button>
              <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} title="Reset pohledu">⟳</button>
            </div>

            {/* Hint */}
            {step <= 2 && (
              <div style={{
                position: 'absolute', top: 8, left: 8,
                background: 'rgba(15,17,23,.85)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '5px 10px', fontSize: 11,
                color: 'var(--text2)', fontFamily: 'DM Mono, monospace',
                pointerEvents: 'none', lineHeight: 1.6,
              }}>
                {stepHints[step - 1]}<br />
                <span style={{ opacity: .6 }}>Scroll = zoom · Alt+táhni = posun</span>
              </div>
            )}
          </div>

          {/* Scale input — step 3 */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 13, color: 'var(--text)' }}>Zadej měřítko výkresu:</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 14, color: 'var(--text2)' }}>1 :</span>
                <input
                  className="inp"
                  type="number"
                  value={scaleStr}
                  onChange={e => setScaleStr(e.target.value)}
                  placeholder="1000"
                  min="1" max="100000"
                  style={{ width: 130 }}
                  autoFocus
                />
                {scaleStr && parseInt(scaleStr) > 0 && (
                  <span style={{ fontSize: 12, color: 'var(--teal)', fontFamily: 'DM Mono,monospace' }}>
                    1 cm výkresu = {(parseInt(scaleStr) / 100).toFixed(1)} m
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Zrušit</button>
          {step === 3 && (
            <button className="btn btn-primary" onClick={confirmAndGoToMap}>
              Dále — klikni na mapě →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
