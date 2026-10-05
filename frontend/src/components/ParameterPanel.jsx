import { Play } from 'lucide-react';

const GROUPS = [
  {
    title: 'Movement & discontinuities',
    items: [
      { key: 'crack_width_mm', label: 'Tension crack width', unit: 'mm', min: 0, max: 80, step: 0.5 },
      { key: 'crack_growth_rate_mm_day', label: 'Crack growth velocity', unit: 'mm/day', min: 0, max: 15, step: 0.1 },
      { key: 'rock_displacement_mm', label: 'Cumulative displacement', unit: 'mm', min: 0, max: 120, step: 1 },
      { key: 'displacement_rate_mm_day', label: 'Displacement velocity', unit: 'mm/day', min: 0, max: 25, step: 0.2 },
      { key: 'slope_angle_deg', label: 'Bench slope angle', unit: '°', min: 35, max: 75, step: 1 },
      { key: 'rock_mass_rating_rmr', label: 'Rock mass rating (RMR)', unit: 'pts', min: 15, max: 90, step: 1 },
    ],
  },
  {
    title: 'Hydro-mechanical & dynamic triggers',
    items: [
      { key: 'rainfall_mm', label: '24 h rainfall', unit: 'mm', min: 0, max: 120, step: 1 },
      { key: 'vibration_ppv_mm_s', label: 'Blast vibration (PPV)', unit: 'mm/s', min: 0, max: 60, step: 0.5 },
      { key: 'pore_water_pressure_kpa', label: 'Pore water pressure', unit: 'kPa', min: 0, max: 180, step: 1 },
      { key: 'temperature_c', label: 'Ambient temperature', unit: '°C', min: -5, max: 45, step: 0.5 },
    ],
  },
];

export default function ParameterPanel({ params, setParams, onCustomise, onSubmit, loading }) {
  const change = (key, value) => {
    setParams((prev) => ({ ...prev, [key]: parseFloat(value) }));
    onCustomise();
  };

  return (
    <form className="side-card param-form" onSubmit={(e) => { e.preventDefault(); onSubmit(); }} aria-labelledby="param-title">
      <h2 className="side-title" id="param-title">Failure parameters</h2>
      {GROUPS.map((g) => (
        <fieldset key={g.title} className="param-group">
          <legend>{g.title}</legend>
          {g.items.map((it) => {
            const id = `p-${it.key}`;
            return (
              <div className="slider-group" key={it.key}>
                <div className="slider-header">
                  <label className="slider-label" htmlFor={id}>{it.label}</label>
                  <output className="slider-val-readout" htmlFor={id}>{params[it.key]} {it.unit}</output>
                </div>
                <input id={id} type="range" className="custom-range-slider" min={it.min} max={it.max} step={it.step}
                  value={params[it.key]} onChange={(e) => change(it.key, e.target.value)} />
              </div>
            );
          })}
        </fieldset>
      ))}
      <button type="submit" className="btn-primary" id="btn-analyze-risk" disabled={loading}>
        <Play size={18} aria-hidden="true" />
        {loading ? 'Evaluating stability…' : 'Analyze rockfall risk'}
      </button>
    </form>
  );
}
