import React, { useState, useEffect } from 'react';
import { API_BASE } from '../lib/env';
import { Eye, Upload, Camera, CheckCircle, AlertOctagon, Scan, RefreshCw } from 'lucide-react';

export default function CrackInspectionView({
  apiBaseUrl = API_BASE,
  onImportCrackWidth
}) {
  const [samples, setSamples] = useState([]);
  const [selectedSample, setSelectedSample] = useState('critical_shear_crack.jpg');
  const [result, setResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [scaleMm, setScaleMm] = useState(0.25);
  const [uploadFile, setUploadFile] = useState(null);

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/cv/samples`)
      .then(res => res.json())
      .then(data => {
        setSamples(data.samples || []);
      })
      .catch(err => console.error("Error fetching CV samples:", err));

    // Run initial analysis on default sample
    runAnalysis('critical_shear_crack.jpg');
  }, [apiBaseUrl]);

  const runAnalysis = async (sampleId = null, file = null) => {
    setAnalyzing(true);
    try {
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      } else if (sampleId) {
        formData.append('sample_id', sampleId);
      } else {
        formData.append('sample_id', selectedSample);
      }
      formData.append('scale_mm_per_pixel', scaleMm);

      const res = await fetch(`${apiBaseUrl}/api/cv/analyze`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error("CV Analysis failed:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSampleClick = (id) => {
    setSelectedSample(id);
    setUploadFile(null);
    runAnalysis(id);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadFile(file);
      setSelectedSample(null);
      runAnalysis(null, file);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div className="card">
        <div className="card-header" style={{ marginBottom: '14px' }}>
          <div>
            <div className="card-title">
              <Camera size={22} color="var(--primary)" />
              Computer Vision: Slope Discontinuity & Tension Crack Analysis
            </div>
            <div className="card-subtitle">
              Automated image segmentation, skeletonization, and fissure aperture estimation for high-wall slope benches.
            </div>
          </div>
          <span className="brand-badge">Version 3 Advanced</span>
        </div>

        {/* Benchmark Presets & Upload Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div className="preset-pills-bar" style={{ marginBottom: 0 }}>
            <span style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Benchmark Rockfaces:
            </span>
            {samples.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`preset-pill-btn ${selectedSample === s.id ? 'active' : ''}`}
                onClick={() => handleSampleClick(s.id)}
              >
                <Scan size={14} color={selectedSample === s.id ? 'var(--primary)' : 'var(--text-muted)'} />
                {s.name}
              </button>
            ))}
          </div>

          {/* Upload Button */}
          <label className="preset-pill-btn" style={{ cursor: 'pointer', background: '#172554', borderColor: '#2563eb' }}>
            <Upload size={14} color="#60a5fa" />
            <span style={{ color: '#93c5fd' }}>Upload Slope Photo</span>
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
          </label>
        </div>
      </div>

      {/* Visual Analysis Output */}
      {result && (
        <>
          {/* Key Metrics Readout Cards */}
          <div className="grid-4col">
            <div className="stat-card">
              <span className="stat-label">Visual Severity</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="stat-value" style={{ color: result.severity_color }}>
                  {result.visual_severity}
                </span>
                <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                  ({result.visual_hazard_score}%)
                </span>
              </div>
            </div>

            <div className="stat-card">
              <span className="stat-label">Max Tension Crack Aperture</span>
              <div className="stat-value-group">
                <span className="stat-value" style={{ color: '#f59e0b' }}>{result.max_width_mm}</span>
                <span className="stat-unit">mm</span>
              </div>
            </div>

            <div className="stat-card">
              <span className="stat-label">Detected Fissure Segments</span>
              <div className="stat-value-group">
                <span className="stat-value" style={{ color: '#38bdf8' }}>{result.crack_count}</span>
                <span className="stat-unit">fractures</span>
              </div>
            </div>

            <div className="stat-card">
              <span className="stat-label">Fracture Surface Density</span>
              <div className="stat-value-group">
                <span className="stat-value" style={{ color: '#ec4899' }}>{result.fracture_density_pct}</span>
                <span className="stat-unit">%</span>
              </div>
            </div>
          </div>

          {/* Dual Frame Image Viewer */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Eye size={18} color="var(--primary)" />
                Side-by-Side Geological Inspection & Crack Extraction
              </div>
              {onImportCrackWidth && (
                <button
                  type="button"
                  className="preset-pill-btn"
                  onClick={() => onImportCrackWidth(result.max_width_mm)}
                  style={{ background: 'rgba(56, 189, 248, 0.15)', borderColor: 'var(--primary)', color: '#fff' }}
                >
                  <CheckCircle size={14} color="var(--primary)" />
                  Import Crack Width ({result.max_width_mm}mm) to ML Prediction
                </button>
              )}
            </div>

            <div className="cv-viewer-grid">
              {/* Original Bench Image */}
              <div className="cv-frame">
                <div className="cv-frame-header">
                  <span>RAW BENCH ROCKFACE PHOTO</span>
                  <span>Input Telemetry</span>
                </div>
                <div className="cv-img-container">
                  <img src={result.original_image} alt="Original photograph of the inspected rock bench" />
                </div>
              </div>

              {/* Annotated / AI Segmented Image */}
              <div className="cv-frame">
                <div className="cv-frame-header">
                  <span style={{ color: 'var(--primary)' }}>AI CRACK EXTRACTION & SKELETONIZATION</span>
                  <span style={{ color: result.severity_color }}>{result.visual_severity} RISK</span>
                </div>
                <div className="cv-img-container">
                  <img src={result.annotated_image} alt="Same bench with detected cracks outlined and measured" />
                </div>
              </div>
            </div>

            <div style={{ marginTop: '16px', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Cyan lines indicate detected fracture skeletons; orange boxes mark high-dilation tension fissures.</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>Scale: {scaleMm} mm/pixel</span>
            </div>
          </div>
        </>
      )}

      {analyzing && (
        <div className="card" style={{ textAlign: 'center', padding: '50px' }}>
          <RefreshCw className="pulse-dot" size={24} style={{ margin: '0 auto 12px auto' }} />
          <p style={{ color: 'var(--text-muted)' }}>Processing Computer Vision Edge Filters & Morphology...</p>
        </div>
      )}
    </div>
  );
}
