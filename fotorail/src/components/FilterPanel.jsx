import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';

const MONTHS = ['Led','Úno','Bře','Dub','Kvě','Čvn','Čvc','Srp','Zář','Říj','Lis','Pro'];

export default function FilterPanel({ onApply }) {
  const {
    photos, categories, filterOpen,
    filterTab, setFilterTab,
    filterDay, setFilterDay,
    filterFrom, setFilterFrom,
    filterTo, setFilterTo,
    filterMonth, setFilterMonth,
    filterCats, setFilterCats,
    setFilterOpen,
  } = useApp();

  const [year, setYear] = useState(new Date().getFullYear());

  const dateCounts = useMemo(() => {
    const m = {};
    photos.forEach(p => { if (p.date) m[p.date] = (m[p.date] || 0) + 1; });
    return m;
  }, [photos]);

  const monthHas = useMemo(() => {
    const m = {};
    photos.forEach(p => { if (p.date?.startsWith(String(year))) m[p.date.slice(5, 7)] = true; });
    return m;
  }, [photos, year]);

  const sortedDates = useMemo(() =>
    Object.entries(dateCounts).sort((a, b) => b[0].localeCompare(a[0])),
    [dateCounts]
  );

  const apply = () => onApply?.();

  const clear = () => {
    setFilterDay(''); setFilterFrom(''); setFilterTo(''); setFilterMonth('');
    setFilterCats([]);
    setFilterOpen(false);
    onApply?.();
  };

  const toggleCat = (id) => {
    setFilterCats(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const pickMonth = (key) => {
    setFilterMonth(prev => prev === key ? '' : key);
  };

  return (
    <div className={`filter-panel ${filterOpen ? 'open' : ''}`}>
      {/* Typ filtru (datum) */}
      <div className="filter-section">
        <div className="filter-title">Typ filtru</div>
        <div className="filter-tabs">
          {['day', 'range', 'month'].map(t => (
            <button
              key={t}
              className={`filter-tab ${filterTab === t ? 'active' : ''}`}
              onClick={() => setFilterTab(t)}
            >
              {t === 'day' ? 'Den' : t === 'range' ? 'Rozsah' : 'Měsíc'}
            </button>
          ))}
        </div>
      </div>

      {/* Den */}
      {filterTab === 'day' && (
        <div className="filter-section">
          <div className="filter-title">Vyber den</div>
          <input
            type="date" className="date-inp" value={filterDay}
            onChange={e => { setFilterDay(e.target.value); apply(); }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4, maxHeight: 130, overflowY: 'auto' }}>
            {sortedDates.map(([d, c]) => (
              <button
                key={d}
                className={`month-btn ${filterDay === d ? 'active' : ''}`}
                onClick={() => { setFilterDay(d); apply(); }}
              >
                {d.slice(5)} <span style={{ opacity: .6 }}>{c}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Rozsah */}
      {filterTab === 'range' && (
        <div className="filter-section">
          <div className="filter-title">Rozsah dat</div>
          <div className="date-range-row">
            <input type="date" className="date-inp" value={filterFrom} onChange={e => { setFilterFrom(e.target.value); apply(); }} />
            <span style={{ color: 'var(--text2)', fontSize: 12 }}>→</span>
            <input type="date" className="date-inp" value={filterTo} onChange={e => { setFilterTo(e.target.value); apply(); }} />
          </div>
        </div>
      )}

      {/* Měsíc */}
      {filterTab === 'month' && (
        <div className="filter-section">
          <div className="filter-title">Vyber měsíc</div>
          <input
            type="number" className="date-inp" value={year}
            onChange={e => setYear(parseInt(e.target.value) || new Date().getFullYear())}
            placeholder="Rok (2025)" style={{ marginBottom: 6 }}
          />
          <div className="month-grid">
            {MONTHS.map((m, i) => {
              const mm = String(i + 1).padStart(2, '0');
              const key = year + '-' + mm;
              const has = monthHas[mm];
              return (
                <button
                  key={mm}
                  className={`month-btn ${filterMonth === key ? 'active' : ''}`}
                  style={{ opacity: has ? 1 : .35, cursor: has ? 'pointer' : 'default' }}
                  onClick={() => { if (has) { pickMonth(key); apply(); } }}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Kategorie */}
      <div className="filter-section">
        <div className="filter-title">Kategorie</div>
        <div className="cat-filter-chips">
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`cat-chip ${filterCats.includes(cat.id) ? 'active' : ''}`}
              style={filterCats.includes(cat.id) ? { background: cat.color } : {}}
              onClick={() => { toggleCat(cat.id); apply(); }}
            >
              <span
                className="cat-dot"
                style={{
                  background: filterCats.includes(cat.id) ? 'rgba(255,255,255,.7)' : cat.color,
                  width: 7, height: 7
                }}
              />
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-actions">
        <button className="btn btn-primary btn-sm" onClick={apply}>Použít</button>
        <button className="btn btn-ghost btn-sm" onClick={clear}>Zrušit filtr</button>
      </div>
    </div>
  );
}
