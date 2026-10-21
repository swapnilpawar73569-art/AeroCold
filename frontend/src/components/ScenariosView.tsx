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
import { CheckCircle2, AlertOctagon, HelpCircle } from 'lucide-react';

export const ScenariosView: React.FC = () => {
  const [scenarios, setScenarios] = useState<ScenariosResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:8000/api/scenarios')
      .then((res) => res.json())
      .then((data) => setScenarios(data))
      .catch((err) => console.error('Failed to load scenarios:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading simulated scenarios from pipeline...
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
    return (
      <div className="glass-panel" style={{ padding: '1.5rem', flex: 1, minWidth: '320px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
          {isFailure ? (
            <AlertOctagon size={22} color="#ef4444" />
          ) : (
            <CheckCircle2 size={22} color="#10b981" />
          )}
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{title}</h3>
        </div>
        <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '1.25rem', minHeight: '38px' }}>
          {description}
        </p>

        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis dataKey="rel_min" stroke="#64748b" fontSize={11} unit="m" />
              <YAxis domain={[2, 10]} stroke="#64748b" fontSize={11} unit="°C" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '11px',
                }}
              />
              <ReferenceArea y1={2.0} y2={8.0} fill="#10b981" fillOpacity={0.08} />
              <ReferenceLine y={8.0} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5} />
              <Line
                type="monotone"
                dataKey="storage_c"
                name="Measured Temp (°C)"
                stroke={isFailure ? '#ea580c' : '#0284c7'}
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
          <div style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: isFailure ? '#ef4444' : '#10b981', fontWeight: 600 }}>
            {data[data.length - 1]?.reason} (End Risk: {data[data.length - 1]?.risk})
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Recovery vs Failure Dynamics</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Comparing thermal disturbance recovery against catastrophic cooling compressor loss
        </p>
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

      <div
        className="glass-panel"
        style={{
          marginTop: '1.5rem',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          background: 'rgba(2, 132, 199, 0.08)',
          borderLeft: '4px solid var(--color-primary)',
        }}
      >
        <HelpCircle size={24} color="#38bdf8" />
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <strong>Core Innovation:</strong> Traditional cold storage alarms trigger whenever temperature momentarily spikes above 7°C (causing alarming fatigue during routine restocking). AeroCold uses physical derivative tracking, door context, and hysteresis rules to recognize that cooling is functional, keeping harmless door openings at <strong>Low Risk</strong> while catching real cooling loss <strong>12+ minutes before</strong> crossing 8°C.
        </div>
      </div>
    </div>
  );
};
