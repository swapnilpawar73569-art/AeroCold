import React from 'react';
import {
  Activity,
  ShieldAlert,
  BarChart3,
  Snowflake,
  Sparkles,
  Layers,
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  serverConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onTabChange, serverConnected }) => {
  return (
    <header className="app-header">
      <div className="header-content">
        {/* Brand */}
        <div className="brand-wrapper" onClick={() => onTabChange('monitor')} style={{ cursor: 'pointer' }}>
          <div className="brand-logo">
            <Snowflake size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 className="brand-title">AeroCold</h1>
              <span
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  borderRadius: '4px',
                  padding: '0.1rem 0.4rem',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                }}
              >
                CLINICAL AI
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Early-Warning Medical Cold Chain (2.0°C – 8.0°C)
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="nav-tabs" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className={`nav-tab-btn ${currentTab === 'monitor' ? 'active' : ''}`}
            onClick={() => onTabChange('monitor')}
          >
            <Activity size={15} />
            Live Monitor
          </button>

          <button
            className={`nav-tab-btn ${currentTab === 'fleet' ? 'active' : ''}`}
            onClick={() => onTabChange('fleet')}
          >
            <ShieldAlert size={15} />
            Fleet Overview
          </button>

          <button
            className={`nav-tab-btn ${currentTab === 'intervention' ? 'active' : ''}`}
            onClick={() => onTabChange('intervention')}
          >
            <Sparkles size={15} color="#38bdf8" />
            Action Co-Pilot
          </button>

          <button
            className={`nav-tab-btn ${currentTab === 'eval' ? 'active' : ''}`}
            onClick={() => onTabChange('eval')}
          >
            <BarChart3 size={15} />
            Baselines & Evaluation
          </button>
        </nav>

        {/* Connection Status Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.3rem 0.65rem',
              background: serverConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: serverConnected ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: serverConnected ? '#10b981' : '#ef4444',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: serverConnected ? '#10b981' : '#ef4444',
                boxShadow: serverConnected ? '0 0 8px #10b981' : 'none',
              }}
            />
            {serverConnected ? 'SQLite WAL Connected' : 'Backend Disconnected'}
          </div>
        </div>
      </div>
    </header>
  );
};
