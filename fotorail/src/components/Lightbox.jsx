import { useEffect, useRef, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { savePhotosDB } from '../hooks/useDB';

export default function Lightbox({ photoId, onClose, onPhotoUpdate }) {
  const { photos, setPhotos, categories, getCatById, currentProject, showToast, isPhotoVisible } = useApp();

  const visiblePhotos = photos.filter(p => p.url && isPhotoVisible(p));
  const initIndex = visiblePhotos.findIndex(p => String(p.id) === String(photoId));
  const [idx, setIdx] = useState(initIndex < 0 ? 0 : initIndex);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [note, setNote] = useState('');
  const [catPickerOpen, setCatPickerOpen] = useState(false);
  const [catPickerPos, setCatPickerPos] = useState({ x: 0, y: 0 });

  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const wrapRef = useRef(null);
  const imgRef = useRef(null);

  const photo = visiblePhotos[idx] || null;

  useEffect(() => {
    if (photo) setNote(photo.note || '');
  }, [photo?.id]);

  const resetZoom = useCallback(() => { setScale(1); setTx(0); setTy(0); }, []);

  const zoom = useCallback((delta) => {
    setScale(s => Math.min(5, Math.max(0.25, s + delta)));
  }, []);

  const navigate = useCallback((dir) => {
    const next = idx + dir;
    if (next < 0 || next >= visiblePhotos.length) return;
    resetZoom();
    setIdx(next);
  }, [idx, visiblePhotos.length, resetZoom]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowLeft') navigate(-1);
      if (e.key === 'ArrowRight') navigate(1);
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') zoom(0.25);
      if (e.key === '-') zoom(-0.25);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [navigate, zoom, onClose]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const onWheel = (e) => { e.preventDefault(); zoom(e.deltaY < 0 ? 0.15 : -0.15); };
    wrap.addEventListener('wheel', onWheel, { passive: false });
    return () => wrap.removeEventListener('wheel', onWheel);
  }, [zoom]);

  const onMouseDown = (e) => {
    if (scale <= 1) return;
    dragging.current = true;
    dragStart.current = { x: e.clientX - tx * scale, y: e.clientY - ty * scale };
    wrapRef.current?.classList.add('grabbing');
  };

  const onMouseMove = (e) => {
    if (!dragging.current) return;
    setTx((e.clientX - dragStart.current.x) / scale);
    setTy((e.clientY - dragStart.current.y) / scale);
  };

  const onMouseUp = () => {
    dragging.current = false;
    wrapRef.current?.classList.remove('grabbing');
  };

  useEffect(() => {
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const saveNote = async () => {
    if (!photo) return;
    const updated = photos.map(p =>
      String(p.id) === String(photo.id) ? { ...p, note } : p
    );
    setPhotos(updated);
    if (currentProject) await savePhotosDB(currentProject.id, updated);
    showToast('✓ Poznámka uložena', 'ok');
  };

  const openCatPicker = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCatPickerPos({ x: rect.left, y: rect.bottom + 6 });
    setCatPickerOpen(true);
  };

  const assignCat = async (catId) => {
    setCatPickerOpen(false);
    const updated = photos.map(p =>
      String(p.id) === String(photo.id) ? { ...p, catId } : p
    );
    setPhotos(updated);
    if (currentProject) await savePhotosDB(currentProject.id, updated);
    showToast('✓ Kategorie změněna', 'ok');
  };

  const removecat = async () => {
    setCatPickerOpen(false);
    const updated = photos.map(p =>
      String(p.id) === String(photo.id) ? { ...p, catId: null } : p
    );
    setPhotos(updated);
    if (currentProject) await savePhotosDB(currentProject.id, updated);
    showToast('Kategorie odebrána', 'warn');
  };

  if (!photo) return null;

  const cat = getCatById(photo.catId);

  return (
    <div className="lightbox open" onClick={e => { if (e.target === e.currentTarget) { onClose(); setCatPickerOpen(false); } }}>
      <button className="lb-btn lb-close" onClick={onClose}>✕</button>
      <button className="lb-btn lb-prev" style={{ opacity: idx > 0 ? 1 : .3 }} onClick={() => navigate(-1)}>‹</button>
      <button className="lb-btn lb-next" style={{ opacity: idx < visiblePhotos.length - 1 ? 1 : .3 }} onClick={() => navigate(1)}>›</button>

      <div
        ref={wrapRef}
        className="lb-img-wrap"
        onMouseDown={onMouseDown}
      >
        <img
          ref={imgRef}
          className="lb-img"
          src={photo.url}
          draggable={false}
          style={{ transform: `scale(${scale}) translate(${tx}px,${ty}px)` }}
        />
      </div>

      <div className="lb-zoom-bar">
        <button onClick={() => zoom(-0.25)}>−</button>
        <span className="lb-zoom-val">{Math.round(scale * 100)}%</span>
        <button onClick={() => zoom(0.25)}>+</button>
        <button onClick={resetZoom} title="Reset">⟳</button>
      </div>

      <div className="lb-info">
        <div className="lb-name">{photo.name}</div>
        <div className="lb-meta">
          📅 {photo.date || '—'}{photo.timeStr ? ' ' + photo.timeStr : ''}
          {photo.lat ? `   📍 ${photo.lat.toFixed(5)}, ${photo.lng.toFixed(5)}` : ''}
        </div>

        {/* Category display & edit */}
        <div className="lb-cat-row">
          {cat ? (
            <button
              className="lb-cat-badge"
              style={{ background: cat.color + '25', borderColor: cat.color, color: cat.color }}
              onClick={openCatPicker}
              title="Klikni pro změnu kategorie"
            >
              <span className="cat-dot" style={{ background: cat.color, width: 7, height: 7 }} />
              {cat.name}
              {photo.sub ? ' · ' + photo.sub : ''}
              <span style={{ opacity: .6, fontSize: 10, marginLeft: 2 }}>▾</span>
            </button>
          ) : (
            <button className="lb-cat-edit" onClick={openCatPicker}>
              + Přiřadit kategorii
            </button>
          )}
        </div>
      </div>

      <div className="lb-note-wrap">
        <textarea
          className="lb-note"
          rows={2}
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Přidat poznámku k fotce..."
        />
        <button className="lb-note-save" onClick={saveNote}>Uložit</button>
      </div>

      {/* Category picker popup */}
      {catPickerOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 99099 }}
            onClick={() => setCatPickerOpen(false)}
          />
          <div
            className="lb-cat-picker"
            style={{ left: catPickerPos.x, top: catPickerPos.y }}
          >
            {categories.map(c => (
              <div
                key={c.id}
                className="lb-cat-option"
                onClick={() => assignCat(c.id)}
              >
                <span className="cat-dot" style={{ background: c.color, width: 9, height: 9 }} />
                <span style={{ color: photo.catId === c.id ? c.color : 'var(--text)' }}>{c.name}</span>
                {photo.catId === c.id && <span style={{ marginLeft: 'auto', color: c.color, fontSize: 11 }}>✓</span>}
              </div>
            ))}
            {photo.catId && (
              <>
                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                <div className="lb-cat-option" onClick={removecat} style={{ color: 'var(--red)' }}>
                  ✕ Odebrat kategorii
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
