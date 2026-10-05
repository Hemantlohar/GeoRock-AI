import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Layers, GitCompare, Camera, Radio, AlertTriangle } from 'lucide-react';
import { API_BASE } from '../lib/env';
import { usePageMeta } from '../lib/seo';
import { SECTORS } from '../lib/sectors';
import { useSessionState } from '../lib/useSessionState';
import { track } from '../lib/analytics';
import TopBar from '../components/TopBar';
import Sidebar, { SessionCard, SectorCard, ScenarioCard } from '../components/Sidebar';
import ParameterPanel from '../components/ParameterPanel';
import FieldObservations from '../components/FieldObservations';
import SiteMap from '../components/SiteMap';
import RiskGauge from '../components/RiskGauge';
import ExplainabilityView from '../components/ExplainabilityView';
import AlertBanner from '../components/AlertBanner';
import { Footer } from '../components/SiteChrome';

// Heavy chart-based views are split into their own files and loaded on demand
const TemporalTrendsView = lazy(() => import('../components/TemporalTrendsView'));
const ModelComparisonView = lazy(() => import('../components/ModelComparisonView'));
const CrackInspectionView = lazy(() => import('../components/CrackInspectionView'));
const LiveSimulator = lazy(() => import('../components/LiveSimulator'));

const TABS = [
  { id: 'prediction', label: 'Assessment', icon: Activity },
  { id: 'trends', label: 'Trends', icon: Layers },
  { id: 'models', label: 'Benchmark', icon: GitCompare },
  { id: 'cv', label: 'Crack vision', icon: Camera },
  { id: 'simulator', label: 'Live telemetry', icon: Radio },
];
const MODEL_LABEL = { xgboost: 'XGBoost', random_forest: 'Random Forest', logistic_regression: 'Logistic Reg.' };

const DEFAULT_PARAMS = {
  rainfall_mm: 68.5, pore_water_pressure_kpa: 142.0, rock_displacement_mm: 54.0, displacement_rate_mm_day: 12.8,
  crack_width_mm: 38.0, crack_growth_rate_mm_day: 7.4, vibration_ppv_mm_s: 46.5, slope_angle_deg: 64.0,
  rock_mass_rating_rmr: 38.0, temperature_c: 24.0, humidity_pct: 92.0,
};

export default function Dashboard() {
  usePageMeta({ title: 'Dashboard — GeoRock AI', description: 'Live rockfall risk assessment dashboard for open-pit mine slopes.', path: '/dashboard', noindex: true });

  const [tab, setTab] = useState('prediction');
  const [drawer, setDrawer] = useState(false);
  const [sectorId, setSectorId] = useSessionState('georock_sector', SECTORS[0].id);
  const [session, setSession] = useSessionState('georock_session', {
    operatorId: 'OPS-2026-0001', missionRef: 'GEO-SLOPE-01', alertLevel: 'Yellow', priority: 'Medium',
  });
  const startedAt = useMemo(() => new Date().toLocaleString(), []);

  const [presets, setPresets] = useState({});
  const [activePreset, setActivePreset] = useState('monsoon_blast');
  const [modelChoice, setModelChoice] = useState('xgboost');
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [prediction, setPrediction] = useState(null);
  const [activeAlert, setActiveAlert] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const sector = SECTORS.find((s) => s.id === sectorId) || SECTORS[0];

  const predict = useCallback(async (overrideParams) => {
    setLoading(true);
    setApiError('');
    try {
      const res = await fetch(`${API_BASE}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(overrideParams || params), model_choice: modelChoice }),
      });
      if (res.status === 429) throw new Error('Too many requests — wait a few seconds and try again.');
      if (!res.ok) throw new Error('The analysis server returned an error. Please try again.');
      const data = await res.json();
      setPrediction(data);
      setActiveAlert(data.alert_required ? data : null);
      track('risk_analysis_run', { model: modelChoice });
    } catch (err) {
      setApiError(err.message === 'Failed to fetch' ? 'Cannot reach the analysis server. Is the backend running?' : err.message);
    } finally {
      setLoading(false);
    }
  }, [params, modelChoice]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/api/presets`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d.presets) return;
        setPresets(d.presets);
        if (d.presets.monsoon_blast) {
          setParams(d.presets.monsoon_blast.parameters);
          predict(d.presets.monsoon_blast.parameters);
        } else predict();
      })
      .catch(() => { if (!cancelled) { setApiError('Cannot reach the analysis server. Is the backend running?'); } });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPreset = (key) => { if (presets[key]) { setParams(presets[key].parameters); setActivePreset(key); } };
  const importCrack = (w) => {
    setParams((p) => ({ ...p, crack_width_mm: w, crack_growth_rate_mm_day: Math.min(15, +(w * 0.18).toFixed(1)) }));
    setTab('prediction');
  };
  const selectSector = (id) => { setSectorId(id); setDrawer(false); };

  return (
    <div className="dash">
      <TopBar sector={sector} modelLabel={MODEL_LABEL[modelChoice]} onSelectSector={selectSector} onMenu={() => setDrawer(true)} />

      <div className="shell">
        <Sidebar open={drawer} onClose={() => setDrawer(false)}>
          <SessionCard session={session} setSession={setSession} startedAt={startedAt} />
          <SectorCard sectorId={sectorId} onSelect={selectSector} />
          <ScenarioCard presets={presets} activePreset={activePreset} onLoadPreset={loadPreset}
            modelChoice={modelChoice} setModelChoice={setModelChoice} />
          <ParameterPanel params={params} setParams={setParams} onCustomise={() => setActivePreset(null)}
            onSubmit={() => { predict(); setDrawer(false); }} loading={loading} />
        </Sidebar>

        <main className="center" id="main">
          {apiError && <div className="notice" role="alert"><AlertTriangle size={16} aria-hidden="true" /> {apiError}</div>}
          {/* Reserve the banner's space until the first result arrives, so the page doesn't jump */}
          {!prediction && !apiError && <div className="alert-skeleton" aria-hidden="true" />}
          <AlertBanner activeAlert={activeAlert} onAcknowledge={() => setActiveAlert(null)} />

          <div className="tabs" role="tablist" aria-label="Dashboard views">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} role="tab" type="button" id={`tab-${id}`} aria-selected={tab === id} aria-controls="tabpanel"
                className={`tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
                <Icon size={15} aria-hidden="true" /> {label}
              </button>
            ))}
          </div>

          <div id="tabpanel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
            {tab === 'prediction' && (
              <>
                <div className="grid-4col stats">
                  <div className="stat-card"><span className="stat-label">24 h rainfall</span>
                    <div className="stat-value-group"><span className="stat-value" style={{ color: '#38bdf8' }}>{params.rainfall_mm}</span><span className="stat-unit">mm</span></div></div>
                  <div className="stat-card"><span className="stat-label">Cumulative displacement</span>
                    <div className="stat-value-group"><span className="stat-value" style={{ color: '#a5b4fc' }}>{params.rock_displacement_mm}</span><span className="stat-unit">mm</span></div></div>
                  <div className="stat-card"><span className="stat-label">Crack growth</span>
                    <div className="stat-value-group"><span className="stat-value" style={{ color: '#fbbf24' }}>{params.crack_growth_rate_mm_day}</span><span className="stat-unit">mm/d</span></div></div>
                  <div className="stat-card"><span className="stat-label">Blast load (PPV)</span>
                    <div className="stat-value-group"><span className="stat-value" style={{ color: '#f472b6' }}>{params.vibration_ppv_mm_s}</span><span className="stat-unit">mm/s</span></div></div>
                </div>
                <SiteMap activeId={sectorId} onSelect={selectSector} activeProbability={prediction?.probability ?? 0} alertActive={!!activeAlert} />
                <div className="grid-2even">
                  <RiskGauge prediction={prediction} />
                  <ExplainabilityView prediction={prediction} />
                </div>
              </>
            )}
            <Suspense fallback={<div className="card loading-card" role="status">Loading view…</div>}>
              {tab === 'trends' && <TemporalTrendsView apiBaseUrl={API_BASE} />}
              {tab === 'models' && <ModelComparisonView apiBaseUrl={API_BASE} />}
              {tab === 'cv' && <CrackInspectionView apiBaseUrl={API_BASE} onImportCrackWidth={importCrack} />}
              {tab === 'simulator' && <LiveSimulator apiBaseUrl={API_BASE} />}
            </Suspense>
          </div>
        </main>

        <div className="right">
          <FieldObservations sector={sector} operatorId={session.operatorId} missionRef={session.missionRef} />
        </div>
      </div>
      <Footer />
    </div>
  );
}
