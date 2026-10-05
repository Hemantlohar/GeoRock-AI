import React, { useState, useEffect } from 'react';
import { API_BASE } from '../lib/env';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { History, TrendingUp, Calendar, Filter } from 'lucide-react';

export default function TemporalTrendsView({ apiBaseUrl = API_BASE }) {
  const [telemetry, setTelemetry] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${apiBaseUrl}/api/telemetry`).then(res => res.json()),
      fetch(`${apiBaseUrl}/api/history`).then(res => res.json())
    ])
      .then(([telData, histData]) => {
        setTelemetry(telData.telemetry || []);
        setPredictions(histData.history || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading temporal data:", err);
        setLoading(false);
      });
  }, [apiBaseUrl]);

  const filteredPredictions = predictions.filter(p => {
    if (filterLevel === 'ALL') return true;
    return p.risk_level === filterLevel;
  });

  const getRiskColor = (level) => {
    switch (level) {
      case 'CRITICAL': return '#ef4444';
      case 'HIGH': return '#f97316';
      case 'MEDIUM': return '#f59e0b';
      default: return '#10b981';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 30-Day Geotechnical Telemetry Progression */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <TrendingUp size={20} color="var(--primary)" />
              30-Day Geotechnical Telemetry & Slope Creep Progression
            </div>
            <div className="card-subtitle">
              Continuous monitoring log capturing the transition from stable conditions through monsoon events to tertiary creep acceleration.
            </div>
          </div>
          <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            N=30 Time-Series Intervals
          </span>
        </div>

        <div style={{ width: '100%', height: '320px' }}>
          <ResponsiveContainer>
            <AreaChart data={telemetry} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="probGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="dispGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="day_label" stroke="#8696ae" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" domain={[0, 1]} stroke="#8696ae" tick={{ fontSize: 11 }} unit=" prob" />
              <YAxis yAxisId="right" orientation="right" stroke="#38bdf8" tick={{ fontSize: 11 }} unit=" mm" />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="risk_probability"
                name="Rockfall Risk (0-1)"
                stroke="#ef4444"
                strokeWidth={2.5}
                fill="url(#probGradient)"
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="displacement_mm"
                name="Displacement (mm)"
                stroke="#38bdf8"
                strokeWidth={2}
                fill="url(#dispGradient)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="rainfall_mm"
                name="Rainfall (mm)"
                stroke="#818cf8"
                strokeWidth={1.8}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Historical Predictions Log Table */}
      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div className="card-title">
              <History size={20} color="var(--primary)" />
              Prediction Log & Audit Trail (SQLite)
            </div>
            <div className="card-subtitle">
              Historical records of all user assessments, geotechnical parameters, and AI risk determinations.
            </div>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={14} color="var(--text-muted)" />
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
              <button
                key={lvl}
                type="button"
                className={`preset-pill-btn ${filterLevel === lvl ? 'active' : ''}`}
                style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                onClick={() => setFilterLevel(lvl)}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Model</th>
                <th>Probability</th>
                <th>Risk Level</th>
                <th>Displacement</th>
                <th>Crack Width</th>
                <th>Rainfall</th>
                <th>Primary Drivers</th>
              </tr>
            </thead>
            <tbody>
              {filteredPredictions.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                    No prediction records match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredPredictions.map((pred) => {
                  const riskColor = getRiskColor(pred.risk_level);
                  return (
                    <tr key={pred.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {pred.timestamp}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{pred.model_used}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: riskColor }}>
                        {(pred.probability * 100).toFixed(1)}%
                      </td>
                      <td>
                        <span
                          style={{
                            background: `${riskColor}18`,
                            color: riskColor,
                            border: `1px solid ${riskColor}40`,
                            padding: '3px 8px',
                            borderRadius: '999px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            fontFamily: 'var(--font-display)'
                          }}
                        >
                          {pred.risk_level}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{pred.rock_displacement_mm} mm</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{pred.crack_width_mm} mm</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{pred.rainfall_mm} mm</td>
                      <td style={{ fontSize: '0.76rem', color: 'var(--text-muted)', maxWidth: '280px' }}>
                        {Array.isArray(pred.primary_factors) && pred.primary_factors.length > 0
                          ? pred.primary_factors.slice(0, 2).join('; ')
                          : 'Normal geotechnical baseline'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
