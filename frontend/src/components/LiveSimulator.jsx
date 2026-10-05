import React, { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../lib/env';
import { Play, Pause, Radio, RefreshCw, AlertCircle, ShieldAlert } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function LiveSimulator({ apiBaseUrl = API_BASE }) {
  const [isRunning, setIsRunning] = useState(false);
  const [hazardLevel, setHazardLevel] = useState('moderate'); // 'stable', 'moderate', 'storm'
  const [streamData, setStreamData] = useState([]);
  const [latestTick, setLatestTick] = useState(null);
  const timerRef = useRef(null);

  const baselineRiskMap = {
    stable: 0.15,
    moderate: 0.48,
    storm: 0.82
  };

  const fetchTick = async () => {
    try {
      const riskParam = baselineRiskMap[hazardLevel];
      const res = await fetch(`${apiBaseUrl}/api/telemetry/simulate?baseline_risk=${riskParam}`);
      const tick = await res.json();
      setLatestTick(tick);
      setStreamData(prev => {
        const next = [...prev, tick];
        if (next.length > 20) return next.slice(next.length - 20);
        return next;
      });
    } catch (err) {
      console.error("Simulation tick error:", err);
    }
  };

  useEffect(() => {
    if (isRunning) {
      // Immediate tick on start
      fetchTick();
      timerRef.current = setInterval(fetchTick, 2500);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, hazardLevel]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div className="card-title">
              <Radio size={20} color="var(--primary)" className={isRunning ? "pulse-dot" : ""} />
              Real-Time Geotechnical Telemetry Stream Simulator
            </div>
            <div className="card-subtitle">
              Simulates live continuous radar, extensometer, and seismograph feeds to evaluate automated alert triggers.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Condition Mode */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>Condition:</span>
              <select
                value={hazardLevel}
                onChange={(e) => setHazardLevel(e.target.value)}
                style={{
                  background: '#090e1b',
                  color: '#fff',
                  border: '1px solid var(--border-subtle)',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                <option value="stable">Stable Dry Bench (~15% Risk)</option>
                <option value="moderate">Bench Creep (~48% Risk)</option>
                <option value="storm">Monsoon Blast Episode (~82% Risk)</option>
              </select>
            </div>

            {/* Play/Pause Button */}
            <button
              type="button"
              className="preset-pill-btn"
              onClick={() => setIsRunning(!isRunning)}
              style={{
                background: isRunning ? '#7f1d1d' : '#0369a1',
                color: '#fff',
                borderColor: isRunning ? '#ef4444' : 'var(--primary)'
              }}
            >
              {isRunning ? <Pause size={14} /> : <Play size={14} />}
              {isRunning ? 'Pause Stream' : 'Start Live Telemetry'}
            </button>
          </div>
        </div>

        {/* Live Status Readout Bar */}
        {latestTick && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
            <div className="stat-card">
              <span className="stat-label">Live Probability</span>
              <span className="stat-value" style={{ color: latestTick.risk_color }}>
                {(latestTick.risk_probability * 100).toFixed(1)}%
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Risk Category</span>
              <span className="stat-value" style={{ color: latestTick.risk_color, fontSize: '1.25rem' }}>
                {latestTick.risk_level}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Displacement Rate</span>
              <span className="stat-value" style={{ color: '#38bdf8' }}>
                {latestTick.displacement_rate_mm_day} <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>mm/d</span>
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Crack Growth Velocity</span>
              <span className="stat-value" style={{ color: '#f59e0b' }}>
                {latestTick.crack_growth_rate} <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>mm/d</span>
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Blast Vibration PPV</span>
              <span className="stat-value" style={{ color: '#ec4899' }}>
                {latestTick.vibration_ppv} <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>mm/s</span>
              </span>
            </div>
          </div>
        )}

        {/* Live Streaming Chart */}
        <div style={{ width: '100%', height: '300px' }}>
          <ResponsiveContainer>
            <LineChart data={streamData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="timestamp" stroke="#8696ae" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 1]} stroke="#8696ae" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
              <Line
                type="monotone"
                dataKey="risk_probability"
                name="Live Probability"
                stroke="#ef4444"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#ef4444' }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
