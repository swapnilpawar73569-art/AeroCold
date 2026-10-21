import React from 'react';
import { Activity, ShieldAlert, GitCompare, BarChart3, Snowflake } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  serverConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onTabChange, serverConnected }) => {
  return (
    <header className="app-header">
      <div className="header-content">
        <div className="brand-wrapper">
          <div className="brand-logo">
            <Snowflake size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 className="brand-title">AeroCold</h1>
              <span className="brand-badge">Round 2 Ready</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Early-Warning Medical Cold Chain (2-8°C)
            </p>
          </div>
        </div>

        <nav className="nav-tabs">
          <button
            className={`nav-tab-btn ${currentTab === 'monitor' ? 'active' : ''}`}
            onClick={() => onTabChange('monitor')}
          >
            <Activity size={16} />
            Live Monitor
          </button>
          <button
            className={`nav-tab-btn ${currentTab === 'fleet' ? 'active' : ''}`}
            onClick={() => onTabChange('fleet')}
          >
            <ShieldAlert size={16} />
            Fleet Overview
          </button>
          <button
            className={`nav-tab-btn ${currentTab === 'scenarios' ? 'active' : ''}`}
            onClick={() => onTabChange('scenarios')}
          >
            <GitCompare size={16} />
            Recovery vs Failure
          </button>
          <button
            className={`nav-tab-btn ${currentTab === 'eval' ? 'active' : ''}`}
            onClick={() => onTabChange('eval')}
          >
            <BarChart3 size={16} />
            Evaluation vs Baselines
          </button>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: serverConnected ? '#10b981' : '#ef4444',
              boxShadow: serverConnected ? '0 0 8px #10b981' : '0 0 8px #ef4444',
            }}
          />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            {serverConnected ? 'Live Feed Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
    </header>
  );
};
