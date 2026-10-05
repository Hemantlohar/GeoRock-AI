import { useEffect, useRef, useState } from 'react';
import { ClipboardList, Send, CheckCircle2, Radio } from 'lucide-react';
import { API_BASE, TURNSTILE_SITE_KEY } from '../lib/env';
import { track } from '../lib/analytics';

const SEVERITIES = [
  ['none', 'No visible damage'], ['minor', 'Minor — surface raveling'], ['moderate', 'Moderate — open cracks'],
  ['severe', 'Severe — active movement'], ['critical', 'Critical — imminent failure'],
];

function validate(v, operatorId) {
  const e = {};
  if (!/^[A-Za-z0-9_-]{3,40}$/.test(operatorId)) e.operator = 'Set a valid Operator ID (3–40 letters, numbers, - or _) in the session panel.';
  const num = (s) => (s === '' ? null : Number(s));
  const crack = num(v.crack); const rain = num(v.rain);
  if (crack !== null && !(crack >= 0 && crack <= 200)) e.crack = 'Enter a crack width between 0 and 200 mm.';
  if (rain !== null && !(rain >= 0 && rain <= 300)) e.rain = 'Enter rainfall between 0 and 300 mm/h.';
  if (crack === null && rain === null) e.crack = e.crack || 'Enter at least a crack width or a rainfall reading.';
  const lat = Number(v.lat); const lon = Number(v.lon);
  if (v.lat === '' || !(lat >= -90 && lat <= 90)) e.lat = 'Latitude must be between -90 and 90.';
  if (v.lon === '' || !(lon >= -180 && lon <= 180)) e.lon = 'Longitude must be between -180 and 180.';
  if (!v.severity) e.severity = 'Choose the observed severity.';
  if (v.notes.length > 1000) e.notes = 'Notes must be 1000 characters or fewer.';
  return e;
}

// Defined at module level on purpose: a component declared inside another component is
// re-created every render, which would remount the inputs and drop focus on each keystroke.
function Field({ name, label, hint, error, children }) {
  return (
    <div className="field">
      <label htmlFor={`fo-${name}`}>{label}</label>
      {children}
      {error && <p className="field-error" id={`fo-${name}-err`} role="alert">{error}</p>}
      {hint && !error && <p className="field-hint">{hint}</p>}
    </div>
  );
}

export default function FieldObservations({ sector, operatorId, missionRef }) {
  const empty = { crack: '', rain: '', lat: String(sector.lat), lon: String(sector.lon), severity: '', notes: '', relay: false, website: '' };
  const [v, setV] = useState(empty);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: 'idle', msg: '' });
  const startedAt = useRef(Date.now());
  const tsRef = useRef(null);
  const tsToken = useRef('');
  const formRef = useRef(null);

  // Pre-fill coordinates when the selected sector changes
  useEffect(() => { setV((p) => ({ ...p, lat: String(sector.lat), lon: String(sector.lon) })); }, [sector.id, sector.lat, sector.lon]);

  // Optional Cloudflare Turnstile (only if a public site key is configured)
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return undefined;
    const mount = () => {
      if (window.turnstile && tsRef.current && !tsRef.current.dataset.rendered) {
        tsRef.current.dataset.rendered = '1';
        window.turnstile.render(tsRef.current, { sitekey: TURNSTILE_SITE_KEY, theme: 'dark', callback: (t) => { tsToken.current = t; } });
      }
    };
    if (window.turnstile) { mount(); return undefined; }
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true; s.onload = mount;
    document.head.appendChild(s);
    return undefined;
  }, []);

  const set = (k) => (e) => setV((p) => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(v, operatorId);
    setErrors(errs);
    if (Object.keys(errs).length) {
      setStatus({ type: 'error', msg: 'Please fix the highlighted fields.' });
      const first = Object.keys(errs).find((k) => k !== 'operator');
      formRef.current?.querySelector(`[name="${first}"]`)?.focus();
      return;
    }
    setStatus({ type: 'loading', msg: 'Submitting…' });
    try {
      const res = await fetch(`${API_BASE}/api/observations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operator_id: operatorId, mission_ref: missionRef, sector: sector.name,
          observed_crack_width_mm: v.crack === '' ? null : Number(v.crack),
          observed_rainfall_mm_h: v.rain === '' ? null : Number(v.rain),
          lat: Number(v.lat), lon: Number(v.lon), severity: v.severity, notes: v.notes.trim(),
          relay_to_control: v.relay, website: v.website, form_started_at: startedAt.current,
          turnstile_token: tsToken.current || null,
        }),
      });
      if (!res.ok) {
        let detail = 'Could not submit the observation.';
        try { const j = await res.json(); if (typeof j.detail === 'string') detail = j.detail; else if (Array.isArray(j.detail)) detail = 'Some values were rejected. Please check the form.'; } catch { /* ignore */ }
        throw new Error(res.status === 429 ? `${detail} (wait a moment and retry)` : detail);
      }
      setStatus({ type: 'success', msg: v.relay ? 'Observation saved and relayed to control.' : 'Observation saved.' });
      track('field_observation_submitted', { severity: v.severity });
      setV({ ...empty, lat: v.lat, lon: v.lon });
      startedAt.current = Date.now();
      tsToken.current = ''; window.turnstile?.reset?.();
    } catch (err) {
      setStatus({ type: 'error', msg: err.message === 'Failed to fetch' ? 'Cannot reach the server. Check your connection.' : err.message });
    }
  };

  const common = (name) => ({ id: `fo-${name}`, name, 'aria-invalid': !!errors[name], 'aria-describedby': errors[name] ? `fo-${name}-err` : undefined });

  return (
    <aside className="side-card obs-card" aria-labelledby="obs-title">
      <h2 className="side-title" id="obs-title"><ClipboardList size={16} aria-hidden="true" /> Field observations</h2>
      <p className="side-note">Report what you see on the bench. Sector: <strong>{sector.short}</strong></p>

      <form ref={formRef} onSubmit={submit} noValidate>
        <div className="field-row">
          <Field error={errors.crack} name="crack" label="Crack width (mm)">
            <input {...common('crack')} type="number" inputMode="decimal" step="0.1" placeholder="e.g. 14.5" value={v.crack} onChange={set('crack')} />
          </Field>
          <Field error={errors.rain} name="rain" label="Rainfall (mm/h)">
            <input {...common('rain')} type="number" inputMode="decimal" step="0.1" placeholder="e.g. 32" value={v.rain} onChange={set('rain')} />
          </Field>
        </div>
        <div className="field-row">
          <Field error={errors.lat} name="lat" label="Latitude">
            <input {...common('lat')} type="number" inputMode="decimal" step="any" value={v.lat} onChange={set('lat')} />
          </Field>
          <Field error={errors.lon} name="lon" label="Longitude">
            <input {...common('lon')} type="number" inputMode="decimal" step="any" value={v.lon} onChange={set('lon')} />
          </Field>
        </div>
        <Field error={errors.severity} name="severity" label="Observed severity">
          <select {...common('severity')} value={v.severity} onChange={set('severity')}>
            <option value="">Select severity…</option>
            {SEVERITIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Field>
        <Field error={errors.notes} name="notes" label="Field notes" hint={`${v.notes.length}/1000`}>
          <textarea {...common('notes')} rows={4} maxLength={1000} placeholder="Describe conditions, road access, visible damage…" value={v.notes} onChange={set('notes')} />
        </Field>

        {/* Honeypot: hidden from people and screen readers; bots fill it in */}
        <div className="hp" aria-hidden="true">
          <label htmlFor="fo-website">Website</label>
          <input id="fo-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={v.website} onChange={set('website')} />
        </div>

        <label className="check"><input type="checkbox" checked={v.relay} onChange={set('relay')} /> <Radio size={14} aria-hidden="true" /> Relay to mine control room</label>
        {errors.operator && <p className="field-error" role="alert">{errors.operator}</p>}
        {TURNSTILE_SITE_KEY && <div ref={tsRef} className="turnstile" />}

        <button type="submit" className="btn-solid" disabled={status.type === 'loading'}>
          <Send size={16} aria-hidden="true" /> {status.type === 'loading' ? 'Submitting…' : 'Submit observation'}
        </button>
        <div className={`form-status ${status.type}`} role="status" aria-live="polite">
          {status.type === 'success' && <CheckCircle2 size={15} aria-hidden="true" />} {status.msg}
        </div>
      </form>
    </aside>
  );
}
