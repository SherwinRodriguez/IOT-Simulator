import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import './index.css';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="layout">
    <Sidebar />
    <main className="main-content">{children}</main>
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
