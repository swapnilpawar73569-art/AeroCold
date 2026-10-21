import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  AlertTriangle,
  RotateCcw,
  Sliders,
  CheckCircle,
  Radio,
  DoorOpen,
  DoorClosed,
  Zap,
  ZapOff,
  Activity,
  Flame,
} from 'lucide-react';

interface DemoControlBarProps {
  onRefresh: () => void;
  selectedUnit: string;
}

export const DemoControlBar: React.FC<DemoControlBarProps> = ({ onRefresh, selectedUnit }) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamStatus, setStreamStatus] = useState<string>('');
  const [showManualModal, setShowManualModal] = useState(false);
  const [autoSimulate, setAutoSimulate] = useState(false);

  // Manual injection form state
  const [injectUnit, setInjectUnit] = useState(selectedUnit);
  const [injectTemp, setInjectTemp] = useState<number>(6.5);
  const [injectAmbient, setInjectAmbient] = useState<number>(31.0);
  const [injectDoor, setInjectDoor] = useState<number>(0);
  const [injectCooling, setInjectCooling] = useState<number>(1);

  const autoSimTimerRef = useRef<any>(null);

  // Auto-simulate ticker loop
  useEffect(() => {
    if (autoSimulate) {
      autoSimTimerRef.current = setInterval(async () => {
        try {
          await fetch(`http://localhost:8000/api/demo/tick-live?unit_id=${selectedUnit}`, {
            method: 'POST',
          });
          onRefresh();
        } catch (e) {
          console.error('Tick error:', e);
        }
      }, 2500);
    } else {
      if (autoSimTimerRef.current) {
        clearInterval(autoSimTimerRef.current);
        autoSimTimerRef.current = null;
      }
    }
    return () => {
      if (autoSimTimerRef.current) {
        clearInterval(autoSimTimerRef.current);
      }
    };
  }, [autoSimulate, selectedUnit, onRefresh]);

  const handleStreamScenario = async (scenario: 'u1' | 'u2' | 'u3' | 'u4' | 'u5' | 'all') => {
    setIsStreaming(true);
    const labels: Record<string, string> = {
      u1: 'U1 Door-Open Recovery',
      u2: 'U2 Cooling Failure (K=3)',
      u3: 'U3 Thermal Creep (Warning Stage)',
      u4: 'U4 Nominal Thermostat Cycle',
      u5: 'U5 Sensor Glitch Filtered',
      all: 'Full Fleet Stream (U1 – U5)',
    };
    const label = labels[scenario] || 'Fleet Stream';
    setStreamStatus(`Streaming ${label}...`);

    try {
      const res = await fetch(`http://localhost:8000/api/demo/stream-sample?scenario=${scenario}`, {
        method: 'POST',
      });
      if (res.ok) {
        setStreamStatus(`${label} streamed successfully!`);
        setTimeout(() => setStreamStatus(''), 3000);
        onRefresh();
      }
    } catch (err) {
      setStreamStatus('Stream failed to send.');
    } finally {
      setIsStreaming(false);
    }
  };

  const handleTriggerEvent = async (eventType: string) => {
    try {
      setStreamStatus(`Injecting event: ${eventType} on ${selectedUnit}...`);
      await fetch(
        `http://localhost:8000/api/demo/event?unit_id=${selectedUnit}&event_type=${eventType}`,
        { method: 'POST' }
      );
      setStreamStatus(`Event applied: ${eventType}`);
      setTimeout(() => setStreamStatus(''), 2500);
      onRefresh();
    } catch (e) {
      console.error('Event inject error:', e);
    }
  };

  const handleResetDB = async () => {
    if (confirm('Reset database to clean baseline demo readings for U1 through U5?')) {
      try {
        await fetch('http://localhost:8000/api/demo/reset-db', { method: 'POST' });
        setStreamStatus('Fleet reset & reseeded to baseline!');
        setTimeout(() => setStreamStatus(''), 2500);
        onRefresh();
      } catch (err) {
        console.error('Reset error:', err);
      }
    }
  };

  const handleManualInject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('http://localhost:8000/api/demo/inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit_id: injectUnit,
          storage_c: injectTemp,
          ambient_c: injectAmbient,
          door: injectDoor,
          cooling: injectCooling,
        }),
      });
      setShowManualModal(false);
      setStreamStatus(`Injected reading for ${injectUnit} at ${injectTemp}°C`);
      setTimeout(() => setStreamStatus(''), 3000);
      onRefresh();
    } catch (err) {
      console.error('Manual inject error:', err);
    }
  };

  return (
    <>
      <div
        className="glass-panel"
        style={{
          padding: '0.85rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.8))',
          border: '1px solid rgba(2, 132, 199, 0.3)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.3rem 0.6rem',
              background: autoSimulate ? 'rgba(16, 185, 129, 0.2)' : 'rgba(2, 132, 199, 0.15)',
              borderRadius: '6px',
              border: autoSimulate
                ? '1px solid rgba(16, 185, 129, 0.5)'
                : '1px solid rgba(2, 132, 199, 0.4)',
            }}
          >
            <Radio
              size={16}
              color={autoSimulate ? '#10b981' : '#38bdf8'}
              className={autoSimulate || isStreaming ? 'pulse-icon' : ''}
            />
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: autoSimulate ? '#10b981' : '#38bdf8',
                letterSpacing: '0.04em',
              }}
            >
              {autoSimulate ? 'LIVE STREAM ACTIVE' : 'LIVE DEMO CONTROLLER'}
            </span>
          </div>

          {streamStatus ? (
            <span
              style={{
                fontSize: '0.825rem',
                color: '#10b981',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <CheckCircle size={14} /> {streamStatus}
            </span>
          ) : (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Target: <strong style={{ color: '#38bdf8' }}>{selectedUnit}</strong> • 1-Click
              Demonstrators:
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Toggle Live Auto-Simulator */}
          <button
            onClick={() => setAutoSimulate(!autoSimulate)}
            style={{
              background: autoSimulate ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.08)',
              color: autoSimulate ? '#10b981' : 'var(--text-main)',
              border: autoSimulate ? '1px solid #10b981' : '1px solid var(--border-light)',
              padding: '0.45rem 0.8rem',
              borderRadius: '6px',
              fontSize: '0.825rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.15s ease',
            }}
            title="Automatically emits live sensor ticks every 2.5 seconds to show dynamic movement"
          >
            <Activity size={13} color={autoSimulate ? '#10b981' : '#94a3b8'} />
            {autoSimulate ? 'Pause Auto-Stream' : '▶ Auto-Stream Live'}
          </button>

          {/* Scenarios U1 through U5 */}
          <button
            onClick={() => handleStreamScenario('u1')}
            disabled={isStreaming}
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              padding: '0.45rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: isStreaming ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
            title="Runs U1: Door opened then recovers, proving system avoids false alarms"
          >
            <Play size={12} fill="#10b981" />
            U1 (Door Recov)
          </button>

          <button
            onClick={() => handleStreamScenario('u2')}
            disabled={isStreaming}
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              padding: '0.45rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: isStreaming ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
            title="Runs U2: Cooling failure escalates to High risk before 8°C"
          >
            <AlertTriangle size={12} color="#ef4444" />
            U2 (Cooling Fail)
          </button>

          <button
            onClick={() => handleStreamScenario('u3')}
            disabled={isStreaming}
            style={{
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#f59e0b',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              padding: '0.45rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: isStreaming ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
            title="Runs U3: Thermal creep heatwave (Medium Warning Stage)"
          >
            <Flame size={12} color="#f59e0b" />
            U3 (Warning Creep)
          </button>

          <button
            onClick={() => handleStreamScenario('u4')}
            disabled={isStreaming}
            style={{
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              padding: '0.45rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: isStreaming ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
            title="Runs U4: Nominal stable cycling"
          >
            <Play size={12} fill="#38bdf8" />
            U4 (Nominal)
          </button>

          <button
            onClick={() => handleStreamScenario('u5')}
            disabled={isStreaming}
            style={{
              background: 'rgba(168, 85, 247, 0.15)',
              color: '#c084fc',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              padding: '0.45rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: isStreaming ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
            title="Runs U5: Glitch spike filtered by causal median filter"
          >
            <Activity size={12} color="#c084fc" />
            U5 (Glitch Filter)
          </button>

          <button
            onClick={() => handleStreamScenario('all')}
            disabled={isStreaming}
            style={{
              background: 'var(--color-primary)',
              color: '#ffffff',
              border: 'none',
              padding: '0.45rem 0.85rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: isStreaming ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              boxShadow: '0 2px 10px rgba(2, 132, 199, 0.3)',
            }}
          >
            <Play size={12} fill="#ffffff" />
            Stream All (U1–U5)
          </button>

          {/* Quick Event Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', borderLeft: '1px solid var(--border-card)', paddingLeft: '0.5rem' }}>
            <button
              onClick={() => handleTriggerEvent('door_open')}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-card)',
                padding: '0.4rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
              title={`Simulate opening door on ${selectedUnit}`}
            >
              <DoorOpen size={12} color="#f59e0b" />
              Open Door
            </button>

            <button
              onClick={() => handleTriggerEvent('cooling_cut')}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-card)',
                padding: '0.4rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
              title={`Simulate cooling power cut on ${selectedUnit}`}
            >
              <ZapOff size={12} color="#ef4444" />
              Cut Power
            </button>

            <button
              onClick={() => handleTriggerEvent('cooling_restore')}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-card)',
                padding: '0.4rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
              title={`Simulate cooling power restore on ${selectedUnit}`}
            >
              <Zap size={12} color="#10b981" />
              Cool
            </button>
          </div>

          {/* Custom & Reset */}
          <button
            onClick={() => {
              setInjectUnit(selectedUnit);
              setShowManualModal(true);
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-light)',
              padding: '0.45rem 0.7rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <Sliders size={13} />
            Custom
          </button>

          <button
            onClick={handleResetDB}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-dim)',
              border: '1px solid var(--border-card)',
              padding: '0.45rem 0.65rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
            title="Reset database to fresh state"
          >
            <RotateCcw size={12} />
            Reset
          </button>
        </div>
      </div>

      {/* Manual Inject Modal */}
      {showManualModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setShowManualModal(false)}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: '480px',
              width: '100%',
              padding: '2rem',
              background: '#0f172a',
              border: '1px solid var(--border-light)',
              borderRadius: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Manual Sensor Telemetry Injection
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Inject a custom live reading to test edge cases, custom slopes, and safety overrides.
            </p>

            <form onSubmit={handleManualInject} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Target Storage Unit
                </label>
                <select
                  value={injectUnit}
                  onChange={(e) => setInjectUnit(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '8px',
                    color: '#fff',
                    marginTop: '0.25rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <option value="U1">U1 - Comirnaty mRNA Vaccine</option>
                  <option value="U2">U2 - Insulin Glargine & EPO</option>
                  <option value="U3">U3 - Pediatric Hep B Biologics</option>
                  <option value="U4">U4 - Meningococcal Conjugate</option>
                  <option value="U5">U5 - Blood Plasma Vault</option>
                </select>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Storage Chamber Temperature (°C)
                  </label>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#38bdf8' }}>
                    {injectTemp.toFixed(1)}°C
                  </span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="12.0"
                  step="0.1"
                  value={injectTemp}
                  onChange={(e) => setInjectTemp(parseFloat(e.target.value))}
                  style={{ width: '100%', marginTop: '0.4rem', cursor: 'pointer' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Ambient Room Temperature (°C)
                  </label>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#94a3b8' }}>
                    {injectAmbient.toFixed(1)}°C
                  </span>
                </div>
                <input
                  type="range"
                  min="20.0"
                  max="42.0"
                  step="0.5"
                  value={injectAmbient}
                  onChange={(e) => setInjectAmbient(parseFloat(e.target.value))}
                  style={{ width: '100%', marginTop: '0.4rem', cursor: 'pointer' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={injectDoor === 1}
                    onChange={(e) => setInjectDoor(e.target.checked ? 1 : 0)}
                  />
                  <span>Door Open (1)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={injectCooling === 1}
                    onChange={(e) => setInjectCooling(e.target.checked ? 1 : 0)}
                  />
                  <span>Cooling Active (1)</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  style={{
                    flex: 1,
                    padding: '0.65rem',
                    background: 'transparent',
                    border: '1px solid var(--border-card)',
                    borderRadius: '8px',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '0.65rem',
                    background: 'var(--color-primary)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  Inject Telemetry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
