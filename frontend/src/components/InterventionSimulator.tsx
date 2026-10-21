import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Thermometer,
  Layers,
  Clock,
  DollarSign,
  Zap,
} from 'lucide-react';
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
  Legend,
} from 'recharts';
import { InterventionResult } from '../types';

interface InterventionSimulatorProps {
  selectedUnit: string;
  onSelectUnit: (unit: string) => void;
  unitsList: string[];
}

export const InterventionSimulator: React.FC<InterventionSimulatorProps> = ({
  selectedUnit,
  onSelectUnit,
  unitsList,
}) => {
  const [activeAction, setActiveAction] = useState<string>('dry_ice');
  const [simulationData, setSimulationData] = useState<InterventionResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchSimulation = async (unit: string, action: string) => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/intervention/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit_id: unit,
          action_type: action,
          cargo_value_usd: 128400,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSimulationData(data);
      }
    } catch (e) {
      console.error('Simulation error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSimulation(selectedUnit, activeAction);
  }, [selectedUnit, activeAction]);

  // Combine trajectories for Recharts
  const chartData =
    simulationData?.counterfactual_status_quo.map((sq, idx) => {
      const mit = simulationData.counterfactual_mitigated[idx];
      return {
        minute: `+${sq.minute}m`,
        rawMinute: sq.minute,
        statusQuo: sq.temp,
        mitigated: mit ? mit.temp : null,
      };
    }) || [];

  const actions = [
    {
      id: 'dry_ice',
      icon: '🧊',
      name: 'Add Dry Ice Pack',
      desc: 'Rapidly absorbs chamber heat (-0.35°C/min drop)',
      tag: 'Fastest Cooling',
    },
    {
      id: 'compressor_boost',
      icon: '⚡',
      name: 'Restart Compressor',
      desc: 'Powers on auxiliary cooling unit to recover nominal 4°C',
      tag: 'Standard Recovery',
    },
    {
      id: 'divert_hub',
      icon: '🏥',
      name: 'Divert to Cold Vault',
      desc: 'Reroutes transport to nearest hospital cold bay (12 min)',
      tag: 'Safe Handoff',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Clean Header */}
      <div
        className="glass-panel"
        style={{
          padding: '1.25rem 1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <Sparkles size={18} color="#38bdf8" />
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
              Action Co-Pilot & What-If Simulator
            </h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
            Compare what happens <strong>with</strong> and <strong>without</strong> taking action on warming units.
          </p>
        </div>

        {/* Simple Unit Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Chamber:</span>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {['U1', 'U2', 'U3', 'U4', 'U5'].map((u) => {
              const isSelected = selectedUnit === u;
              const isWarning = u === 'U2';
              return (
                <button
                  key={u}
                  onClick={() => onSelectUnit(u)}
                  style={{
                    background: isSelected
                      ? '#38bdf8'
                      : isWarning
                      ? 'rgba(239, 68, 68, 0.2)'
                      : 'rgba(255, 255, 255, 0.06)',
                    color: isSelected ? '#0f172a' : isWarning ? '#fca5a5' : '#e2e8f0',
                    border: isSelected
                      ? '1px solid #38bdf8'
                      : isWarning
                      ? '1px solid rgba(239, 68, 68, 0.5)'
                      : '1px solid var(--border-card)',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  {u} {isWarning && !isSelected ? '⚠️' : ''}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="glass-panel metric-card" style={{ padding: '1rem 1.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>EXCURSION OUTCOME</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
            <CheckCircle2 size={20} /> PREVENTED
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Stays within safe 2.0 – 8.0°C</span>
        </div>

        <div className="glass-panel metric-card" style={{ padding: '1rem 1.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>WITHOUT ACTION (BREACH)</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ef4444', marginTop: '0.2rem' }}>
            {simulationData?.time_to_breach_status_quo_min ? `~${simulationData.time_to_breach_status_quo_min} min` : '6 min'}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#fca5a5' }}>Projected 8.0°C limit violation</span>
        </div>

        <div className="glass-panel metric-card" style={{ padding: '1rem 1.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>LEAD TIME GAINED</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#38bdf8', marginTop: '0.2rem' }}>
            +{simulationData?.time_saved_minutes || 240} min
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>+4 hours safe transport window</span>
        </div>

        <div className="glass-panel metric-card" style={{ padding: '1rem 1.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>CARGO PROTECTED</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10b981', marginTop: '0.2rem' }}>
            $128,400
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vaccines & insulin saved</span>
        </div>
      </div>

      {/* Main Simulation View: 3 Action Buttons on Left, Trajectory Graph on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) 2fr', gap: '1.25rem', alignItems: 'start' }}>
        {/* Left: 3 Simple Action Buttons */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 0.2rem 0' }}>Select Corrective Action:</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              Click an action to see its immediate effect on the thermal trajectory:
            </p>
          </div>

          {actions.map((act) => {
            const isAct = activeAction === act.id;
            return (
              <div
                key={act.id}
                onClick={() => setActiveAction(act.id)}
                style={{
                  padding: '0.9rem 1rem',
                  borderRadius: '8px',
                  background: isAct ? 'rgba(2, 132, 199, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                  border: isAct ? '2px solid #38bdf8' : '1px solid var(--border-card)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.92rem', color: isAct ? '#38bdf8' : '#f8fafc' }}>
                    {act.icon} {act.name}
                  </span>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      background: isAct ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)',
                      color: isAct ? '#0f172a' : '#94a3b8',
                      padding: '0.1rem 0.35rem',
                      borderRadius: '4px',
                    }}
                  >
                    {act.tag}
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                  {act.desc}
                </p>
              </div>
            );
          })}

          <div
            style={{
              padding: '0.75rem',
              borderRadius: '6px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              fontSize: '0.78rem',
              color: '#a7f3d0',
              marginTop: '0.5rem',
            }}
          >
            <strong>Summary:</strong> Taking this action safely counters thermal runaway and keeps chamber temperature inside 2.0°C – 8.0°C.
          </div>
        </div>

        {/* Right: Clean Trajectory Chart */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
                Trajectory Comparison (Next 30 Minutes)
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                Red Line = No Action (Breach) • Green Line = With Action (Cooled)
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#ef4444' }}>
                <span style={{ width: 12, height: 3, background: '#ef4444', borderRadius: 2 }} /> No Action
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#10b981' }}>
                <span style={{ width: 12, height: 3, background: '#10b981', borderRadius: 2 }} /> With Action
              </span>
            </div>
          </div>

          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="minute" stroke="#64748b" fontSize={11} />
                <YAxis domain={[2, 10]} stroke="#64748b" fontSize={11} unit="°C" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                  formatter={(val: any) => [`${Number(val).toFixed(2)}°C`]}
                />

                {/* Safe Band 2 - 8 C */}
                <ReferenceArea
                  y1={2.0}
                  y2={8.0}
                  fill="#10b981"
                  fillOpacity={0.08}
                  label={{
                    value: 'Safe 2-8°C Regulatory Zone',
                    position: 'insideTopLeft',
                    fill: '#10b981',
                    fontSize: 11,
                    opacity: 0.8,
                  }}
                />

                {/* 8.0 C Threshold */}
                <ReferenceLine
                  y={8.0}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: '8.0°C Limit',
                    position: 'insideTopRight',
                    fill: '#ef4444',
                    fontSize: 11,
                  }}
                />

                {/* Status Quo (Unmitigated) */}
                <Line
                  type="monotone"
                  dataKey="statusQuo"
                  name="Without Action"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#ef4444' }}
                />

                {/* Mitigated (With Action) */}
                <Line
                  type="monotone"
                  dataKey="mitigated"
                  name="With Action"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 3.5, fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
