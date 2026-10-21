import React, { useEffect, useState } from 'react';
import { UnitSummary } from '../types';
import { Thermometer, ShieldAlert, DoorOpen, DoorClosed, Zap, ZapOff, ArrowRight } from 'lucide-react';

interface FleetOverviewProps {
  onSelectUnit: (unit: string) => void;
}

export const FleetOverview: React.FC<FleetOverviewProps> = ({ onSelectUnit }) => {
  const [units, setUnits] = useState<UnitSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUnits = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/units');
      if (res.ok) {
        const data = await res.json();
        setUnits(data.units || []);
      }
    } catch (e) {
      console.error('Failed to load fleet units:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
    const interval = setInterval(fetchUnits, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Fleet Medical Storage Units</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Multi-unit real-time status across hospital and transport cold nodes
          </p>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
          Active Units: <strong>{units.length}</strong>
        </div>
      </div>

      {loading && units.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading fleet telemetry...
        </div>
      ) : units.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No units registered yet. Stream sample readings or connect sensors to see units here.
        </div>
      ) : (
        <div className="fleet-grid">
          {units.map((u) => {
            const risk = u.risk_level || 'Low';
            const probPct = Math.round((u.prob || 0) * 100);

            return (
              <div
                key={u.unit_id}
                className="glass-panel fleet-card"
                onClick={() => onSelectUnit(u.unit_id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: risk === 'High' ? '#ef4444' : risk === 'Medium' ? '#f59e0b' : '#10b981' }} />
                    <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{u.unit_id}</span>
                  </div>
                  <span className={`risk-badge ${risk.toLowerCase()}`}>
                    {risk}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '0.8rem 0' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Chamber Temp</span>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                      {u.storage_c.toFixed(1)}°C
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Excursion Prob</span>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: risk === 'High' ? '#ef4444' : risk === 'Medium' ? '#f59e0b' : 'var(--text-muted)' }}>
                      {probPct}%
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-card)', paddingTop: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.8rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      {u.door === 1 ? <DoorOpen size={14} color="#f59e0b" /> : <DoorClosed size={14} color="#10b981" />}
                      {u.door === 1 ? 'Open' : 'Closed'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      {u.cooling === 1 ? <Zap size={14} color="#10b981" /> : <ZapOff size={14} color="#ef4444" />}
                      {u.cooling === 1 ? 'Cooling' : 'Idle'}
                    </span>
                  </div>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#38bdf8', fontWeight: 600 }}>
                    Monitor <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
