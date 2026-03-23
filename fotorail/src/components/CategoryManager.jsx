import { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function CategoryManager({ onClose }) {
  const { categories, saveCategories, showToast } = useApp();
  const [list, setList] = useState(categories.map(c => ({ ...c })));

  const update = (id, key, val) => {
    setList(l => l.map(c => c.id === id ? { ...c, [key]: val } : c));
  };

  const remove = (id) => {
    setList(l => l.filter(c => c.id !== id));
  };

  const addNew = () => {
    const newCat = {
      id: 'cat_' + Date.now(),
      name: 'Nová kategorie',
      color: '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0'),
    };
    setList(l => [...l, newCat]);
  };

  const save = () => {
    const valid = list.filter(c => c.name.trim());
    if (!valid.length) { showToast('Aspoň jedna kategorie musí být', 'warn'); return; }
    saveCategories(valid);
    showToast('✓ Kategorie uloženy', 'ok');
    onClose();
  };

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <div className="modal-title">Správa kategorií</div>
            <div className="modal-sub">Přidej, uprav nebo smaž kategorie</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="cat-manager-list">
            {list.map(cat => (
              <div key={cat.id} className="cat-manager-item">
                <input
                  type="color"
                  className="cat-manager-color"
                  value={cat.color}
                  onChange={e => update(cat.id, 'color', e.target.value)}
                  title="Barva kategorie"
                  style={{ background: cat.color, width: 32, height: 32, borderRadius: 6, border: '2px solid rgba(255,255,255,.2)', cursor: 'pointer', padding: 2 }}
                />
                <input
                  className="cat-manager-name inp"
                  value={cat.name}
                  onChange={e => update(cat.id, 'name', e.target.value)}
                  placeholder="Název kategorie"
                />
                <div className="cat-manager-actions">
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => remove(cat.id)}
                    title="Smazat kategorii"
                  >✕</button>
                </div>
              </div>
            ))}
          </div>
          <button
            className="btn btn-ghost"
            onClick={addNew}
            style={{ width: '100%', justifyContent: 'center', borderStyle: 'dashed' }}
          >
            + Nová kategorie
          </button>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Zrušit</button>
          <button className="btn btn-primary" onClick={save}>Uložit kategorie</button>
        </div>
      </div>
    </div>
  );
}
