import { useApp } from '../context/AppContext';

export default function Header({
  onFilterToggle, filterActive,
  onEditProject, onPdfUpload,
  onClearAll, photoCount, gpsCount,
}) {
  const { currentProject, setScreen, setCurrentProject, setPhotos, pdfState, setPdfState } = useApp();

  const goHome = () => {
    setCurrentProject(null);
    setPhotos([]);
    setPdfState(s => ({ ...s, doc: null, placed: false }));
    document.querySelectorAll('.leaflet-tile-pane').forEach(el => el.style.opacity = 1);
    setScreen('projects');
  };

  return (
    <header>
      <div className="logo" onClick={goHome}>FOTO<span>·</span>RAIL</div>
      <div className="project-badge" onClick={goHome}>
        <span className="pb-code" style={{ color: currentProject?.color || 'var(--accent)' }}>
          {currentProject?.code || '—'}
        </span>
        <span className="pb-name">{currentProject?.name || '—'}</span>
        <span className="pb-arrow">▾</span>
      </div>
      <div className="header-right">
        <div className="stat-pill">Fotek: <strong>{photoCount}</strong></div>
        <div className="stat-pill">GPS: <strong>{gpsCount}</strong></div>
        <button className="btn btn-ghost btn-sm" onClick={onEditProject}>✏ Projekt</button>
        <button
          className={`btn btn-sm ${filterActive ? 'btn-active' : 'btn-ghost'}`}
          onClick={onFilterToggle}
        >
          🔍 Filtr
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onPdfUpload}>📄 PDF výkres</button>
        <button className="btn btn-ghost btn-sm" onClick={onClearAll}>Vymazat</button>
      </div>
    </header>
  );
}
