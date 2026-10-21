import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LiveMonitor } from './components/LiveMonitor';
import { FleetOverview } from './components/FleetOverview';
import { ScenariosView } from './components/ScenariosView';
import { EvaluationView } from './components/EvaluationView';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('monitor');
  const [selectedUnit, setSelectedUnit] = useState<string>('U1');
  const [unitsList, setUnitsList] = useState<string[]>(['U1', 'U2', 'U3', 'U4', 'U5']);
  const [serverConnected, setServerConnected] = useState<boolean>(true);

  // Load known units from API
  const refreshUnits = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/units');
      if (res.ok) {
        const data = await res.json();
        setServerConnected(true);
        if (data.units && data.units.length > 0) {
          const ids = data.units.map((u: any) => u.unit_id);
          setUnitsList(ids);
          if (!ids.includes(selectedUnit)) {
            setSelectedUnit(ids[0]);
          }
        }
      } else {
        setServerConnected(false);
      }
    } catch {
      setServerConnected(false);
    }
  };

  useEffect(() => {
    refreshUnits();
    const interval = setInterval(refreshUnits, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectUnit = (unitId: string) => {
    setSelectedUnit(unitId);
    setCurrentTab('monitor');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        serverConnected={serverConnected}
      />

      <main className="main-content" style={{ flex: 1 }}>
        {currentTab === 'monitor' && (
          <LiveMonitor
            selectedUnit={selectedUnit}
            onSelectUnit={setSelectedUnit}
            unitsList={unitsList}
          />
        )}
        {currentTab === 'fleet' && (
          <FleetOverview onSelectUnit={handleSelectUnit} />
        )}
        {currentTab === 'scenarios' && <ScenariosView />}
        {currentTab === 'eval' && <EvaluationView />}
      </main>

      <footer className="app-footer">
        <div>
          <strong>AeroCold Early-Warning Medical Cold Chain System</strong> — Enterprise Predictive Monitoring
        </div>
        <div className="footer-synthetic-tag">
          Synthetic data from our physical simulator • Honest code-driven metrics
        </div>
      </footer>
    </div>
  );
};

export default App;
