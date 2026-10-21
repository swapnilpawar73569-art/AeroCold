import React, { useState } from 'react';
import { Play, AlertTriangle, RotateCcw, Sliders, CheckCircle, Radio } from 'lucide-react';

interface DemoControlBarProps {
  onRefresh: () => void;
  selectedUnit: string;
}

export const DemoControlBar: React.FC<DemoControlBarProps> = ({ onRefresh, selectedUnit }) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamStatus, setStreamStatus] = useState<string>('');
  const [showManualModal, setShowManualModal] = useState(false);

  // Manual injection form state
  const [injectUnit, setInjectUnit] = useState(selectedUnit);
  const [injectTemp, setInjectTemp] = useState<number>(6.5);
  const [injectAmbient, setInjectAmbient] = useState<number>(31.0);
  const [injectDoor, setInjectDoor] = useState<number>(0);
  const [injectCooling, setInjectCooling] = useState<number>(1);

  const handleStreamScenario = async (scenario: 'u1' | 'u2' | 'both') => {
    setIsStreaming(true);
    const label = scenario === 'u1' ? 'U1 Door-Open' : scenario === 'u2' ? 'U2 Cooling-Failure' : 'Jury Test Stream (U1 + U2)';
    setStreamStatus(`Streaming ${label}...`);

    try {
      const res = await fetch(`http://localhost:8000/api/demo/stream-sample?scenario=${scenario}`, {
        method: 'POST',
      });
      if (res.ok) {
        setStreamStatus(`${label} completed!`);
        setTimeout(() => setStreamStatus(''), 3000);
        onRefresh();
      }
    } catch (err) {
      setStreamStatus('Stream failed to send.');
    } finally {
      setIsStreaming(false);
    }
  };

  const handleResetDB = async () => {
    if (confirm('Reset database to clean baseline demo readings?')) {
      try {
        await fetch('http://localhost:8000/api/demo/reset-db', { method: 'POST' });
        setStreamStatus('Database reset & re-seeded!');
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
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.7))',
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
              background: 'rgba(2, 132, 199, 0.15)',
              borderRadius: '6px',
              border: '1px solid rgba(2, 132, 199, 0.4)',
            }}
          >
            <Radio size={16} color="#38bdf8" className={isStreaming ? 'pulse-icon' : ''} />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.04em' }}>
              LIVE DEMO CONTROLLER
            </span>
          </div>

          {streamStatus ? (
            <span style={{ fontSize: '0.825rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <CheckCircle size={14} /> {streamStatus}
            </span>
          ) : (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              1-click test jury scenarios directly from browser:
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleStreamScenario('u1')}
            disabled={isStreaming}
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              padding: '0.45rem 0.9rem',
              borderRadius: '6px',
              fontSize: '0.825rem',
              fontWeight: 700,
              cursor: isStreaming ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease',
            }}
            title="Runs U1: Door opened then recovers, proving system avoids false alarms"
          >
            <Play size={13} fill="#10b981" />
            Stream U1 (Door Recovery)
          </button>

          <button
            onClick={() => handleStreamScenario('u2')}
            disabled={isStreaming}
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              padding: '0.45rem 0.9rem',
              borderRadius: '6px',
              fontSize: '0.825rem',
              fontWeight: 700,
              cursor: isStreaming ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease',
            }}
            title="Runs U2: Cooling failure escalates to High risk before 8°C"
          >
            <AlertTriangle size={13} color="#ef4444" />
            Stream U2 (Cooling Failure)
          </button>

          <button
            onClick={() => handleStreamScenario('both')}
            disabled={isStreaming}
            style={{
              background: 'var(--color-primary)',
              color: '#ffffff',
              border: 'none',
              padding: '0.45rem 0.9rem',
              borderRadius: '6px',
              fontSize: '0.825rem',
              fontWeight: 700,
              cursor: isStreaming ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 10px rgba(2, 132, 199, 0.3)',
            }}
          >
            <Play size={13} fill="#ffffff" />
            Run Full Jury Test
          </button>

          <button
            onClick={() => {
              setInjectUnit(selectedUnit);
              setShowManualModal(true);
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-light)',
              padding: '0.45rem 0.8rem',
              borderRadius: '6px',
              fontSize: '0.825rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <Sliders size={14} />
            Inject Custom
          </button>

          <button
            onClick={handleResetDB}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-dim)',
              border: '1px solid var(--border-card)',
              padding: '0.45rem 0.7rem',
              borderRadius: '6px',
              fontSize: '0.825rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
            title="Reset database to fresh state"
          >
            <RotateCcw size={13} />
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
                <input
                  type="text"
                  value={injectUnit}
                  onChange={(e) => setInjectUnit(e.target.value.toUpperCase())}
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
                  }}
                  required
                />
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
                  <span>Cooling Compressor On (1)</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-card)',
                    color: 'var(--text-muted)',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: 'var(--color-primary)',
                    border: 'none',
                    color: '#fff',
                    padding: '0.5rem 1.25rem',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: 'pointer',
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
