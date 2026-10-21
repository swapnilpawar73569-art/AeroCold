import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import {
  Thermometer,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DoorOpen,
  DoorClosed,
  Zap,
  ZapOff,
  Flame,
  Info,
  Layers,
  Battery,
  MapPin,
  Volume2,
  VolumeX,
  ShieldAlert,
} from 'lucide-react';
import { Reading } from '../types';
import { RiskDialGauge } from './RiskDialGauge';
import { ShapWaterfall } from './ShapWaterfall';
import { DemoControlBar } from './DemoControlBar';

interface LiveMonitorProps {
  selectedUnit: string;
  onSelectUnit: (unit: string) => void;
  unitsList: string[];
}

export const LiveMonitor: React.FC<LiveMonitorProps> = ({
  selectedUnit,
  onSelectUnit,
  unitsList,
}) => {
  const [latest, setLatest] = useState<Reading | null>(null);
  const [history, setHistory] = useState<Reading[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [showAmbient, setShowAmbient] = useState<boolean>(true);

  // Fetch unit data from SQLite API
  const fetchUnitData = async (unitId: string) => {
    try {
      const [latestRes, historyRes] = await Promise.all([
        fetch(`http://localhost:8000/api/units/${unitId}/latest`),
        fetch(`http://localhost:8000/api/units/${unitId}/history?minutes=120`),
      ]);

      if (latestRes.ok) {
        const latestData = await latestRes.json();
        setLatest(latestData);
      } else {
        setLatest(null);
      }

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistory(historyData.readings || []);
      }
    } catch (err) {
      console.error('Failed to fetch unit data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchUnitData(selectedUnit);

    const interval = setInterval(() => {
      fetchUnitData(selectedUnit);
    }, 2000);

    return () => clearInterval(interval);
  }, [selectedUnit]);

  // WebSocket Live Listener
  useEffect(() => {
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket('ws://localhost:8000/ws/live');
      ws.onmessage = (event) => {
        try {
          const data: Reading = JSON.parse(event.data);
          const readingUnit = data.unit || data.unit_id;
          if (readingUnit === selectedUnit) {
            setLatest(data);
            setHistory((prev) => {
              const existingIdx = prev.findIndex((r) => r.ts === data.ts);
              if (existingIdx >= 0) {
                const updated = [...prev];
                updated[existingIdx] = data;
                return updated;
              }
              return [...prev, data];
            });

            // Play modern subtle chime if High risk and sound enabled
            if (soundEnabled && (data.risk === 'High' || data.risk_level === 'High')) {
              playAlertBeep();
            }
          }
        } catch (e) {
          console.error('Error parsing live WS payload:', e);
        }
      };
    } catch (err) {
      console.error('WebSocket connection error:', err);
    }

    return () => {
      if (ws) ws.close();
    };
  }, [selectedUnit, soundEnabled]);

  const playAlertBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {
      // AudioContext not allowed before user interaction
    }
  };

  const riskLevel = latest?.risk_level || latest?.risk || 'Low';
  const probVal = latest?.prob ?? 0;
  const isK3Active = Boolean(latest?.k3_flag || latest?.k3);
  const ttx = latest?.time_to_excursion_min ?? latest?.ttx_min;

  // Metadata from backend
  const meta: any = latest || {};
  const payloadName = meta.payload || 'Medical Biological Storage';
  const locationName = meta.location || 'Hospital Cold Bay';
  const batteryPct = meta.battery_pct || 95;

  // Chart data formatting
  const chartData = history.map((item) => {
    const d = new Date(item.ts * 1000);
    const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
    return {
      time: timeStr,
      ts: item.ts,
      storage_c: Number(item.storage_c.toFixed(2)),
      ambient_c: Number(item.ambient_c.toFixed(2)),
      prob: Number(((item.prob || 0) * 100).toFixed(1)),
      risk: item.risk_level || item.risk || 'Low',
    };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Interactive Demo Controller Bar */}
      <DemoControlBar
        onRefresh={() => fetchUnitData(selectedUnit)}
        selectedUnit={selectedUnit}
      />

      {/* Critical Excursion Emergency Banner */}
      {riskLevel === 'High' && (
        <div
          style={{
            background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.25), rgba(220, 38, 38, 0.15))',
            border: '1px solid #ef4444',
            borderRadius: '12px',
            padding: '1rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            animation: 'pulse-border 2s infinite',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: '#ef4444', padding: '0.5rem', borderRadius: '8px' }}>
              <ShieldAlert size={24} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fecaca' }}>
                EARLY EXCURSION WARNING TRIGGERED FOR UNIT {selectedUnit}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#fca5a5' }}>
                {latest?.explanation || 'Thermal runaway detected. Action required before 8.0°C violation.'}
              </div>
            </div>
          </div>
          {ttx && (
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', color: '#fca5a5', textTransform: 'uppercase' }}>Lead Time Window</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#fee2e2' }}>
                ~{Math.round(ttx)}m
              </div>
            </div>
          )}
        </div>
      )}

      {/* Unit Context & Selector Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '1rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Layers size={20} color="#38bdf8" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Cold Unit:</span>
            <select
              value={selectedUnit}
              onChange={(e) => onSelectUnit(e.target.value)}
              style={{
                background: 'var(--bg-input)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-light)',
                borderRadius: '8px',
                padding: '0.45rem 1rem',
                fontWeight: 800,
                fontSize: '1rem',
                cursor: 'pointer',
              }}
            >
              {unitsList.length > 0 ? (
                unitsList.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))
              ) : (
                <option value="U1">U1</option>
              )}
            </select>
          </div>

          <div style={{ height: '24px', width: '1px', background: 'var(--border-card)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Payload:</span>
            <strong style={{ color: '#f8fafc' }}>{payloadName}</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            <MapPin size={14} color="#94a3b8" />
            <span>{locationName}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <Battery size={16} color={batteryPct > 50 ? '#10b981' : '#f59e0b'} />
            <span>{batteryPct}% Battery</span>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            style={{
              background: soundEnabled ? 'rgba(2, 132, 199, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-card)',
              color: soundEnabled ? '#38bdf8' : 'var(--text-dim)',
              padding: '0.4rem 0.6rem',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.8rem',
            }}
            title={soundEnabled ? 'Mute alert sounds' : 'Enable audio chimes for High risk alarms'}
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            <span>{soundEnabled ? 'Audio Chime ON' : 'Muted'}</span>
          </button>
        </div>
      </div>

      {/* Primary Telemetry Grid with Dial Gauge */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
        {/* Semicircular Radial Risk Gauge */}
        <div
          className="glass-panel metric-card"
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
            background:
              riskLevel === 'High'
                ? 'radial-gradient(circle at 50% 50%, rgba(239, 68, 68, 0.12) 0%, rgba(18, 24, 38, 0.85) 100%)'
                : 'var(--bg-card)',
          }}
        >
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>PREDICTIVE RISK GAUGE</span>
            <span className={`risk-badge ${riskLevel.toLowerCase()}`}>{riskLevel} RISK</span>
          </div>

          <RiskDialGauge probability={probVal} riskLevel={riskLevel} size={220} />

          {isK3Active && (
            <div
              style={{
                marginTop: '0.75rem',
                background: 'rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
                border: '1px solid #ef4444',
                borderRadius: '6px',
                padding: '0.25rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                textAlign: 'center',
              }}
            >
              PERSISTENT K=3 ALARM CONFIRMED
            </div>
          )}
        </div>

        {/* Current Storage Temperature */}
        <div className="glass-panel metric-card">
          <div className="metric-header">
            <span>STORAGE CHAMBER</span>
            <Thermometer size={20} color="#0284c7" />
          </div>
          <div>
            <div className="metric-value">
              {latest ? latest.storage_c.toFixed(1) : '--'}
              <span style={{ fontSize: '1.3rem', color: 'var(--text-muted)' }}>°C</span>
            </div>
            <div className="metric-sub" style={{ marginTop: '0.5rem' }}>
              {latest && latest.storage_c >= 2.0 && latest.storage_c <= 8.0 ? (
                <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <CheckCircle2 size={14} /> Safe Regulatory Band (2.0 – 8.0°C)
                </span>
              ) : (
                <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <AlertTriangle size={14} /> EXCURSION LIMIT EXCEEDED
                </span>
              )}
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', borderTop: '1px solid var(--border-card)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
            Distance to 8.0°C limit: <strong>{latest ? (8.0 - latest.storage_c).toFixed(2) : '--'}°C</strong>
          </div>
        </div>

        {/* Time To Excursion (TTX) */}
        <div className="glass-panel metric-card">
          <div className="metric-header">
            <span>PROJECTED LEAD TIME</span>
            <Clock size={20} color={ttx ? '#ef4444' : '#10b981'} />
          </div>
          <div>
            <div className="metric-value" style={{ color: ttx ? '#ef4444' : '#f8fafc' }}>
              {ttx ? (
                <>
                  ~{Math.round(ttx)}
                  <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>min</span>
                </>
              ) : (
                <span style={{ fontSize: '1.5rem', color: '#10b981' }}>Safe • None</span>
              )}
            </div>
            <div className="metric-sub" style={{ marginTop: '0.5rem' }}>
              {ttx
                ? 'Time before crossing 8.0°C at current thermal rate'
                : 'No temperature excursion projected in 30m'}
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', borderTop: '1px solid var(--border-card)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
            Early-warning threshold horizon: <strong>30 minutes</strong>
          </div>
        </div>

        {/* Hardware Status */}
        <div className="glass-panel metric-card">
          <div className="metric-header">
            <span>CHAMBER HARDWARE</span>
            <Info size={18} color="#38bdf8" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', margin: '0.5rem 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Door Status:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                {latest?.door === 1 ? (
                  <>
                    <DoorOpen size={18} color="#f59e0b" />
                    <span style={{ fontWeight: 800, color: '#f59e0b' }}>OPEN</span>
                  </>
                ) : (
                  <>
                    <DoorClosed size={18} color="#10b981" />
                    <span style={{ fontWeight: 800, color: '#10b981' }}>CLOSED</span>
                  </>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Cooling Compressor:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                {latest?.cooling === 1 ? (
                  <>
                    <Zap size={18} color="#10b981" />
                    <span style={{ fontWeight: 800, color: '#10b981' }}>ACTIVE (ON)</span>
                  </>
                ) : (
                  <>
                    <ZapOff size={18} color="#ef4444" />
                    <span style={{ fontWeight: 800, color: '#ef4444' }}>OFF / IDLE</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', borderTop: '1px solid var(--border-card)', paddingTop: '0.5rem' }}>
            Ambient Room Temp: <strong>{latest ? latest.ambient_c.toFixed(1) : '--'}°C</strong>
          </div>
        </div>
      </div>

      {/* Operator Intelligence & SHAP Waterfall Section */}
      <div
        className={`glass-panel explanation-card ${
          riskLevel === 'High' ? 'high-alert' : riskLevel === 'Medium' ? 'medium-alert' : ''
        }`}
      >
        <div className="explanation-title">
          <Info size={19} color={riskLevel === 'High' ? '#ef4444' : riskLevel === 'Medium' ? '#f59e0b' : '#38bdf8'} />
          <span>Operator Intelligence & Transparent Diagnostic Reason</span>
        </div>
        <p className="explanation-text" style={{ fontSize: '1.05rem', fontWeight: 500, marginBottom: '0.75rem' }}>
          "{latest?.explanation || 'Awaiting incoming sensor stream for evaluation...'}"
        </p>

        {/* TreeSHAP Feature Attribution Waterfall */}
        {latest?.top_factors && (
          <ShapWaterfall factors={latest.top_factors} modelProb={latest.model_prob} />
        )}
      </div>

      {/* Thermal Profile Chart */}
      <div className="glass-panel chart-container">
        <div className="chart-header">
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Continuous Thermal Trajectory & Excursion Band</h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
              Real-time chamber telemetry vs 2.0–8.0°C safe regulatory zone and ambient exposure
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.8rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <input
                type="checkbox"
                checked={showAmbient}
                onChange={(e) => setShowAmbient(e.target.checked)}
              />
              <span>Show Ambient Trace</span>
            </label>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: 14, height: 3, backgroundColor: '#38bdf8', borderRadius: 2 }} /> Chamber Temp
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: 14, height: 3, backgroundColor: '#ef4444', borderRadius: 2 }} /> 8.0°C Limit
            </span>
          </div>
        </div>

        <div style={{ width: '100%', height: 380 }}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 15, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis
                  domain={[1.5, (dataMax: number) => Math.max(10, Math.ceil(dataMax + 1))]}
                  stroke="#64748b"
                  fontSize={11}
                  unit="°C"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    backdropFilter: 'blur(10px)',
                    borderColor: '#334155',
                    borderRadius: '10px',
                    color: '#f8fafc',
                    fontSize: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  }}
                />

                {/* Safe Band (2 - 8 C) */}
                <ReferenceArea
                  y1={2.0}
                  y2={8.0}
                  fill="#10b981"
                  fillOpacity={0.07}
                  label={{
                    value: 'Safe 2-8°C Medical Band',
                    position: 'insideTopLeft',
                    fill: '#10b981',
                    fontSize: 11,
                    opacity: 0.7,
                  }}
                />

                {/* Excursion Limit Line */}
                <ReferenceLine
                  y={8.0}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: '8.0°C Excursion Threshold',
                    position: 'insideTopRight',
                    fill: '#ef4444',
                    fontSize: 11,
                  }}
                />
                <ReferenceLine
                  y={2.0}
                  stroke="#38bdf8"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                />

                <Line
                  type="monotone"
                  dataKey="storage_c"
                  name="Chamber Temp (°C)"
                  stroke="#38bdf8"
                  strokeWidth={3}
                  dot={{ r: 3.5, fill: '#0284c7' }}
                  activeDot={{ r: 7, fill: '#38bdf8', stroke: '#fff', strokeWidth: 2 }}
                />

                {showAmbient && (
                  <Line
                    type="monotone"
                    dataKey="ambient_c"
                    name="Ambient Temp (°C)"
                    stroke="#94a3b8"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div
              style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-dim)',
              }}
            >
              No telemetry rows loaded yet for this unit.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
