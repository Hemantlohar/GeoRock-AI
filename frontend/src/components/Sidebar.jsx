import { useMemo } from 'react';
import { Sparkles, Layers, User, X } from 'lucide-react';
import { SECTORS } from '../lib/sectors';

export function SessionCard({ session, setSession, startedAt }) {
  const bind = (k) => ({ value: session[k], onChange: (e) => setSession((p) => ({ ...p, [k]: e.target.value })) });
  return (
    <section className="side-card" aria-labelledby="sess-title">
      <h2 className="side-title" id="sess-title"><User size={16} aria-hidden="true" /> Operator session</h2>
      <div className="field"><label htmlFor="op-id">Operator ID</label>
        <input id="op-id" maxLength={40} autoComplete="off" {...bind('operatorId')} /></div>
      <div className="field"><label htmlFor="op-mission">Mission reference</label>
        <input id="op-mission" maxLength={60} autoComplete="off" {...bind('missionRef')} /></div>
      <div className="field-row">
        <div className="field"><label htmlFor="op-alert">Alert level</label>
          <select id="op-alert" {...bind('alertLevel')}>{['Green', 'Yellow', 'Orange', 'Red'].map((x) => <option key={x}>{x}</option>)}</select></div>
        <div className="field"><label htmlFor="op-prio">Priority</label>
          <select id="op-prio" {...bind('priority')}>{['Low', 'Medium', 'High', 'Urgent'].map((x) => <option key={x}>{x}</option>)}</select></div>
      </div>
      <div className="field"><label htmlFor="op-ts">Session started</label>
        <input id="op-ts" readOnly value={startedAt} /></div>
    </section>
  );
}

export function SectorCard({ sectorId, onSelect }) {
  return (
    <section className="side-card" aria-labelledby="sector-title">
      <h2 className="side-title" id="sector-title">Sector selection</h2>
      <div className="field">
        <label htmlFor="sector-select" className="sr-only">Sector</label>
        <select id="sector-select" className="select-lg" value={sectorId} onChange={(e) => onSelect(e.target.value)}>
          {SECTORS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
    </section>
  );
}

export function ScenarioCard({ presets, activePreset, onLoadPreset, modelChoice, setModelChoice }) {
  const entries = useMemo(() => Object.entries(presets), [presets]);
  return (
    <section className="side-card" aria-labelledby="scen-title">
      <h2 className="side-title" id="scen-title"><Sparkles size={16} aria-hidden="true" /> Scenario</h2>
      <div className="chips" role="group" aria-label="Scenario presets">
        {entries.length === 0 && <span className="side-note">Loading scenarios…</span>}
        {entries.map(([key, p]) => (
          <button key={key} type="button" className={`chip ${activePreset === key ? 'active' : ''}`}
            aria-pressed={activePreset === key} onClick={() => onLoadPreset(key)}>{p.name}</button>
        ))}
      </div>
      <div className="field model-field">
        <label htmlFor="model-select"><Layers size={13} aria-hidden="true" /> Model</label>
        <select id="model-select" value={modelChoice} onChange={(e) => setModelChoice(e.target.value)}>
          <option value="xgboost">XGBoost (primary)</option>
          <option value="random_forest">Random Forest</option>
          <option value="logistic_regression">Logistic Regression</option>
        </select>
      </div>
    </section>
  );
}

export default function Sidebar({ open, onClose, children }) {
  return (
    <>
      <div className={`scrim ${open ? 'show' : ''}`} onClick={onClose} aria-hidden="true" />
      <div id="control-sidebar" className={`sidebar ${open ? 'open' : ''}`} aria-label="Controls">
        <button type="button" className="drawer-close" onClick={onClose} aria-label="Close controls"><X size={18} /></button>
        {children}
      </div>
    </>
  );
}
