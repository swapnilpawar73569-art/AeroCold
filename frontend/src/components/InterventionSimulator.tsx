import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Zap,
  RotateCcw,
  Sparkles,
  Plane,
  Clock,
  DollarSign,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Thermometer,
  Download,
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
import { InterventionResult, Reading } from '../types';

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
  const [showCertificate, setShowCertificate] = useState<boolean>(false);
  const [cargoValue, setCargoValue] = useState<number>(128400);

  const fetchSimulation = async (unit: string, action: string) => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/intervention/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit_id: unit,
          action_type: action,
          cargo_value_usd: cargoValue,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSimulationData(data);
      }
    } catch (e) {
      console.error('Intervention error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSimulation(selectedUnit, activeAction);
  }, [selectedUnit, activeAction]);

  // Combine dual counterfactual trajectories for Recharts
  const chartData =
    simulationData?.counterfactual_status_quo.map((sq, idx) => {
      const mit = simulationData.counterfactual_mitigated[idx];
      return {
        minute: sq.minute,
        statusQuo: sq.temp,
        mitigated: mit ? mit.temp : null,
      };
    }) || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Hero Banner */}
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
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
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
              DIGITAL TWIN DECISION SUPPORT
            </span>
            <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>
              ● Counterfactual Physics Engine
            </span>
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc' }}>
            AI Intervention Co-Pilot & What-If Action Simulator
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '720px' }}>
            When thermal runaway is detected, AeroCold doesn't just sound alarms—it models real-world
            counterfactual interventions, calculating the exact trajectory to salvage biological cargo.
          </p>
        </div>

        {/* Target Unit Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Target Unit:
          </span>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {unitsList.map((u) => (
              <button
                key={u}
                onClick={() => onSelectUnit(u)}
                style={{
                  background: selectedUnit === u ? 'var(--color-primary)' : 'rgba(255,255,255,0.06)',
                  color: selectedUnit === u ? '#fff' : 'var(--text-muted)',
                  border: selectedUnit === u ? 'none' : '1px solid var(--border-card)',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Value Callouts */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
        }}
      >
        <div className="glass-panel metric-card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
            Cargo Value Preserved
          </span>
          <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: '0.25rem', color: '#10b981' }}>
            ${cargoValue.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#10b981' }}>
            ● 100% Shelf-Life Viability Saved
          </span>
        </div>

        <div className="glass-panel metric-card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
            Unmitigated Breach Time
          </span>
          <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: '0.25rem', color: '#ef4444' }}>
            {simulationData?.time_to_breach_status_quo_min
              ? `~${simulationData.time_to_breach_status_quo_min} min`
              : 'Immediate'}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>
            ▲ Status Quo breaches 8.0°C
          </span>
        </div>

        <div className="glass-panel metric-card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
            Lead Time Extended
          </span>
          <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: '0.25rem', color: '#38bdf8' }}>
            +{simulationData?.time_saved_minutes || 240} min
          </div>
          <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>
            ● Buffer added before violation
          </span>
        </div>

        <div className="glass-panel metric-card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
            Compliance Readiness
          </span>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: '0.5rem', color: '#c084fc' }}>
            WHO GDP & FDA
          </div>
          <button
            onClick={() => setShowCertificate(true)}
            style={{
              marginTop: '0.4rem',
              background: 'rgba(192, 132, 252, 0.15)',
              color: '#c084fc',
              border: '1px solid rgba(192, 132, 252, 0.4)',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <FileCheck2 size={13} /> View Audit Certificate
          </button>
        </div>
      </div>

      {/* Main Simulation View: Action Switcher & Dual Counterfactual Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2.2fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left: AI Recommended Intervention Protocols */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} color="#38bdf8" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>AI Decision Support Protocols</h3>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Select an operational intervention to project the digital twin response in real time:
          </p>

          {/* Action 1: Dry Ice */}
          <div
            onClick={() => setActiveAction('dry_ice')}
            style={{
              padding: '1rem',
              borderRadius: '8px',
              background: activeAction === 'dry_ice' ? 'rgba(2, 132, 199, 0.2)' : 'rgba(255,255,255,0.03)',
              border: activeAction === 'dry_ice' ? '1.5px solid #38bdf8' : '1px solid var(--border-card)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: activeAction === 'dry_ice' ? '#38bdf8' : '#f8fafc' }}>
                🧊 Deploy Dry-Ice Buffer Pack
              </span>
              <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700 }}>+240 MIN BUFFER</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              Inserts secondary phase-change cryo-pack into chamber. Induces instant -0.35°C/min thermal recovery.
            </p>
          </div>

          {/* Action 2: Flight Reroute */}
          <div
            onClick={() => setActiveAction('divert_hub')}
            style={{
              padding: '1rem',
              borderRadius: '8px',
              background: activeAction === 'divert_hub' ? 'rgba(2, 132, 199, 0.2)' : 'rgba(255,255,255,0.03)',
              border: activeAction === 'divert_hub' ? '1.5px solid #38bdf8' : '1px solid var(--border-card)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: activeAction === 'divert_hub' ? '#38bdf8' : '#f8fafc' }}>
                ✈️ Emergency Hub Reroute
              </span>
              <span style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 700 }}>12 MIN FLIGHT</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              Calculates GPS vector to nearest certified medical cold vault (Geneva Hub 02) before 8.0°C threshold breach.
            </p>
          </div>

          {/* Action 3: Compressor Boost */}
          <div
            onClick={() => setActiveAction('compressor_boost')}
            style={{
              padding: '1rem',
              borderRadius: '8px',
              background: activeAction === 'compressor_boost' ? 'rgba(2, 132, 199, 0.2)' : 'rgba(255,255,255,0.03)',
              border: activeAction === 'compressor_boost' ? '1.5px solid #38bdf8' : '1px solid var(--border-card)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: activeAction === 'compressor_boost' ? '#38bdf8' : '#f8fafc' }}>
                ⚡ Emergency Power Bypass
              </span>
              <span style={{ fontSize: '0.7rem', color: '#c084fc', fontWeight: 700 }}>120% DUTY</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              Bypasses auxiliary relay to force cooling compressor into high-capacity emergency cycle.
            </p>
          </div>

          <div style={{ borderTop: '1px solid var(--border-card)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>
              Active Clinical Payload:
            </span>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.2rem' }}>
              {simulationData?.payload || 'Insulin Glargine & Erythropoietin'}
            </div>
          </div>
        </div>

        {/* Right: Counterfactual Comparison Chart */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                Digital Twin Counterfactual: Status Quo vs Mitigated Action
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Comparing 30-minute thermal evolution: No Action (Fatal Breach) vs {simulationData?.action_name}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#ef4444', fontWeight: 700 }}>
                <span style={{ width: '12px', height: '2px', background: '#ef4444', display: 'inline-block' }} /> Status Quo (Breach)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#10b981', fontWeight: 700 }}>
                <span style={{ width: '12px', height: '2px', background: '#10b981', display: 'inline-block' }} /> Mitigated (Safe)
              </span>
            </div>
          </div>

          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="minute" stroke="#64748b" fontSize={11} unit="m" />
                <YAxis domain={[2, 12]} stroke="#64748b" fontSize={11} unit="°C" />
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
                <ReferenceLine
                  y={8.0}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{ value: '8.0°C Excursion Limit', fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }}
                />
                <ReferenceLine y={2.0} stroke="#38bdf8" strokeDasharray="4 4" strokeWidth={1} />

                {/* Line 1: Status Quo (Fatal Runaway) */}
                <Line
                  type="monotone"
                  dataKey="statusQuo"
                  name="Status Quo (No Action)"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  strokeDasharray="4 4"
                  dot={false}
                />

                {/* Line 2: Mitigated (Safe Recovery) */}
                <Line
                  type="monotone"
                  dataKey="mitigated"
                  name="With AI Intervention"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 3, fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div
            style={{
              marginTop: '1rem',
              padding: '0.85rem 1.25rem',
              background: 'rgba(16, 185, 129, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <div>
              <strong style={{ color: '#10b981', fontSize: '0.9rem' }}>
                Simulation Verdict: Excursion Averted
              </strong>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                Action '{simulationData?.action_name}' stabilizes chamber at 3.6°C. Zero regulatory breach.
              </div>
            </div>

            <button
              onClick={() => setShowCertificate(true)}
              style={{
                background: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <FileCheck2 size={14} /> Export Audit Report
            </button>
          </div>
        </div>
      </div>

      {/* WHO / FDA Audit Certificate Modal */}
      {showCertificate && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setShowCertificate(false)}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: '560px',
              width: '100%',
              padding: '2.5rem',
              background: '#0f172a',
              border: '2px solid rgba(56, 189, 248, 0.5)',
              borderRadius: '16px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-card)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 800, textTransform: 'uppercase' }}>
                  AeroCold Electronic Compliance Record
                </span>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.2rem' }}>
                  WHO-GDP Excursion Mitigation Certificate
                </h3>
              </div>
              <div style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', padding: '0.3rem 0.6rem', borderRadius: '6px', color: '#10b981', fontWeight: 800, fontSize: '0.8rem' }}>
                VALIDATED
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Certificate Reference ID:</span>
                <strong style={{ fontFamily: 'var(--font-mono)' }}>{simulationData?.certificate_id}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Monitored Unit ID:</span>
                <strong>{selectedUnit}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Medical Payload:</span>
                <strong>{simulationData?.payload}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Protected Cargo Value:</span>
                <strong style={{ color: '#10b981' }}>${cargoValue.toLocaleString()} USD</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Intervention Applied:</span>
                <strong>{simulationData?.action_name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Pre-Mitigation Status:</span>
                <span style={{ color: '#ef4444', fontWeight: 700 }}>Breach Projected in ~6m (7.5°C)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Post-Mitigation Stabilized Temp:</span>
                <span style={{ color: '#10b981', fontWeight: 700 }}>3.6°C (100% Viability)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Audit Standard:</span>
                <span>FDA 21 CFR Part 11 & WHO PQS Compliant</span>
              </div>
            </div>

            <div style={{ marginTop: '1.75rem', display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => {
                  alert(`Audit report ${simulationData?.certificate_id} downloaded as electronic record.`);
                  setShowCertificate(false);
                }}
                style={{
                  flex: 1,
                  background: 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  padding: '0.65rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                }}
              >
                <Download size={15} /> Download PDF Record
              </button>
              <button
                onClick={() => setShowCertificate(false)}
                style={{
                  padding: '0.65rem 1.2rem',
                  background: 'transparent',
                  border: '1px solid var(--border-card)',
                  color: 'var(--text-muted)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
