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
} from 'lucide-react';
import { Reading, TopFactor } from '../types';

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

    // Periodic sync poll every 2 seconds
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
  }, [selectedUnit]);

  const riskLevel = latest?.risk_level || latest?.risk || 'Low';
  const probPercent = latest ? Math.round((latest.prob ?? 0) * 100) : 0;
  const isK3Active = Boolean(latest?.k3_flag || latest?.k3);
  const ttx = latest?.time_to_excursion_min ?? latest?.ttx_min;

  // Chart data formatting: relative minutes or time
  const chartData = history.map((item, idx) => {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Unit Selector Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '0.85rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Layers size={20} color="#38bdf8" />
          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Active Cold Unit:</span>
          <select
            value={selectedUnit}
            onChange={(e) => onSelectUnit(e.target.value)}
            style={{
              background: 'var(--bg-input)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-light)',
              borderRadius: '6px',
              padding: '0.4rem 0.8rem',
              fontWeight: 700,
              fontSize: '0.9rem',
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Safe Limit Band: <strong style={{ color: '#10b981' }}>2.0°C – 8.0°C</strong>
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Early Warning Horizon: <strong>30 Minutes</strong>
          </span>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="telemetry-grid">
        {/* Risk Level Card */}
        <div className="glass-panel metric-card">
          <div className="metric-header">
            <span>RISK LEVEL GAUGE</span>
            {riskLevel === 'High' ? (
              <AlertTriangle size={18} color="#ef4444" />
            ) : riskLevel === 'Medium' ? (
              <Flame size={18} color="#f59e0b" />
            ) : (
              <CheckCircle2 size={18} color="#10b981" />
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className={`risk-badge ${riskLevel.toLowerCase()}`}>
              {riskLevel} RISK
            </span>
            {isK3Active && (
              <span
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#ef4444',
                  border: '1px solid #ef4444',
                  borderRadius: '4px',
                  padding: '0.15rem 0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                }}
              >
                K=3 ALERT ACTIVE
              </span>
            )}
          </div>
          <div className="metric-sub">
            Excursion Probability: <strong>{probPercent}%</strong>
          </div>
        </div>

        {/* Current Storage Temperature */}
        <div className="glass-panel metric-card">
          <div className="metric-header">
            <span>STORAGE TEMPERATURE</span>
            <Thermometer size={18} color="#0284c7" />
          </div>
          <div className="metric-value">
            {latest ? latest.storage_c.toFixed(1) : '--'}
            <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>°C</span>
          </div>
          <div className="metric-sub">
            {latest && latest.storage_c >= 2.0 && latest.storage_c <= 8.0 ? (
              <span style={{ color: '#10b981' }}>● Inside 2-8°C Medical Band</span>
            ) : (
              <span style={{ color: '#ef4444' }}>● Out of Safe Range</span>
            )}
          </div>
        </div>

        {/* Time To Excursion (TTX) */}
        <div className="glass-panel metric-card">
          <div className="metric-header">
            <span>TIME TO EXCURSION (TTX)</span>
            <Clock size={18} color="#f59e0b" />
          </div>
          <div className="metric-value">
            {ttx ? (
              <>
                ~{Math.round(ttx)}
                <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>min</span>
              </>
            ) : (
              <span style={{ fontSize: '1.4rem', color: 'var(--text-muted)' }}>Safe / None</span>
            )}
          </div>
          <div className="metric-sub">
            {ttx ? 'Projected time until 8.0°C crossing' : 'No excursion projected in 30m'}
          </div>
        </div>

        {/* Mechanical State: Door & Compressor */}
        <div className="glass-panel metric-card">
          <div className="metric-header">
            <span>HARDWARE TELEMETRY</span>
            <Info size={18} color="#38bdf8" />
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', margin: '0.3rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {latest?.door === 1 ? (
                <>
                  <DoorOpen size={20} color="#f59e0b" />
                  <span style={{ fontWeight: 700, color: '#f59e0b' }}>DOOR OPEN</span>
                </>
              ) : (
                <>
                  <DoorClosed size={20} color="#10b981" />
                  <span style={{ fontWeight: 700, color: '#10b981' }}>DOOR CLOSED</span>
                </>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {latest?.cooling === 1 ? (
                <>
                  <Zap size={20} color="#10b981" />
                  <span style={{ fontWeight: 700, color: '#10b981' }}>COOLING ON</span>
                </>
              ) : (
                <>
                  <ZapOff size={20} color="#ef4444" />
                  <span style={{ fontWeight: 700, color: '#ef4444' }}>COOLING OFF</span>
                </>
              )}
            </div>
          </div>
          <div className="metric-sub">
            Ambient: <strong>{latest ? latest.ambient_c.toFixed(1) : '--'}°C</strong>
          </div>
        </div>
      </div>

      {/* Plain-Language Explanation Box */}
      <div
        className={`glass-panel explanation-card ${
          riskLevel === 'High' ? 'high-alert' : riskLevel === 'Medium' ? 'medium-alert' : ''
        }`}
      >
        <div className="explanation-title">
          <Info size={18} />
          <span>Operator Intelligence & Transparent Diagnostic Reason</span>
        </div>
        <p className="explanation-text">
          {latest?.explanation || 'Awaiting incoming sensor stream for evaluation...'}
        </p>

        {/* Top Factors Chips */}
        {latest?.top_factors && latest.top_factors.length > 0 && (
          <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', alignSelf: 'center' }}>
              Top SHAP Drivers:
            </span>
            {latest.top_factors.map((tf, i) => (
              <span
                key={i}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '6px',
                  padding: '0.2rem 0.6rem',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                }}
              >
                <strong>{tf.label}</strong>: {tf.description}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Live Temperature & Excursion Band Chart */}
      <div className="glass-panel chart-container">
        <div className="chart-header">
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Thermal Profile & Safe Band Monitor</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Real-time chamber readings vs safe 2-8°C regulatory threshold and ambient temperature
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ width: 12, height: 3, backgroundColor: '#0284c7' }} /> Storage Chamber
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ width: 12, height: 3, backgroundColor: '#94a3b8' }} /> Ambient
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ width: 12, height: 3, backgroundColor: '#ef4444' }} /> 8.0°C Limit
            </span>
          </div>
        </div>

        <div style={{ width: '100%', height: 360 }}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis
                  domain={[0, (dataMax: number) => Math.max(12, Math.ceil(dataMax + 1))]}
                  stroke="#64748b"
                  fontSize={11}
                  unit="°C"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />

                {/* Safe Band (2 - 8 C) */}
                <ReferenceArea
                  y1={2.0}
                  y2={8.0}
                  fill="#10b981"
                  fillOpacity={0.08}
                  label={{
                    value: 'Safe 2-8°C Medical Band',
                    position: 'insideTopLeft',
                    fill: '#10b981',
                    fontSize: 11,
                    opacity: 0.6,
                  }}
                />

                {/* Excursion Limit Line */}
                <ReferenceLine
                  y={8.0}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
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
                  name="Storage Temp (°C)"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#0284c7' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="ambient_c"
                  name="Ambient Temp (°C)"
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  dot={false}
                />
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
