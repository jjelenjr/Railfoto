import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { loadPhotosDB } from '../hooks/useDB';
import ProjectModal from './ProjectModal';

export default function ProjectScreen() {
  const { projects, setProjects, setCurrentProject, setPhotos, setScreen, showToast } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const photoCount = (pid) => {
    try { return JSON.parse(localStorage.getItem('fr_photos_' + pid) || '[]').length; } catch { return 0; }
  };

  const openProject = async (p) => {
    setCurrentProject(p);
    const loaded = await loadPhotosDB(p.id);
    setPhotos(loaded);
    setScreen('main');
  };

  const deleteProject = (e, id) => {
    e.stopPropagation();
    if (!confirm('Smazat projekt?')) return;
    const next = projects.filter(p => p.id !== id);
    setProjects(next);
    localStorage.removeItem('fr_photos_' + id);
    showToast('Projekt smazán', 'warn');
  };

  const openNew = () => { setEditingProject(null); setModalOpen(true); };
  const openEdit = (e, p) => { e.stopPropagation(); setEditingProject(p); setModalOpen(true); };

  return (
    <div className="project-screen">
      <div className="ps-logo">FOTO<span>·</span>RAIL</div>
      <div className="ps-title">Vyber projekt</div>
      <div className="ps-sub">Každý projekt má vlastní fotky, mapu a výkresy</div>

      <div className="project-grid">
        {projects.map(p => (
          <div key={p.id} className="project-card" onClick={() => openProject(p)}>
            <span className="pc-count">{photoCount(p.id)} fotek</span>
            <div className="pc-code">
              <span className="pc-dot" style={{ background: p.color || '#f59e0b' }}></span>
              {p.code}
            </div>
            <div className="pc-name">{p.name}</div>
            <div className="pc-meta">
              {p.start ? '▶ ' + p.start : ''}{p.end ? ' ■ ' + p.end : ''}<br />
              {(p.kmFrom || p.kmTo) ? '⊷ ' + (p.kmFrom || '?') + ' → ' + (p.kmTo || '?') : ''}
            </div>
            <div className="pc-actions">
              <button className="btn btn-ghost btn-sm" onClick={e => openEdit(e, p)}>✏</button>
              <button className="btn btn-danger btn-sm" onClick={e => deleteProject(e, p.id)}>✕</button>
            </div>
          </div>
        ))}
        <div className="new-project-card" onClick={openNew}>
          <span style={{ fontSize: 20 }}>+</span> Nový projekt
        </div>
      </div>

      {modalOpen && (
        <ProjectModal
          project={editingProject}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
