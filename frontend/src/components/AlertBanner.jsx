import React from 'react';
import { AlertTriangle, AlertOctagon, CheckCircle2, ShieldAlert, BellRing } from 'lucide-react';

export default function AlertBanner({ activeAlert, onAcknowledge }) {
  if (!activeAlert || !activeAlert.alert_required) {
    return null;
  }

  const isCritical = activeAlert.risk_level === 'CRITICAL';

  return (
    <div className={`alert-banner ${isCritical ? 'critical' : 'high'}`}>
      <div style={{ padding: '6px', borderRadius: '8px', background: isCritical ? 'rgba(239, 68, 68, 0.25)' : 'rgba(249, 115, 22, 0.25)' }}>
        {isCritical ? (
          <AlertOctagon size={28} color="#ef4444" className="pulse-dot" />
        ) : (
          <AlertTriangle size={28} color="#f97316" />
        )}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            {isCritical ? '🚨 CRITICAL ROCKFALL HAZARD ALERT' : '⚠️ HIGH ROCKFALL RISK WARNING'}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '4px' }}>
            {activeAlert.probability_pct}% Failure Probability
          </span>
        </div>

        <div style={{ fontSize: '0.86rem', lineHeight: 1.4, marginBottom: '8px' }}>
          {activeAlert.advisory}
        </div>

        {/* Immediate Operational Response Checklist */}
        <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', fontSize: '0.78rem', color: isCritical ? '#fca5a5' : '#fed7aa', fontWeight: 500 }}>
          <span>⛔ Halt Bench Haulage Traffic</span>
          <span>📢 Broadcast Radio Evacuation Advisory</span>
          <span>📡 Deploy Real-Time Radar Tracking</span>
        </div>
      </div>

      {onAcknowledge && (
        <button
          type="button"
          onClick={onAcknowledge}
          className="preset-pill-btn"
          style={{
            background: isCritical ? '#7f1d1d' : '#7c2d12',
            borderColor: isCritical ? '#ef4444' : '#f97316',
            color: '#fff',
            padding: '8px 14px'
          }}
        >
          <CheckCircle2 size={16} />
          Acknowledge Alert
        </button>
      )}
    </div>
  );
}
