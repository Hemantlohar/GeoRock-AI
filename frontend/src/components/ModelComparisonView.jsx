import React, { useState, useEffect } from 'react';
import { API_BASE } from '../lib/env';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts';
import { Award, CheckCircle2, GitCompare, Cpu, ShieldAlert } from 'lucide-react';

export default function ModelComparisonView({ apiBaseUrl = API_BASE }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/model-comparison`)
      .then(res => {
        if (!res.ok) throw new Error("Could not fetch model benchmark data");
        return res.json();
      })
      .then(d => {
        setData(d.models);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [apiBaseUrl]);

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading AI Model Benchmark Comparison...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card" style={{ padding: '30px', color: '#ef4444' }}>
        Failed to load model comparison: {error}
      </div>
    );
  }

  // Format data for Recharts metric bar chart
  const metricComparisonData = [
    {
      metric: 'Accuracy (%)',
      XGBoost: data['XGBoost']?.accuracy || 0,
      'Random Forest': data['Random Forest']?.accuracy || 0,
      'Logistic Regression': data['Logistic Regression']?.accuracy || 0
    },
    {
      metric: 'Precision (%)',
      XGBoost: data['XGBoost']?.precision || 0,
      'Random Forest': data['Random Forest']?.precision || 0,
      'Logistic Regression': data['Logistic Regression']?.precision || 0
    },
    {
      metric: 'Recall (%)',
      XGBoost: data['XGBoost']?.recall || 0,
      'Random Forest': data['Random Forest']?.recall || 0,
      'Logistic Regression': data['Logistic Regression']?.recall || 0
    },
    {
      metric: 'F1-Score (%)',
      XGBoost: data['XGBoost']?.f1_score || 0,
      'Random Forest': data['Random Forest']?.f1_score || 0,
      'Logistic Regression': data['Logistic Regression']?.f1_score || 0
    }
  ];

  // Combine ROC curves
  const xRoc = data['XGBoost']?.roc_curve || [];
  const rfRoc = data['Random Forest']?.roc_curve || [];
  const lrRoc = data['Logistic Regression']?.roc_curve || [];

  const combinedRoc = xRoc.map((pt, i) => ({
    fpr: pt.fpr,
    XGBoost: pt.tpr,
    'Random Forest': rfRoc[i]?.tpr || pt.tpr,
    'Logistic Regression': lrRoc[i]?.tpr || pt.tpr,
    Baseline: pt.fpr
  }));

  // Global Feature Importance of XGBoost
  const xgbImportance = data['XGBoost']?.feature_importance || {};
  const importanceData = Object.entries(xgbImportance).map(([feat, score]) => ({
    feature: feat.replace('_mm', '').replace('_deg', '').replace('_kpa', '').replace('_day', '').replace('_s', ''),
    importance: Math.round(score * 1000) / 10
  })).sort((a, b) => b.importance - a.importance);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div className="card">
        <div className="card-header" style={{ marginBottom: '14px' }}>
          <div>
            <div className="card-title">
              <GitCompare size={22} color="var(--primary)" />
              Research Evaluation: Multi-Model Benchmark Comparison
            </div>
            <div className="card-subtitle">
              Empirical comparison of primary XGBoost versus Random Forest and Logistic Regression on open-pit slope failure events.
            </div>
          </div>
          <span className="brand-badge">Version 2 Research</span>
        </div>
      </div>

      {/* Model Metric Cards */}
      <div className="grid-3col">
        {['XGBoost', 'Random Forest', 'Logistic Regression'].map((modelName) => {
          const m = data[modelName] || {};
          const isPrimary = modelName === 'XGBoost';

          return (
            <div
              key={modelName}
              className="card"
              style={{
                borderColor: isPrimary ? 'var(--primary)' : 'var(--border-subtle)',
                background: isPrimary ? 'linear-gradient(180deg, #101c36 0%, #0d1527 100%)' : 'var(--bg-card)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Cpu size={18} color={isPrimary ? 'var(--primary)' : 'var(--text-muted)'} />
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: '#fff' }}>
                    {modelName}
                  </span>
                </div>
                {isPrimary && (
                  <span style={{ fontSize: '0.68rem', background: 'rgba(56,189,248,0.15)', color: 'var(--primary)', padding: '3px 8px', borderRadius: '999px', fontFamily: 'var(--font-mono)' }}>
                    Primary Model
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div className="stat-card">
                  <span className="stat-label">Accuracy</span>
                  <span className="stat-value" style={{ color: '#38bdf8' }}>{m.accuracy}%</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">ROC-AUC</span>
                  <span className="stat-value" style={{ color: '#a855f7' }}>{m.roc_auc}</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Precision</span>
                  <span className="stat-value" style={{ color: '#10b981' }}>{m.precision}%</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Recall / F1</span>
                  <span className="stat-value" style={{ color: '#f59e0b' }}>{m.f1_score}%</span>
                </div>
              </div>

              {/* Confusion Matrix Mini Table */}
              <div style={{ background: '#090e1b', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Confusion Matrix (Test Set N=700)
                </div>
                {m.confusion_matrix && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                    <div style={{ background: '#131e33', padding: '6px', borderRadius: '4px' }}>
                      <div style={{ color: 'var(--text-dim)', fontSize: '0.65rem' }}>True Neg</div>
                      <div style={{ color: '#10b981', fontWeight: 600 }}>{m.confusion_matrix[0][0]}</div>
                    </div>
                    <div style={{ background: '#131e33', padding: '6px', borderRadius: '4px' }}>
                      <div style={{ color: 'var(--text-dim)', fontSize: '0.65rem' }}>False Pos</div>
                      <div style={{ color: '#ef4444', fontWeight: 600 }}>{m.confusion_matrix[0][1]}</div>
                    </div>
                    <div style={{ background: '#131e33', padding: '6px', borderRadius: '4px' }}>
                      <div style={{ color: 'var(--text-dim)', fontSize: '0.65rem' }}>False Neg</div>
                      <div style={{ color: '#ef4444', fontWeight: 600 }}>{m.confusion_matrix[1][0]}</div>
                    </div>
                    <div style={{ background: '#131e33', padding: '6px', borderRadius: '4px' }}>
                      <div style={{ color: 'var(--text-dim)', fontSize: '0.65rem' }}>True Pos</div>
                      <div style={{ color: '#10b981', fontWeight: 600 }}>{m.confusion_matrix[1][1]}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recharts Visual Comparison Grid */}
      <div className="grid-2col">
        {/* Metric Bar Chart */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Comparative Performance Metrics</div>
          </div>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer>
              <BarChart data={metricComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="metric" stroke="#8696ae" tick={{ fontSize: 11 }} />
                <YAxis domain={[60, 100]} stroke="#8696ae" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Bar dataKey="XGBoost" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Random Forest" fill="#818cf8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Logistic Regression" fill="#34d399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ROC Curves */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">ROC Characteristic Curves</div>
          </div>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer>
              <LineChart data={combinedRoc} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="fpr" stroke="#8696ae" tick={{ fontSize: 11 }} label={{ value: 'False Positive Rate', position: 'insideBottom', offset: -4, fill: '#8696ae', fontSize: 10 }} />
                <YAxis domain={[0, 1]} stroke="#8696ae" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Line type="monotone" dataKey="XGBoost" stroke="#38bdf8" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="Random Forest" stroke="#818cf8" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Logistic Regression" stroke="#34d399" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Baseline" stroke="#475569" strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Feature Importance Rankings */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Global Feature Importance (XGBoost Gini Impurity Reduction)</div>
            <div className="card-subtitle">Relative contribution of monitoring variables across 3,500 geotechnical slope training cases.</div>
          </div>
        </div>

        <div style={{ width: '100%', height: '280px' }}>
          <ResponsiveContainer>
            <BarChart data={importanceData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis type="number" stroke="#8696ae" tick={{ fontSize: 11 }} unit="%" />
              <YAxis dataKey="feature" type="category" stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
              <Bar dataKey="importance" fill="#38bdf8" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
