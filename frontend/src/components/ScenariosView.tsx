import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import { ScenariosResponse, ScenarioPoint } from '../types';
import { CheckCircle2, AlertOctagon, HelpCircle, Play, Pause, RotateCcw, ShieldCheck } from 'lucide-react';

export const ScenariosView: React.FC = () => {
  const [scenarios, setScenarios] = useState<ScenariosResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Interactive scrubber state
  const [playbackIndex, setPlaybackIndex] = useState<number>(60);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  useEffect(() => {
    fetch('http://localhost:8000/api/scenarios')
      .then((res) => res.json())
      .then((data) => {
        setScenarios(data);
        const maxLen = Math.max(
          data.door_open_recovery.data.length,
          data.compressor_failure.data.length
        );
        setPlaybackIndex(maxLen);
      })
      .catch((err) => console.error('Failed to load scenarios:', err))
      .finally(() => setLoading(false));
  }, []);

  // Animation player loop
  useEffect(() => {
    let timer: any = null;
    if (isPlaying) {
      timer = setInterval(() => {
        setPlaybackIndex((prev) => {
          if (prev >= 60) {
            setIsPlaying(false);
            return 60;
          }
          return prev + 1;
        });
      }, 300);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading simulated scenarios from physical model...
      </div>
    );
  }

  if (!scenarios) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Scenarios currently unavailable.
      </div>
    );
  }

  const renderScenarioChart = (
    data: ScenarioPoint[],
    title: string,
    description: string,
    isFailure: boolean
  ) => {
    const visibleData = data.slice(0, playbackIndex);
    const currentPoint = visibleData[visibleData.length - 1] || data[0];
    const currentRisk = currentPoint?.risk || 'Low';
    const isHigh = currentRisk === 'High';
    const isMed = currentRisk === 'Medium';

    return (
      <div className="glass-panel" style={{ padding: '1.5rem', flex: 1, minWidth: '340px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {isFailure ? (
              <AlertOctagon size={24} color="#ef4444" />
            ) : (
              <CheckCircle2 size={24} color="#10b981" />
            )}
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{title}</h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {isFailure ? 'Catastrophic Cooling Loss Mode' : 'Transient Routine Disturbance Mode'}
              </div>
            </div>
          </div>

          <span className={`risk-badge ${currentRisk.toLowerCase()}`}>
            {currentRisk} RISK
          </span>
        </div>

        <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '1rem', minHeight: '36px' }}>
          {description}
        </p>

        {/* Live Scrubber Indicator Pill */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.5rem 0.75rem',
            background: 'rgba(0,0,0,0.25)',
            borderRadius: '6px',
            marginBottom: '0.75rem',
            fontSize: '0.8rem',
          }}
        >
          <span>
            Scrub Time: <strong>{currentPoint?.rel_min || 0} min</strong>
          </span>
          <span>
            Chamber: <strong style={{ color: isHigh ? '#ef4444' : isMed ? '#f59e0b' : '#38bdf8' }}>{currentPoint?.storage_c.toFixed(1)}°C</strong>
          </span>
          <span>
            Excursion Prob: <strong>{Math.round((currentPoint?.prob || 0) * 100)}%</strong>
          </span>
        </div>

        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={visibleData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis dataKey="rel_min" stroke="#64748b" fontSize={11} unit="m" domain={[0, 60]} />
              <YAxis domain={[2, 10]} stroke="#64748b" fontSize={11} unit="°C" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  borderColor: '#334155',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '11px',
                }}
              />
              <ReferenceArea y1={2.0} y2={8.0} fill="#10b981" fillOpacity={0.07} />
              <ReferenceLine y={8.0} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5} />
              <Line
                type="monotone"
                dataKey="storage_c"
                name="Measured Temp (°C)"
                stroke={isFailure ? '#ea580c' : '#38bdf8'}
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="true_c"
                name="True Temp (°C)"
                stroke="#64748b"
                strokeDasharray="2 2"
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-card)', paddingTop: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
            Model & Safety Verdict:
          </span>
          <div style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: isHigh ? '#ef4444' : isMed ? '#f59e0b' : '#10b981', fontWeight: 600 }}>
            {currentPoint?.reason}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Recovery vs Failure Trajectories</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Interactive simulation comparing harmless routine disturbances against fatal compressor failure
          </p>
        </div>

        {/* Playback Controls */}
        <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              background: 'var(--color-primary)',
              border: 'none',
              color: '#fff',
              padding: '0.4rem 0.8rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} fill="#fff" />}
            {isPlaying ? 'Pause' : 'Play Timeline'}
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setPlaybackIndex(5);
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-card)',
              color: 'var(--text-muted)',
              padding: '0.4rem 0.6rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <RotateCcw size={13} /> Reset
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', width: '45px' }}>
              {playbackIndex}m
            </span>
            <input
              type="range"
              min="5"
              max="60"
              value={playbackIndex}
              onChange={(e) => {
                setIsPlaying(false);
                setPlaybackIndex(parseInt(e.target.value));
              }}
              style={{ width: '120px', cursor: 'pointer' }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        {renderScenarioChart(
          scenarios.door_open_recovery.data,
          scenarios.door_open_recovery.title,
          scenarios.door_open_recovery.description,
          false
        )}
        {renderScenarioChart(
          scenarios.compressor_failure.data,
          scenarios.compressor_failure.title,
          scenarios.compressor_failure.description,
          true
        )}
      </div>

      {/* Technical Architecture Callout */}
      <div
        className="glass-panel"
        style={{
          marginTop: '1.5rem',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          background: 'linear-gradient(90deg, rgba(2, 132, 199, 0.12), rgba(16, 185, 129, 0.08))',
          borderLeft: '4px solid var(--color-primary)',
        }}
      >
        <ShieldCheck size={28} color="#38bdf8" />
        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <strong style={{ color: '#f8fafc' }}>Why AeroCold Wins Against Traditional Alarms:</strong> Simple threshold systems wait until temperature has already exceeded 8.0°C (spoiling vaccines before staff are alerted). In contrast, naïve linear slopes trigger dozens of false alarms whenever a nurse opens the door for 2 minutes. AeroCold uses hysteresis state awareness and derivative physics to keep door openings at <strong>Low Risk</strong> while sounding a <strong>High Risk</strong> alarm <strong>12.2 minutes in advance</strong> during a true compressor failure.
        </div>
      </div>
    </div>
  );
};
