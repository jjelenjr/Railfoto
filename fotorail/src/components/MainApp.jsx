import { useState, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { savePhotosDB } from '../hooks/useDB';
import Header from './Header';
import Sidebar from './Sidebar';
import MapView from './MapView';
import FilterPanel from './FilterPanel';
import Lightbox from './Lightbox';
import PDFPanel from './PDFPanel';
import PDFPlacementModal from './PDFPlacementModal';
import ProjectModal from './ProjectModal';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export default function MainApp() {
  const {
    photos, setPhotos, currentProject,
    filterOpen, setFilterOpen,
    pdfState, setPdfState,
    showToast,
  } = useApp();

  const [activePhotoId, setActivePhotoId] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPhotoId, setLightboxPhotoId] = useState(null);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const pdfInputRef = useRef(null);

  const handlePhotoClick = useCallback((photoId) => {
    setActivePhotoId(photoId);
    const p = photos.find(x => String(x.id) === String(photoId));
    if (p?.url) {
      setLightboxPhotoId(photoId);
      setLightboxOpen(true);
    }
  }, [photos]);

  // PDF upload
  const handlePdfUpload = async (file) => {
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: buf }).promise;
      setPdfState(s => ({
        ...s,
        doc,
        placed: false,
        visible: true,
        currentPage: 1,
        totalPages: doc.numPages,
        filename: file.name,
        adjustMode: false,
        refPt: null, northPt: null, mapRef: null,
      }));
      showToast('✓ PDF načteno — klikni "Umístit" pro umístění na mapu', 'ok');
    } catch (e) {
      showToast('Chyba při načítání PDF', 'err');
    }
  };

  const removePDF = () => {
    setPdfState(s => ({
      ...s,
      doc: null, placed: false, visible: true,
      refPt: null, northPt: null, mapRef: null,
      adjustMode: false, filename: '',
    }));
  };

  const startAdjust = () => {
    if (!pdfState.placed) { showToast('Nejdřív umísti výkres na mapu', 'warn'); return; }
    if (pdfState.adjustMode) {
      setPdfState(s => ({ ...s, adjustMode: false }));
    } else {
      setPdfState(s => ({ ...s, adjustMode: true }));
      showToast('Klikni 1× pro start → pohybuj myší → klikni 2× pro potvrzení natočení', 'ok');
    }
  };

  const clearAll = () => {
    if (!photos.length) return;
    if (!confirm('Vymazat všechny fotky z tohoto projektu?')) return;
    photos.forEach(p => p.url && URL.revokeObjectURL(p.url));
    setPhotos([]);
    if (currentProject) savePhotosDB(currentProject.id, []);
  };

  const hasPdfPanel = !!pdfState.doc;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>
      <Header
        onFilterToggle={() => setFilterOpen(!filterOpen)}
        filterActive={filterOpen}
        onEditProject={() => setProjectModalOpen(true)}
        onPdfUpload={() => pdfInputRef.current?.click()}
        onClearAll={clearAll}
        photoCount={photos.length}
        gpsCount={photos.filter(p => p.lat).length}
      />

      {hasPdfPanel && (
        <PDFPanel
          onPlace={() => setPdfModalOpen(true)}
          onRemove={removePDF}
          onAdjust={startAdjust}
        />
      )}

      <div className="main" style={{ flex: 1, overflow: 'hidden', marginTop: hasPdfPanel ? 44 : 0 }}>
        <Sidebar
          onPhotoClick={handlePhotoClick}
          activePhotoId={activePhotoId}
          sidebarWidth={sidebarWidth}
          setSidebarWidth={setSidebarWidth}
        />
        <MapView
          onPhotoClick={handlePhotoClick}
          activePhotoId={activePhotoId}
        />
      </div>

      <FilterPanel onApply={() => {}} />

      {lightboxOpen && (
        <Lightbox
          photoId={lightboxPhotoId}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      {pdfModalOpen && (
        <PDFPlacementModal onClose={() => setPdfModalOpen(false)} />
      )}

      {projectModalOpen && (
        <ProjectModal
          project={currentProject}
          onClose={() => setProjectModalOpen(false)}
        />
      )}

      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf"
        style={{ display: 'none' }}
        onChange={e => { if (e.target.files[0]) handlePdfUpload(e.target.files[0]); e.target.value = ''; }}
      />
    </div>
  );
}
