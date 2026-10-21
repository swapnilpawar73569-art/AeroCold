import React, { useState, useEffect } from 'react';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  Table,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { DatasetSample, DatasetUploadResult, Reading } from '../types';

interface DatasetUploadViewProps {
  onRefreshFleet?: () => void;
  onSelectUnit?: (unit: string) => void;
}

export const DatasetUploadView: React.FC<DatasetUploadViewProps> = ({
  onRefreshFleet,
  onSelectUnit,
}) => {
  const [samples, setSamples] = useState<Record<string, DatasetSample>>({});
  const [pasteContent, setPasteContent] = useState<string>('');
  const [uploadResult, setUploadResult] = useState<DatasetUploadResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  useEffect(() => {
    fetch('http://localhost:8000/api/dataset/samples')
      .then((res) => res.json())
      .then((data) => setSamples(data))
      .catch((err) => console.error('Failed to load dataset samples:', err));
  }, []);

  const handleProcessText = async (text: string) => {
    if (!text.trim()) return;
    setIsProcessing(true);
    setStatusMessage('Analyzing and scoring batch telemetry through causal ML pipeline...');

    try {
      const res = await fetch('http://localhost:8000/api/dataset/upload-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        const data: DatasetUploadResult = await res.json();
        setUploadResult(data);
        setStatusMessage(`Successfully scored ${data.rows_processed} readings!`);
        onRefreshFleet?.();
      } else {
        setStatusMessage('Server error parsing telemetry batch.');
      }
    } catch (err) {
      setStatusMessage('Network error submitting dataset.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setPasteContent(content);
        handleProcessText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleLoadSample = (sampleKey: string) => {
    const sample = samples[sampleKey];
    if (sample) {
      setPasteContent(sample.content);
      handleProcessText(sample.content);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '1.5rem 2rem',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85))',
          border: '1px solid rgba(2, 132, 199, 0.4)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
            <span
              style={{
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                borderRadius: '6px',
                padding: '0.2rem 0.5rem',
                fontSize: '0.75rem',
                fontWeight: 800,
                letterSpacing: '0.05em',
              }}
            >
              DATASET & STREAM INGESTION
            </span>
            <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>
              ● Causal LightGBM Batch Scorer
            </span>
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc' }}>
            Live Dataset & Telemetry Log Uploader
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '720px' }}>
            Upload raw CSV log files or standard AC protocol telemetry lines. AeroCold parses,
            evaluates multi-scale window features, and populates the SQLite audit database in real time.
          </p>
        </div>
      </div>

      {/* 3 Pre-Loaded 1-Click Clinical Samples */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Sparkles size={18} color="#38bdf8" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>
            1-Click Pre-Built Demonstration Datasets
          </h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Instantly evaluate real-world clinical cold-chain scenarios without needing to manually upload files:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {/* Sample 1: WHO */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border-card)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <strong style={{ color: '#f8fafc', fontSize: '0.95rem' }}>
                  WHO Vaccine Stress Test
                </strong>
                <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 700 }}>25 READINGS</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Equatorial 39°C ambient load with gradual compressor thermal creep, moving from Low to Medium early warning.
              </p>
            </div>
            <button
              onClick={() => handleLoadSample('who_stress_test')}
              disabled={isProcessing}
              style={{
                background: 'rgba(2, 132, 199, 0.2)',
                color: '#38bdf8',
                border: '1px solid rgba(2, 132, 199, 0.4)',
                padding: '0.5rem',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
              }}
            >
              <Play size={13} fill="#38bdf8" /> Load & Score WHO Dataset
            </button>
          </div>

          {/* Sample 2: Drone */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border-card)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <strong style={{ color: '#f8fafc', fontSize: '0.95rem' }}>
                  Drone Battery Power Loss
                </strong>
                <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700 }}>20 READINGS</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Simulates in-flight power cut on Unit U2, triggering immediate K=3 critical alarm before auxiliary recovery.
              </p>
            </div>
            <button
              onClick={() => handleLoadSample('drone_power_failure')}
              disabled={isProcessing}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                padding: '0.5rem',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
              }}
            >
              <Play size={13} fill="#ef4444" /> Load & Score Drone Dataset
            </button>
          </div>

          {/* Sample 3: Hospital Restocking */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border-card)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <strong style={{ color: '#f8fafc', fontSize: '0.95rem' }}>
                  Hospital Door Restocking Log
                </strong>
                <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700 }}>18 READINGS</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Multi-vial access log demonstrating how the thermodynamic safety layer suppresses false alarms during recovery.
              </p>
            </div>
            <button
              onClick={() => handleLoadSample('hospital_restocking')}
              disabled={isProcessing}
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                padding: '0.5rem',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
              }}
            >
              <Play size={13} fill="#10b981" /> Load & Score Hospital Log
            </button>
          </div>
        </div>
      </div>

      {/* Drag & Drop Zone and Text Paste Area */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 1.5fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left: Drag & Drop Dropzone */}
        <div
          className="glass-panel"
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          style={{
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            border: dragActive ? '2px dashed #38bdf8' : '2px dashed var(--border-card)',
            background: dragActive ? 'rgba(2, 132, 199, 0.15)' : 'rgba(255,255,255,0.02)',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.csv,.txt,.log';
            input.onchange = (e: any) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            };
            input.click();
          }}
        >
          <Upload size={36} color="#38bdf8" style={{ margin: '0 auto 1rem' }} />
          <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.35rem' }}>
            Drag & Drop CSV / Telemetry File
          </h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Supports standard CSVs with columns (unit, ts, temp, ambient, door, cooling) or AC|... line format
          </p>
          <span
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-card)',
              padding: '0.45rem 1rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            Browse Local File
          </span>
        </div>

        {/* Right: Raw Telemetry Paste Area */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Or Paste Raw CSV / AC Stream Content:</span>
            {pasteContent && (
              <button
                onClick={() => setPasteContent('')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-dim)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                Clear
              </button>
            )}
          </div>

          <textarea
            rows={7}
            value={pasteContent}
            onChange={(e) => setPasteContent(e.target.value)}
            placeholder="unit_id,ts,storage_c,ambient_c,door,cooling&#10;U1,1760000000,4.2,28.0,0,1&#10;U1,1760000060,5.1,28.0,1,1&#10;or AC|U2|1760000000|5.0|32|0|0..."
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-light)',
              borderRadius: '8px',
              color: '#fff',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              outline: 'none',
              resize: 'vertical',
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: isProcessing ? '#38bdf8' : '#10b981' }}>
              {statusMessage || 'Ready for ingestion.'}
            </span>
            <button
              onClick={() => handleProcessText(pasteContent)}
              disabled={isProcessing || !pasteContent.trim()}
              style={{
                background: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                padding: '0.5rem 1.25rem',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: isProcessing || !pasteContent.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {isProcessing ? 'Processing...' : 'Score Batch Telemetry'}
            </button>
          </div>
        </div>
      </div>

      {/* Upload Scoring Results Card & Table */}
      {uploadResult && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 800 }}>BATCH INGESTION COMPLETE</span>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                Processed {uploadResult.rows_processed} Readings Across Units: {uploadResult.units_affected.join(', ')}
              </h3>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {uploadResult.units_affected.map((u) => (
                <button
                  key={u}
                  onClick={() => onSelectUnit?.(u)}
                  style={{
                    background: 'rgba(2, 132, 199, 0.2)',
                    color: '#38bdf8',
                    border: '1px solid rgba(2, 132, 199, 0.4)',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  View {u} in Monitor <ArrowRight size={13} />
                </button>
              ))}
            </div>
          </div>

          {/* Metric Summary Badges */}
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
              <span>High Risk Excursions: <strong>{uploadResult.metrics.high_risk_alerts}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
              <span>Medium Risk Warnings: <strong>{uploadResult.metrics.medium_warning_alerts}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
              <span>Normal Readings: <strong>{uploadResult.metrics.normal_readings}</strong></span>
            </div>
          </div>

          {/* Sample Readings Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-card)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.5rem' }}>Unit</th>
                  <th style={{ padding: '0.5rem' }}>Timestamp</th>
                  <th style={{ padding: '0.5rem' }}>Chamber Temp</th>
                  <th style={{ padding: '0.5rem' }}>Ambient</th>
                  <th style={{ padding: '0.5rem' }}>Door</th>
                  <th style={{ padding: '0.5rem' }}>Cooling</th>
                  <th style={{ padding: '0.5rem' }}>Excursion Risk</th>
                  <th style={{ padding: '0.5rem' }}>Diagnosis Explanation</th>
                </tr>
              </thead>
              <tbody>
                {uploadResult.sample_readings.map((r, i) => {
                  const risk = r.risk_level || r.risk || 'Low';
                  const isHigh = risk === 'High';
                  const isMed = risk === 'Medium';
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '0.5rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                        {r.unit_id || r.unit}
                      </td>
                      <td style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>
                        {r.ts}
                      </td>
                      <td style={{ padding: '0.5rem', fontWeight: 700, color: isHigh ? '#ef4444' : isMed ? '#f59e0b' : '#38bdf8' }}>
                        {r.storage_c.toFixed(1)}°C
                      </td>
                      <td style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>
                        {r.ambient_c.toFixed(1)}°C
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        {r.door === 1 ? <span style={{ color: '#f59e0b', fontWeight: 700 }}>OPEN</span> : 'Closed'}
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        {r.cooling === 1 ? <span style={{ color: '#10b981', fontWeight: 700 }}>ON</span> : <span style={{ color: '#ef4444', fontWeight: 700 }}>OFF</span>}
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <span className={`risk-badge ${risk.toLowerCase()}`}>
                          {risk} ({Math.round(r.prob * 100)}%)
                        </span>
                      </td>
                      <td style={{ padding: '0.5rem', color: 'var(--text-main)', maxWidth: '320px' }}>
                        {r.explanation}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
