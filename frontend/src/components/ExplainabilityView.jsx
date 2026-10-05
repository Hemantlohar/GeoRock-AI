import React from 'react';
import { HelpCircle, TrendingUp, TrendingDown, Info } from 'lucide-react';

export default function ExplainabilityView({ prediction }) {
  if (!prediction || !prediction.feature_contributions) {
    return null;
  }

  const { feature_contributions = [], key_risk_factors = [] } = prediction;

  // Compute maximum absolute SHAP value for scaling bars
  const maxShap = Math.max(...feature_contributions.map(f => Math.abs(f.shap_impact)), 0.1);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">
            <HelpCircle size={20} color="var(--primary)" />
            Explainable AI (SHAP): Model Decision Attribution
          </div>
          <div className="card-subtitle">
            Local feature attribution (TreeExplainer) revealing why the AI assigned this rockfall risk probability.
          </div>
        </div>
      </div>

      {/* High-level Summary Callout */}
      <div style={{ background: '#090e1b', padding: '16px 20px', borderRadius: '10px', border: '1px solid var(--border-subtle)', marginBottom: '22px' }}>
        <div style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Info size={14} />
          Primary Geotechnical Drivers
        </div>
        <ul style={{ listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {key_risk_factors.map((factor, idx) => (
            <li key={idx} style={{ fontSize: '0.86rem', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#f97316' }}>⚠️</span>
              {factor}
            </li>
          ))}
        </ul>
      </div>

      {/* SHAP Factor Impact Bars */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '12px', padding: '0 4px' }}>
          <span>Monitoring Parameter</span>
          <span>SHAP Impact (Log-Odds Contribution)</span>
        </div>

        {feature_contributions.map((item, idx) => {
          const pctWidth = Math.min(100, Math.round((Math.abs(item.shap_impact) / maxShap) * 100));
          const isPositive = item.is_destabilizing;

          return (
            <div key={idx} className="shap-factor-row">
              {/* Feature Name & Current Value */}
              <div style={{ width: '220px', display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: '#f8fafc', fontWeight: 500 }}>{item.display_name}</span>
                <span style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  {item.value} {item.unit}
                </span>
              </div>

              {/* Visual Bar */}
              <div className="shap-bar-track">
                <div
                  className={`shap-bar-fill ${isPositive ? 'destabilizing' : 'stabilizing'}`}
                  style={{ width: `${pctWidth}%` }}
                />
              </div>

              {/* Numeric Attribution */}
              <div style={{ width: '130px', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                {isPositive ? (
                  <>
                    <TrendingUp size={14} color="#ef4444" />
                    <span style={{ fontFamily: 'var(--font-mono)', color: '#ef4444', fontWeight: 600 }}>
                      +{item.shap_impact.toFixed(3)}
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingDown size={14} color="#10b981" />
                    <span style={{ fontFamily: 'var(--font-mono)', color: '#10b981', fontWeight: 600 }}>
                      {item.shap_impact.toFixed(3)}
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#ef4444' }}></span>
          Destabilizing (Pushes probability toward failure)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#10b981' }}></span>
          Stabilizing (Resisting shear / dampening risk)
        </span>
      </div>
    </div>
  );
}
