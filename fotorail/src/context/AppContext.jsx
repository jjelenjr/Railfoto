import { createContext, useContext, useState, useCallback, useRef } from 'react';

const AppContext = createContext(null);

const DEFAULT_CATEGORIES = [
  { id: 'kolej',     name: 'Traťová kolej',    color: '#f59e0b' },
  { id: 'propustek', name: 'Propustky/mosty',  color: '#3b82f6' },
  { id: 'odvodneni', name: 'Odvodnění',         color: '#14b8a6' },
  { id: 'jine',      name: 'Jiné',              color: '#8b5cf6' },
];

function loadCategories() {
  try {
    const saved = localStorage.getItem('fr_categories');
    if (saved) return JSON.parse(saved);
  } catch {}
  return DEFAULT_CATEGORIES;
}

function loadProjects() {
  try { return JSON.parse(localStorage.getItem('fr_projects') || '[]'); } catch { return []; }
}

export function AppProvider({ children }) {
  const [screen, setScreen] = useState('projects'); // 'projects' | 'main'
  const [projects, setProjectsState] = useState(loadProjects);
  const [currentProject, setCurrentProject] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [categories, setCategoriesState] = useState(loadCategories);
  const [selectedCatId, setSelectedCatId] = useState(DEFAULT_CATEGORIES[0].id);

  // Filter state
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterTab, setFilterTab] = useState('day');
  const [filterDay, setFilterDay] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterCats, setFilterCats] = useState([]); // array of category ids, empty = all

  // Toast
  const [toast, setToast] = useState({ msg: '', type: '', visible: false });
  const toastTimerRef = useRef(null);

  // PDF state
  const [pdfState, setPdfState] = useState({
    doc: null, placed: false, visible: true,
    currentPage: 1, totalPages: 1,
    refPt: null, northPt: null, scale: 500,
    mapRef: null, rotation: 0, metersPerPx: 1,
    canvasW: 0, canvasH: 0, filename: '',
    mapOpacity: 100, pdfOpacity: 70,
    adjustMode: false,
  });

  const saveProjects = useCallback((list) => {
    localStorage.setItem('fr_projects', JSON.stringify(list));
  }, []);

  const setProjects = useCallback((list) => {
    setProjectsState(list);
    saveProjects(list);
  }, [saveProjects]);

  const saveCategories = useCallback((list) => {
    setCategoriesState(list);
    localStorage.setItem('fr_categories', JSON.stringify(list));
  }, []);

  const showToast = useCallback((msg, type = '') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ msg, type, visible: true });
    toastTimerRef.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 4500);
  }, []);

  const getCatById = useCallback((id) => {
    return categories.find(c => c.id === id) || null;
  }, [categories]);

  const isPhotoVisible = useCallback((p) => {
    // Category filter
    if (filterCats.length > 0 && !filterCats.includes(p.catId)) return false;
    // Date filter
    if (filterTab === 'day' && filterDay) return p.date === filterDay;
    if (filterTab === 'range') {
      if (filterFrom && p.date < filterFrom) return false;
      if (filterTo && p.date > filterTo) return false;
      return true;
    }
    if (filterTab === 'month' && filterMonth) return p.date && p.date.startsWith(filterMonth);
    return true;
  }, [filterCats, filterTab, filterDay, filterFrom, filterTo, filterMonth]);

  return (
    <AppContext.Provider value={{
      screen, setScreen,
      projects, setProjects,
      currentProject, setCurrentProject,
      photos, setPhotos,
      categories, saveCategories,
      selectedCatId, setSelectedCatId,
      filterOpen, setFilterOpen,
      filterTab, setFilterTab,
      filterDay, setFilterDay,
      filterFrom, setFilterFrom,
      filterTo, setFilterTo,
      filterMonth, setFilterMonth,
      filterCats, setFilterCats,
      toast, showToast,
      pdfState, setPdfState,
      getCatById,
      isPhotoVisible,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
