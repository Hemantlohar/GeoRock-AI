import { SECTORS, riskBand } from '../lib/sectors';

// Hand-drawn benches (concentric, slightly irregular) so the map needs no tile server or images.
const RINGS = [
  'M400 60 C560 58 690 130 706 260 C718 380 600 470 440 478 C280 486 120 430 96 290 C78 170 230 62 400 60Z',
  'M400 96 C536 94 646 156 660 262 C670 360 572 436 440 442 C308 448 164 400 142 288 C126 190 258 98 400 96Z',
  'M400 132 C512 130 600 182 612 264 C620 340 540 400 440 406 C340 410 212 372 192 286 C178 212 288 134 400 132Z',
  'M400 168 C488 166 556 206 564 266 C570 318 510 364 440 368 C368 372 262 344 246 284 C236 232 316 170 400 168Z',
  'M400 204 C462 202 508 230 514 270 C518 304 482 332 436 334 C390 336 316 316 304 280 C296 250 346 206 400 204Z',
];

export default function SiteMap({ activeId, onSelect, activeProbability, alertActive }) {
  return (
    <section className="card map-card" aria-labelledby="map-title">
      <div className="card-header">
        <div>
          <h2 className="card-title" id="map-title">Pit plan — sector risk overview</h2>
          <div className="card-subtitle">Select a sector. The live sector uses the AI model; other sectors show demo baselines.</div>
        </div>
        <span className="pill pill-warn">Simulated sectors</span>
      </div>

      <div className="map-stage">
        <svg viewBox="0 0 800 520" role="img" aria-label="Plan view of the open pit with six monitored sectors colour-coded by rockfall risk" className="map-svg">
          <defs>
            <radialGradient id="pitfloor" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#0b2a3f" />
              <stop offset="100%" stopColor="#0e172a" />
            </radialGradient>
          </defs>
          <rect width="800" height="520" fill="#0a1424" />
          {RINGS.map((d, i) => (
            <path key={i} d={d} fill={i === RINGS.length - 1 ? 'url(#pitfloor)' : 'none'}
              stroke="#2b3d5c" strokeWidth={i % 2 ? 1 : 1.6} />
          ))}
          <path d="M706 260 C690 400 520 500 330 470 C200 450 120 380 112 300" fill="none"
            stroke="#c9a227" strokeWidth="2.5" strokeDasharray="7 6" opacity="0.8" />

          {SECTORS.map((s) => {
            const isActive = s.id === activeId;
            const p = isActive ? activeProbability : s.baseRisk;
            const band = riskBand(p ?? 0);
            const select = () => onSelect(s.id);
            return (
              <g key={s.id} className={`map-marker ${isActive ? 'is-active' : ''}`} tabIndex={0} role="button"
                aria-pressed={isActive}
                aria-label={`${s.name}, ${Math.round((p ?? 0) * 100)} percent rockfall probability, ${band.label} risk${isActive ? ', selected' : ''}`}
                onClick={select} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); } }}>
                {isActive && <circle cx={s.x} cy={s.y} r="26" fill={band.color} opacity="0.18" className={alertActive ? 'ping' : ''} />}
                <circle cx={s.x} cy={s.y} r={isActive ? 13 : 10} fill={band.color} stroke="#fff" strokeWidth={isActive ? 3 : 1.5} />
                <text x={s.x} y={s.y - 22} textAnchor="middle" className="map-label">{s.short}</text>
                <text x={s.x} y={s.y + 30} textAnchor="middle" className="map-pct">{Math.round((p ?? 0) * 100)}%</text>
              </g>
            );
          })}
        </svg>

        <div className="map-legend" aria-label="Map legend">
          <strong>Legend</strong>
          <ul>
            <li><i style={{ background: 'var(--risk-low)' }} />Low &lt; 30%</li>
            <li><i style={{ background: 'var(--risk-medium)' }} />Medium 30–60%</li>
            <li><i style={{ background: 'var(--risk-high)' }} />High 60–80%</li>
            <li><i style={{ background: 'var(--risk-critical)' }} />Critical ≥ 80%</li>
            <li><i className="legend-ring" />Selected sector</li>
            <li><i className="legend-road" />Haul road</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
