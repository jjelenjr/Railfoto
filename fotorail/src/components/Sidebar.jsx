import { useRef, useState, useCallback } from 'react';
import ExifReader from 'exifreader';
import { useApp } from '../context/AppContext';
import { savePhotosDB } from '../hooks/useDB';
import CategoryManager from './CategoryManager';

function readExif(file) {
  return new Promise(async (resolve) => {
    try {
      const tags = ExifReader.load(await file.arrayBuffer(), { expanded: true });
      let lat = null, lng = null, datetime = null;
      if (tags.gps?.Latitude !== undefined && tags.gps?.Longitude !== undefined) {
        lat = tags.gps.Latitude; lng = tags.gps.Longitude;
        if (tags.gps.LongitudeRef?.description === 'West') lng = -lng;
        if (tags.gps.LatitudeRef?.description === 'South') lat = -lat;
      }
      const dt = tags.exif?.DateTimeOriginal?.description || tags.exif?.DateTime?.description;
      if (dt) {
        const [dp, tp] = dt.split(' ');
        datetime = dp.replace(/:/g, '-') + (tp ? 'T' + tp : '');
      }
      resolve({ gps: (lat && lng) ? { lat, lng } : null, datetime });
    } catch { resolve({ gps: null, datetime: null }); }
  });
}

function formatDate(s) { try { const d = new Date(s); return isNaN(d) ? null : d.toISOString().slice(0, 10); } catch { return null; } }
function formatTime(s) { try { const d = new Date(s); return isNaN(d) ? null : d.toTimeString().slice(0, 5); } catch { return null; } }
function guessDateFromName(n) { const m = n.match(/(\d{4})[_\-]?(\d{2})[_\-]?(\d{2})/); return m ? `${m[1]}-${m[2]}-${m[3]}` : null; }

export default function Sidebar({ onPhotoClick, activePhotoId, sidebarWidth, setSidebarWidth }) {
  const {
    photos, setPhotos, categories,
    currentProject, selectedCatId, setSelectedCatId,
    isPhotoVisible, getCatById, showToast,
  } = useApp();

  const [subLabel, setSubLabel] = useState('');
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(null); // 0-100 or null
  const [catManagerOpen, setCatManagerOpen] = useState(false);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const sidebarRef = useRef(null);
  const resizeRef = useRef(null);

  const handleFiles = useCallback(async (files) => {
    if (!currentProject) return;
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!arr.length) { showToast('Žádné obrázky nenalezeny', 'warn'); return; }
    setProgress(0);
    let added = 0, noGps = 0, skipped = 0;
    const newPhotos = [...photos];
    for (let i = 0; i < arr.length; i++) {
      const file = arr[i];
      setProgress(Math.round((i / arr.length) * 100));
      const existing = newPhotos.find(p => p.name === file.name && p.size === file.size);
      if (existing) {
        if (existing.url) { skipped++; continue; }
        existing.url = URL.createObjectURL(file);
        added++; continue;
      }
      const url = URL.createObjectURL(file);
      const exif = await readExif(file);
      const gps = exif.gps;
      newPhotos.push({
        id: Date.now() + Math.random(),
        name: file.name,
        size: file.size,
        url,
        catId: selectedCatId,
        sub: subLabel,
        projectId: currentProject.id,
        lat: gps ? gps.lat : null,
        lng: gps ? gps.lng : null,
        date: exif.datetime ? formatDate(exif.datetime) : guessDateFromName(file.name),
        timeStr: exif.datetime ? formatTime(exif.datetime) : null,
        note: '',
      });
      added++;
      if (!gps) noGps++;
    }
    setProgress(100);
    setTimeout(() => setProgress(null), 400);
    setPhotos(newPhotos);
    await savePhotosDB(currentProject.id, newPhotos);
    if (!added) showToast('Všechny fotky již jsou nahrané', 'warn');
    else if (noGps === added) showToast('⚠ Žádná fotka neobsahuje GPS', 'warn');
    else if (noGps > 0) showToast(`✓ Přidáno ${added} fotek — ${added - noGps} na mapě, ${noGps} bez GPS`, 'ok');
    else showToast(`✓ Přidáno ${added} fotek na mapu`, 'ok');
  }, [photos, setPhotos, currentProject, selectedCatId, subLabel, showToast]);

  // Drag & drop
  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); };

  // Resize sidebar
  const onResizeStart = (e) => {
    const startX = e.clientX;
    const startW = sidebarRef.current?.offsetWidth || 300;
    const onMove = (e) => {
      const w = Math.min(600, Math.max(180, startW + (e.clientX - startX)));
      setSidebarWidth(w);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const visiblePhotos = photos.filter(isPhotoVisible);

  return (
    <>
      {progress !== null && (
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: progress + '%' }} />
        </div>
      )}

      <div ref={sidebarRef} className="sidebar" style={{ width: sidebarWidth }}>
        <div className="resize-handle" onMouseDown={onResizeStart} />

        {/* Upload */}
        <div className="sidebar-section">
          <div className="section-label">Přidat fotky</div>
          <div className="upload-row">
            <div
              className={`upload-zone ${dragging ? 'drag' : ''}`}
              onClick={() => folderInputRef.current?.click()}
              onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
            >
              <div className="icon">📁</div>
              <p><strong>Složka</strong></p><p>nebo přetáhni</p>
            </div>
            <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
              <div className="icon">🖼️</div><p><strong>Fotky</strong></p><p>jednotlivě</p>
            </div>
            <div className="cam-zone" onClick={() => cameraInputRef.current?.click()}>
              <div className="icon">📷</div><p>Fotit<br />teď</p>
            </div>
          </div>
          <input ref={fileInputRef} type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
          <input ref={folderInputRef} type="file" multiple accept="image/*" webkitdirectory="" style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
        </div>

        {/* Kategorie */}
        <div className="sidebar-section">
          <div className="section-label">Kategorie</div>
          <div className="cat-grid">
            {categories.map(cat => (
              <button
                key={cat.id}
                className={`cat-btn ${selectedCatId === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCatId(cat.id)}
              >
                <span className="cat-dot" style={{ background: cat.color }} />
                {cat.name}
              </button>
            ))}
          </div>
          <input
            className="sub-input"
            type="text"
            value={subLabel}
            onChange={e => setSubLabel(e.target.value)}
            placeholder="Upřesnění (Kolej č. 1, km 12.4...)"
          />
          <button className="cat-manage-btn" onClick={() => setCatManagerOpen(true)}>
            ⚙ Správa kategorií
          </button>
        </div>

        {/* Photo list */}
        <div className="photo-list">
          {!visiblePhotos.length ? (
            <div className="empty-list">
              {photos.length ? 'Žádné fotky pro tento filtr' : 'Zatím žádné fotky.\nNahraj složku nebo vyfoť přímo.'}
            </div>
          ) : (
            visiblePhotos.map(p => {
              const cat = getCatById(p.catId);
              return (
                <div
                  key={p.id}
                  className={`photo-item ${p.lat ? '' : 'no-gps'} ${String(activePhotoId) === String(p.id) ? 'active' : ''}`}
                  onClick={() => onPhotoClick(p.id)}
                >
                  {p.url
                    ? <img className="photo-thumb" src={p.url} loading="lazy" alt="" />
                    : <div className="photo-thumb-placeholder">🖼️</div>
                  }
                  <div className="photo-info">
                    <div className="photo-name">{p.name}</div>
                    <div className="photo-meta" style={{ color: cat?.color || 'var(--text2)' }}>
                      {cat ? (
                        <><span className="cat-dot" style={{ background: cat.color }} />{' '}{cat.name}{p.sub ? ' · ' + p.sub : ''}</>
                      ) : (
                        <span style={{ color: 'var(--text3)' }}>—</span>
                      )}
                    </div>
                    <div className="photo-meta">{p.date || '—'}{p.timeStr ? ' ' + p.timeStr : ''}{p.note ? ' · 💬' : ''}</div>
                  </div>
                  <span className={`gps-badge ${p.lat ? 'gps-ok' : 'gps-no'}`}>{p.lat ? 'GPS' : 'bez GPS'}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {catManagerOpen && <CategoryManager onClose={() => setCatManagerOpen(false)} />}
    </>
  );
}
