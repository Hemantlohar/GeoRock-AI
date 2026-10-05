import React from 'react';
import { AlertTriangle, ShieldCheck, AlertCircle, Flame } from 'lucide-react';

export default function RiskGauge({ prediction }) {
  if (!prediction) {
    return (
      <div className="hero-risk-panel" style={{ minHeight: '340px', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Enter monitoring parameters or select a preset to analyze slope risk.</p>
      </div>
    );
  }

  const {
    probability_pct = 0,
    risk_level = 'LOW',
    risk_color = '#10b981',
    status_text = '',
    advisory = '',
    model_probabilities = {}
  } = prediction;

  // Semicircular Gauge calculations:
  // Radius = 100, Center = (130, 130)
  // Angle: from 180 deg (left, prob 0) to 360/0 deg (right, prob 100)
  const radius = 95;
  const cx = 130;
  const cy = 120;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (probability_pct / 100) * circumference;

  const getStatusIcon = (level) => {
    switch (level) {
      case 'CRITICAL':
        return <Flame size={20} color="#ef4444" />;
      case 'HIGH':
        return <AlertTriangle size={20} color="#f97316" />;
      case 'MEDIUM':
        return <AlertCircle size={20} color="#f59e0b" />;
      default:
        return <ShieldCheck size={20} color="#10b981" />;
    }
  };

  return (
    <div className="hero-risk-panel">
      {/* Semicircular SVG Gauge */}
      <div className="gauge-svg-container">
        <svg width="260" height="145" viewBox="0 0 260 145">
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="35%" stopColor="#f59e0b" />
              <stop offset="68%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
            <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="glow" />
              <feComposite in="SourceGraphic" in2="glow" operator="over" />
            </filter>
          </defs>

          {/* Background Track Arc */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke="#162238"
            strokeWidth="16"
            strokeLinecap="round"
          />

          {/* Active Risk Value Arc */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
              filter: probability_pct > 60 ? 'url(#gaugeGlow)' : 'none'
            }}
          />

          {/* Tick Marks for 0%, 30%, 60%, 80%, 100% */}
          <text x="26" y="140" fill="#8696ae" fontSize="10" fontFamily="var(--font-mono)">0%</text>
          <text x="80" y="44" fill="#8696ae" fontSize="9" fontFamily="var(--font-mono)">30%</text>
          <text x="165" y="44" fill="#8696ae" fontSize="9" fontFamily="var(--font-mono)">60%</text>
          <text x="216" y="140" fill="#8696ae" fontSize="10" fontFamily="var(--font-mono)">100%</text>
        </svg>

        <div className="gauge-readout-center">
          <span className="gauge-prob-number" style={{ color: risk_color }}>
            {probability_pct.toFixed(1)}%
          </span>
          <span className="gauge-prob-label">Rockfall Probability</span>
        </div>
      </div>

      {/* Risk Severity Level Pill */}
      <div
        className="risk-level-badge"
        style={{
          background: `${risk_color}18`,
          color: risk_color,
          border: `1px solid ${risk_color}50`,
          boxShadow: `0 0 20px ${risk_color}25`
        }}
      >
        {getStatusIcon(risk_level)}
        <span>{risk_level} RISK</span>
      </div>

      <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#f8fafc', marginBottom: '10px' }}>
        {status_text}
      </div>

      {/* Advisory Message */}
      <div className="risk-advisory-box">
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: '4px' }}>
          Geotechnical Safety Advisory
        </div>
        {advisory}
      </div>

      {/* Model Consensus Bar */}
      {model_probabilities && Object.keys(model_probabilities).length > 0 && (
        <div style={{ width: '100%', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: '8px', textAlign: 'left' }}>
            Multi-Model Consensus Estimates
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {Object.entries(model_probabilities).map(([mName, mProb]) => (
              <div key={mName} style={{ background: '#090e1b', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'left' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{mName}</div>
                <div style={{ fontSize: '0.92rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#e2e8f0' }}>
                  {mProb}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
