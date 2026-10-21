import React, { useEffect, useState } from 'react';
import { UnitSummary } from '../types';
import {
  Thermometer,
  ShieldAlert,
  DoorOpen,
  DoorClosed,
  Zap,
  ZapOff,
  ArrowRight,
  Search,
  Filter,
  Battery,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Layers,
} from 'lucide-react';

interface FleetOverviewProps {
  onSelectUnit: (unit: string) => void;
}

export const FleetOverview: React.FC<FleetOverviewProps> = ({ onSelectUnit }) => {
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

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

  // Filter & Search logic
  const filteredUnits = units.filter((u) => {
    const risk = (u.risk_level || 'Low').toLowerCase();
    const matchesFilter = filterRisk === 'all' || risk === filterRisk.toLowerCase();
    const matchesSearch =
      u.unit_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.payload || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.location || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // KPI Calculations
  const totalUnits = units.length;
  const criticalCount = units.filter((u) => (u.risk_level || u.risk) === 'High').length;
  const warningCount = units.filter((u) => (u.risk_level || u.risk) === 'Medium').length;
  const avgTemp =
    totalUnits > 0
      ? (units.reduce((acc, u) => acc + (u.storage_c || 0), 0) / totalUnits).toFixed(1)
      : '--';
  const doorOpenCount = units.filter((u) => u.door === 1).length;

  return (
    <div>
      {/* Fleet KPI Banner */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div className="glass-panel metric-card" style={{ padding: '1rem 1.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
            Total Monitored Nodes
          </span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: '0.25rem' }}>
            {totalUnits}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#10b981' }}>● Active Telemetry Feed</span>
        </div>

        <div className="glass-panel metric-card" style={{ padding: '1rem 1.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
            Critical Excursion Alerts
          </span>
          <div
            style={{
              fontSize: '1.8rem',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              marginTop: '0.25rem',
              color: criticalCount > 0 ? '#ef4444' : '#10b981',
            }}
          >
            {criticalCount}
          </div>
          <span style={{ fontSize: '0.75rem', color: criticalCount > 0 ? '#ef4444' : 'var(--text-dim)' }}>
            {criticalCount > 0 ? 'Action required immediately' : 'Zero units in runaway'}
          </span>
        </div>

        <div className="glass-panel metric-card" style={{ padding: '1rem 1.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
            Warning Stage Units
          </span>
          <div
            style={{
              fontSize: '1.8rem',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              marginTop: '0.25rem',
              color: warningCount > 0 ? '#f59e0b' : '#f8fafc',
            }}
          >
            {warningCount}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            Elevated thermal risk
          </span>
        </div>

        <div className="glass-panel metric-card" style={{ padding: '1rem 1.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
            Fleet Avg Chamber Temp
          </span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: '0.25rem', color: '#38bdf8' }}>
            {avgTemp}°C
          </div>
          <span style={{ fontSize: '0.75rem', color: '#10b981' }}>
            ● Inside 2.0 – 8.0°C Target
          </span>
        </div>

        <div className="glass-panel metric-card" style={{ padding: '1rem 1.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
            Active Door Openings
          </span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: '0.25rem', color: doorOpenCount > 0 ? '#f59e0b' : '#f8fafc' }}>
            {doorOpenCount}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            Physical disturbance sensor
          </span>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div
        className="glass-panel"
        style={{
          padding: '0.85rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '240px' }}>
          <Search size={18} color="#64748b" />
          <input
            type="text"
            placeholder="Search by unit ID, vaccine payload, or facility location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-main)',
              fontSize: '0.875rem',
              width: '100%',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={16} color="#64748b" />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Filter:</span>
          {['all', 'high', 'medium', 'low'].map((filterVal) => (
            <button
              key={filterVal}
              onClick={() => setFilterRisk(filterVal)}
              style={{
                background: filterRisk === filterVal ? 'rgba(2, 132, 199, 0.25)' : 'transparent',
                color: filterRisk === filterVal ? '#38bdf8' : 'var(--text-dim)',
                border: filterRisk === filterVal ? '1px solid #38bdf8' : '1px solid var(--border-card)',
                padding: '0.25rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              {filterVal}
            </button>
          ))}
        </div>
      </div>

      {/* Fleet Cards Grid */}
      {loading && units.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading fleet telemetry...
        </div>
      ) : filteredUnits.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No units match the specified filter or search query.
        </div>
      ) : (
        <div className="fleet-grid">
          {filteredUnits.map((u) => {
            const risk = u.risk_level || u.risk || 'Low';
            const probPct = Math.round((u.prob || 0) * 100);
            const isCritical = risk === 'High';
            const isWarning = risk === 'Medium';

            return (
              <div
                key={u.unit_id}
                className="glass-panel fleet-card"
                onClick={() => onSelectUnit(u.unit_id)}
                style={{
                  borderLeft: isCritical
                    ? '4px solid #ef4444'
                    : isWarning
                    ? '4px solid #f59e0b'
                    : '4px solid #10b981',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '1.25rem', fontFamily: 'var(--font-mono)' }}>
                        {u.unit_id}
                      </span>
                      {u.k3_flag === 1 && (
                        <span
                          style={{
                            background: 'rgba(239, 68, 68, 0.2)',
                            color: '#ef4444',
                            border: '1px solid #ef4444',
                            borderRadius: '4px',
                            padding: '0.1rem 0.4rem',
                            fontSize: '0.65rem',
                            fontWeight: 800,
                          }}
                        >
                          K=3 ACTIVE
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '0.2rem' }}>
                      {u.payload || 'Medical Cold Storage'}
                    </div>
                  </div>

                  <span className={`risk-badge ${risk.toLowerCase()}`}>
                    {risk}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.75rem' }}>
                  <MapPin size={12} />
                  <span>{u.location || 'Central Facility Vault'}</span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    padding: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.25)',
                    borderRadius: '8px',
                    margin: '0.5rem 0',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
                      Storage Temp
                    </span>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: isCritical ? '#ef4444' : '#f8fafc' }}>
                      {u.storage_c.toFixed(1)}°C
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
                      Excursion Risk
                    </span>
                    <div
                      style={{
                        fontSize: '1.35rem',
                        fontWeight: 800,
                        fontFamily: 'var(--font-mono)',
                        color: isCritical ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981',
                      }}
                    >
                      {probPct}%
                    </div>
                  </div>
                </div>

                {/* Progress Risk Bar */}
                <div style={{ height: '4px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '2px', overflow: 'hidden', margin: '0.5rem 0 0.75rem 0' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${probPct}%`,
                      background: isCritical
                        ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                        : isWarning
                        ? '#f59e0b'
                        : '#10b981',
                      borderRadius: '2px',
                    }}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.775rem',
                    color: 'var(--text-muted)',
                    borderTop: '1px solid var(--border-card)',
                    paddingTop: '0.6rem',
                  }}
                >
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      {u.door === 1 ? <DoorOpen size={13} color="#f59e0b" /> : <DoorClosed size={13} color="#10b981" />}
                      {u.door === 1 ? 'Open' : 'Closed'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      {u.cooling === 1 ? <Zap size={13} color="#10b981" /> : <ZapOff size={13} color="#ef4444" />}
                      {u.cooling === 1 ? 'Cooling' : 'Off'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Battery size={13} color="#10b981" />
                      {u.battery_pct || 95}%
                    </span>
                  </div>

                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.2rem',
                      color: '#38bdf8',
                      fontWeight: 700,
                    }}
                  >
                    View <ArrowRight size={13} />
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
