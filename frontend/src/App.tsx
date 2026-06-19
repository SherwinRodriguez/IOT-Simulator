import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import OAuthCallback from './pages/OAuthCallback';
import Dashboard from './pages/Dashboard';
import DeviceManager from './pages/DeviceManager';
import DeviceDetail from './pages/DeviceDetail';
import SimulatorConfig from './pages/SimulatorConfig';
import LiveGraph from './pages/TelemetryView';
import HistoricalGraph from './pages/HistoricalGraph';
import Settings from './pages/Settings';
import DemoDashboard from './pages/DemoDashboard';
import { Wifi, ChevronRight, Search, HelpCircle, Settings as SettingsIcon } from 'lucide-react';
import './index.css';

const TopBar: React.FC = () => {
  const location = useLocation();

  const getBreadcrumbs = () => {
    const path = location.pathname;
    const crumbs: { label: string; to?: string }[] = [];

    if (path === '/') {
      crumbs.push({ label: 'Dashboard' });
    } else if (path === '/devices') {
      crumbs.push({ label: 'Devices' });
    } else if (path.match(/^\/devices\/[^/]+$/)) {
      crumbs.push({ label: 'Devices', to: '/devices' });
      crumbs.push({ label: 'Device Detail' });
    } else if (path.match(/^\/devices\/[^/]+\/config$/)) {
      crumbs.push({ label: 'Devices', to: '/devices' });
      crumbs.push({ label: 'Simulator Config' });
    } else if (path.match(/^\/devices\/[^/]+\/graph$/)) {
      crumbs.push({ label: 'Devices', to: '/devices' });
      crumbs.push({ label: 'Live Telemetry' });
    } else if (path.match(/^\/devices\/[^/]+\/historical$/)) {
      crumbs.push({ label: 'Devices', to: '/devices' });
      crumbs.push({ label: 'Data Explorer' });
    } else if (path === '/settings') {
      crumbs.push({ label: 'Settings' });
    }

    return crumbs;
  };

  const crumbs = getBreadcrumbs();

  return (
    <div className="top-bar">
      {/* Logo */}
      <div className="top-bar-logo">
        <Wifi size={18} />
        <span>IOT</span>
      </div>

      {/* Breadcrumbs */}
      <div className="breadcrumb">
        {crumbs.map((crumb, i) => (
          <React.Fragment key={i}>
            {i > 0 && <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />}
            {crumb.to ? (
              <Link to={crumb.to}>{crumb.label}</Link>
            ) : (
              <span className="current">{crumb.label}</span>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Right side actions */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Search size={18} color="var(--text-muted)" style={{ cursor: 'pointer' }} />
        <SettingsIcon size={18} color="var(--text-muted)" style={{ cursor: 'pointer' }} />
        <HelpCircle size={18} color="var(--text-muted)" style={{ cursor: 'pointer' }} />
      </div>
    </div>
  );
};

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="layout">
    <Sidebar />
    <div className="main-wrapper">
      <TopBar />
      <main className="main-content">{children}</main>
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WebSocketProvider>
          <Routes>
            {/* Public */}
            <Route path="/login"          element={<Login />} />
            <Route path="/oauth/callback" element={<OAuthCallback />} />
            <Route path="/demo"           element={<DemoDashboard />} />

            {/* Protected */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<AppLayout><Dashboard /></AppLayout>} />
              <Route path="/devices" element={<AppLayout><DeviceManager /></AppLayout>} />
              <Route path="/devices/:id" element={<AppLayout><DeviceDetail /></AppLayout>} />
              <Route path="/devices/:id/config" element={<AppLayout><SimulatorConfig /></AppLayout>} />
              <Route path="/devices/:id/graph" element={<AppLayout><LiveGraph /></AppLayout>} />
              <Route path="/devices/:id/historical" element={<AppLayout><HistoricalGraph /></AppLayout>} />
              <Route path="/settings" element={<AppLayout><Settings /></AppLayout>} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </WebSocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
