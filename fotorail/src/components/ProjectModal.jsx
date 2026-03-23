import { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function ProjectModal({ project, onClose }) {
  const { projects, setProjects, currentProject, setCurrentProject, showToast } = useApp();
  const [form, setForm] = useState({
    code: project?.code || '',
    name: project?.name || '',
    color: project?.color || '#f59e0b',
    start: project?.start || '',
    end: project?.end || '',
    kmFrom: project?.kmFrom || '',
    kmTo: project?.kmTo || '',
    desc: project?.desc || '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.code.trim() || !form.name.trim()) {
      showToast('Vyplň číslo projektu a název', 'warn'); return;
    }
    if (project) {
      const next = projects.map(p => p.id === project.id ? { ...p, ...form } : p);
      setProjects(next);
      if (currentProject?.id === project.id) setCurrentProject({ ...currentProject, ...form });
    } else {
      const newP = { ...form, id: 'p_' + Date.now() };
      setProjects([...projects, newP]);
    }
    showToast('✓ Projekt uložen', 'ok');
    onClose();
  };

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <div className="modal-title">{project ? 'Upravit projekt' : 'Nový projekt'}</div>
            <div className="modal-sub">Základní informace o stavbě</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label>Číslo projektu *</label>
              <input className="inp" value={form.code} onChange={e => set('code', e.target.value)} placeholder="CWC1H" maxLength={20} />
            </div>
            <div className="form-group">
              <label>Barva</label>
              <input className="inp" type="color" value={form.color} onChange={e => set('color', e.target.value)} style={{ height: 40, padding: '4px 8px', cursor: 'pointer' }} />
            </div>
          </div>
          <div className="form-group full">
            <label>Název stavby *</label>
            <input className="inp" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Horní Lideč – státní hranice" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Datum zahájení</label>
              <input className="inp" type="date" value={form.start} onChange={e => set('start', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Datum ukončení</label>
              <input className="inp" type="date" value={form.end} onChange={e => set('end', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Km od</label>
              <input className="inp" value={form.kmFrom} onChange={e => set('kmFrom', e.target.value)} placeholder="km 0.000" />
            </div>
            <div className="form-group">
              <label>Km do</label>
              <input className="inp" value={form.kmTo} onChange={e => set('kmTo', e.target.value)} placeholder="km 5.500" />
            </div>
          </div>
          <div className="form-group">
            <label>Popis / poznámky</label>
            <textarea className="inp" value={form.desc} onChange={e => set('desc', e.target.value)} placeholder="Rekonstrukce traťového svršku..." />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Zrušit</button>
          <button className="btn btn-primary" onClick={save}>Uložit projekt</button>
        </div>
      </div>
    </div>
  );
}
