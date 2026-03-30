import { useApp } from '../context/AppContext';

export default function PDFPanel({ onPlace, onRemove, onAdjust }) {
  const { pdfState, setPdfState } = useApp();

  const toggleVisible = () => {
    setPdfState(s => ({ ...s, visible: !s.visible }));
  };

  const setMapOp = (v) => setPdfState(s => ({ ...s, mapOpacity: parseInt(v) }));
  const setPdfOp = (v) => setPdfState(s => ({ ...s, pdfOpacity: parseInt(v) }));
  const setPage = (v) => setPdfState(s => ({ ...s, currentPage: parseInt(v) }));

  if (!pdfState.doc) return null;

  return (
    <div className="pdf-panel">
      <div style={{
        fontSize: 11, color: 'var(--text2)', fontFamily: 'DM Mono,monospace',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160,
      }}>
        {pdfState.filename || 'výkres.pdf'}
      </div>

      <button
        className={`pdf-toggle-btn ${pdfState.visible ? 'on' : ''}`}
        onClick={toggleVisible}
      >
        {pdfState.visible ? '👁 Výkres zap' : '🙈 Výkres vyp'}
      </button>

      <div className="pdf-slider-wrap">
        <div className="pdf-slider-label">Mapa</div>
        <input
          type="range" className="pdf-slider"
          min="0" max="100" value={pdfState.mapOpacity}
          onChange={e => setMapOp(e.target.value)}
        />
      </div>

      <div className="pdf-slider-wrap">
        <div className="pdf-slider-label">Výkres</div>
        <input
          type="range" className="pdf-slider"
          min="0" max="100" value={pdfState.pdfOpacity}
          onChange={e => setPdfOp(e.target.value)}
        />
      </div>

      {pdfState.totalPages > 1 && (
        <div className="pdf-slider-wrap">
          <div className="pdf-slider-label">Stránka {pdfState.currentPage}/{pdfState.totalPages}</div>
          <input
            type="range" className="pdf-slider"
            min="1" max={pdfState.totalPages} value={pdfState.currentPage}
            onChange={e => setPage(e.target.value)}
          />
        </div>
      )}

      <button className="btn btn-ghost btn-sm" onClick={onPlace}>
        📍 {pdfState.placed ? 'Přemístit' : 'Umístit'}
      </button>

      {pdfState.placed && (
        <button
          className={`btn btn-sm ${pdfState.adjustMode ? 'btn-active' : 'btn-ghost'}`}
          onClick={onAdjust}
          title="Upravit natočení výkresu na mapě"
        >
          🔄 Upravit
        </button>
      )}

      <button className="btn btn-danger btn-sm" onClick={onRemove} title="Odebrat výkres">✕</button>
    </div>
  );
}
