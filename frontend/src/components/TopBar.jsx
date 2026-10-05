import { useMemo, useState } from 'react';
import { HardHat, Menu, Search } from 'lucide-react';
import { Link } from '../lib/router';
import { SECTORS } from '../lib/sectors';

export default function TopBar({ sector, modelLabel, onSelectSector, onMenu }) {
  const [q, setQ] = useState('');
  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return SECTORS.filter((s) => s.name.toLowerCase().includes(t) || `${s.lat}, ${s.lon}`.includes(t)).slice(0, 5);
  }, [q]);
  const pick = (id) => { onSelectSector(id); setQ(''); };

  return (
    <header className="topbar">
      <button type="button" className="icon-btn menu-btn" onClick={onMenu} aria-label="Open controls" aria-controls="control-sidebar">
        <Menu size={20} />
      </button>
      <Link to="/" className="brand" aria-label="GeoRock AI home">
        <span className="brand-mark"><HardHat size={18} aria-hidden="true" /></span>
        <span className="brand-name">GEOROCK AI</span>
        <span className="brand-sub">Rockfall Risk &amp; Alert Decision Support</span>
      </Link>

      <div className="search" role="search">
        <Search size={15} aria-hidden="true" />
        <label htmlFor="sector-search" className="sr-only">Search sectors or coordinates</label>
        <input id="sector-search" type="search" placeholder="Search sector, location, coordinates" autoComplete="off"
          value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && matches[0]) pick(matches[0].id); if (e.key === 'Escape') setQ(''); }} />
        {q.trim() && (
          <ul className="search-results">
            {matches.length === 0 && <li className="none">No matching sector</li>}
            {matches.map((s) => (
              <li key={s.id}><button type="button" onClick={() => pick(s.id)}>{s.name}<small>{s.lat}, {s.lon}</small></button></li>
            ))}
          </ul>
        )}
      </div>

      <div className="topbar-pills" aria-label="System status">
        <span className="pill pill-live"><span className="pulse-dot" aria-hidden="true" /> LIVE — {sector.short}</span>
        <span className="pill pill-info">{modelLabel} + SHAP</span>
        <span className="pill pill-warn">synthetic training data</span>
      </div>
    </header>
  );
}
