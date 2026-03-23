let db = null;

export async function openDB() {
  if (db) return db;
  return new Promise((res, rej) => {
    const req = indexedDB.open('fotorail', 3);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('blobs')) d.createObjectStore('blobs', { keyPath: 'id' });
    };
    req.onsuccess = e => { db = e.target.result; res(db); };
    req.onerror = () => rej(req.error);
  });
}

export async function savePhotosDB(pid, photos) {
  const meta = photos.map(p => ({ ...p, url: null }));
  localStorage.setItem('fr_photos_' + pid, JSON.stringify(meta));

  const toStore = [];
  for (const p of photos) {
    if (p.url && p.url.startsWith('blob:')) {
      try {
        const resp = await fetch(p.url);
        const blob = await resp.blob();
        toStore.push({ id: String(p.id), blob, pid });
      } catch {}
    }
  }
  const d = await openDB();
  const tx = d.transaction('blobs', 'readwrite');
  const store = tx.objectStore('blobs');
  for (const b of toStore) store.put(b);
}

export async function loadPhotosDB(pid) {
  const meta = [];
  try {
    const saved = JSON.parse(localStorage.getItem('fr_photos_' + pid) || '[]');
    meta.push(...saved);
  } catch {}
  if (!meta.length) return [];

  try {
    const d = await openDB();
    const tx = d.transaction('blobs', 'readonly');
    const store = tx.objectStore('blobs');
    for (const p of meta) {
      const req = store.get(String(p.id));
      await new Promise(res => {
        req.onsuccess = () => {
          if (req.result?.blob) p.url = URL.createObjectURL(req.result.blob);
          res();
        };
        req.onerror = () => res();
      });
    }
  } catch (e) { console.warn('IndexedDB load error:', e); }
  return meta;
}

export async function deleteProjectBlobsDB(pid) {
  try {
    const d = await openDB();
    const tx = d.transaction('blobs', 'readwrite');
    const store = tx.objectStore('blobs');
    const all = await new Promise(res => {
      const r = store.getAll();
      r.onsuccess = () => res(r.result);
      r.onerror = () => res([]);
    });
    for (const b of all) if (b.pid === pid) store.delete(b.id);
  } catch {}
}
