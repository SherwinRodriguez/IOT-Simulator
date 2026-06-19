import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cpu, Zap, PauseCircle, BarChart3, RefreshCw, ArrowRight } from 'lucide-react';
import { getDeviceStats, getDevices } from '../api';
import { useAuth } from '../context/AuthContext';

interface Stats {
  totalDevices: number;
  activeSimulations: number;
  pausedSimulations: number;
  stoppedDevices: number;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentDevices, setRecentDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDeviceStats(), getDevices()])
      .then(([statsRes, devicesRes]) => {
        setStats(statsRes.data);
        setRecentDevices(devicesRes.data.slice(0, 5));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    {
      label: 'Total Devices',
      value: stats?.totalDevices ?? '—',
      icon: <Cpu size={20} color="var(--accent-blue)" />,
      color: 'stat-card-blue',
    },
    {
      label: 'Active Simulations',
      value: stats?.activeSimulations ?? '—',
      icon: <Zap size={20} color="var(--accent-green)" />,
      color: 'stat-card-green',
    },
    {
      label: 'Paused',
      value: stats?.pausedSimulations ?? '—',
      icon: <PauseCircle size={20} color="var(--accent-amber)" />,
      color: 'stat-card-amber',
    },
    {
      label: 'Stopped',
      value: stats?.stoppedDevices ?? '—',
      icon: <BarChart3 size={20} color="var(--accent-purple)" />,
      color: 'stat-card-purple',
    },
  ];

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">
              Welcome back, {user?.displayName?.split(' ')[0] || 'User'}
            </h1>
            <p className="page-subtitle">
              Zoho IoT Simulator Console · {user?.region?.toUpperCase()} Region
            </p>
          </div>
          <button className="btn btn-secondary" onClick={() => window.location.reload()}>
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {statCards.map(({ label, value, icon, color }) => (
          <div key={label} className={`stat-card ${color}`}>
            {icon}
            <div className="stat-value">{loading ? '…' : value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Recent Devices */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Recent Devices</h2>
          <Link to="/devices" className="btn btn-ghost" style={{ fontSize: 13 }}>
            View All <ArrowRight size={14} />
          </Link>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Device Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>Zoho ID</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Loading…</td></tr>
              ) : recentDevices.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 32 }}>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 12 }}>No devices synced yet.</p>
                    <Link to="/devices" className="btn btn-primary" style={{ display: 'inline-flex' }}>
                      Sync Devices from Zoho
                    </Link>
                  </td>
                </tr>
              ) : (
                recentDevices.map((d) => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.name}</td>
                    <td>{d.deviceType || '—'}</td>
                    <td>
                      <span className={`badge ${
                        d.status === 'RUNNING' ? 'badge-green'
                        : d.status === 'PAUSED' ? 'badge-amber'
                        : 'badge-gray'
                      }`}>
                        <span className={`pulse-dot ${
                          d.status === 'RUNNING' ? 'pulse-dot-green'
                          : d.status === 'PAUSED' ? 'pulse-dot-amber'
                          : 'pulse-dot-gray'
                        }`} />
                        {d.status}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{d.zohoDeviceId}</td>
                    <td>
                      <Link to={`/devices/${d.id}`} className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }}>
                        View <ArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
