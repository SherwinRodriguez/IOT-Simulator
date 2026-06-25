import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw, Play, Square, PauseCircle, ChevronRight,
  Cpu, Trash2, RotateCcw, AlertCircle
} from 'lucide-react';
import {
  getDevices, syncDevices,
  startSimulation, stopSimulation,
  pauseSimulation, resumeSimulation, deleteDevice,
} from '../api';
import { useAuth } from '../context/AuthContext';

const DeviceManager: React.FC = () => {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const authContext = useAuth();
  const isDemo = authContext?.user?.region === 'demo';

  const fetchDevices = async () => {
    try {
      const res = await getDevices();
      setDevices(res.data);
    } catch { setError('Failed to load devices'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDevices(); }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncDevices();
      await fetchDevices();
      setError('');
    } catch { setError('Zoho sync failed. Check your credentials.'); }
    finally { setSyncing(false); }
  };

  const handleAction = async (id: string, action: 'start' | 'stop' | 'pause' | 'resume' | 'delete') => {
    setActionLoading(`${id}-${action}`);
    try {
      if (action === 'start')   await startSimulation(id);
      if (action === 'stop')    await stopSimulation(id);
      if (action === 'pause')   await pauseSimulation(id);
      if (action === 'resume')  await resumeSimulation(id);
      if (action === 'delete') {
        if (!window.confirm('Delete this device? This cannot be undone.')) return;
        await deleteDevice(id);
      }
      await fetchDevices();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Action failed');
    } finally { setActionLoading(null); }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">
              All Devices ({devices.length})
            </h1>
            <p className="page-subtitle">{isDemo ? 'Your Mock Devices for Demo Mode' : 'Synced from your Zoho IoT account'}</p>
          </div>
          {!isDemo && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={handleSync} disabled={syncing}>
                {syncing ? <RefreshCw size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> : <RotateCcw size={14} />}
                {syncing ? 'Syncing…' : 'Sync from Zoho'}
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading devices…</div>
        ) : devices.length === 0 ? (
          <div style={{ padding: 64, textAlign: 'center' }}>
            <Cpu size={40} color="var(--text-muted)" style={{ margin: '0 auto 16px', display: 'block' }} />
            <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 8 }}>No devices found</p>
            {!isDemo ? (
              <>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
                  Click "Sync from Zoho" to import your IoT devices.
                </p>
                <button className="btn btn-primary" onClick={handleSync} disabled={syncing}>
                  <RotateCcw size={14} /> Sync from Zoho
                </button>
              </>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
                Log in again via Demo Mode to recreate your mock device.
              </p>
            )}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Connection Status</th>
                <th>Product</th>
                <th>Status</th>
                <th>Type</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => {
                const isRunning = d.status === 'RUNNING';
                const isPaused  = d.status === 'PAUSED';

                return (
                  <tr key={d.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{d.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {d.connectivity ? d.connectivity : (d.deviceType || '—')}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className={`conn-dot ${isRunning ? 'conn-dot-connected' : 'conn-dot-disconnected'}`} />
                        <span style={{ fontSize: 13 }}>{isRunning ? 'Connected' : 'Disconnected'}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {d.publishTopic ? d.publishTopic.split('/')[0] : '—'}
                    </td>
                    <td>
                      <span className={`badge ${
                        isRunning ? 'badge-green'
                        : isPaused ? 'badge-amber'
                        : 'badge-gray'
                      }`}>
                        {isRunning ? 'Running' : isPaused ? 'Paused' : 'Stopped'}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {d.deviceType || 'Direct Endpoint'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                        {!isRunning && !isPaused && (
                          <button
                            className="btn btn-success"
                            style={{ padding: '5px 12px', fontSize: 12 }}
                            disabled={actionLoading === `${d.id}-start`}
                            onClick={() => handleAction(d.id, 'start')}
                          >
                            <Play size={12} /> Start
                          </button>
                        )}
                        {isRunning && (
                          <>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '5px 12px', fontSize: 12 }}
                              disabled={!!actionLoading}
                              onClick={() => handleAction(d.id, 'pause')}
                            >
                              <PauseCircle size={12} /> Pause
                            </button>
                            <button
                              className="btn btn-danger"
                              style={{ padding: '5px 12px', fontSize: 12 }}
                              disabled={!!actionLoading}
                              onClick={() => handleAction(d.id, 'stop')}
                            >
                              <Square size={12} /> Stop
                            </button>
                          </>
                        )}
                        {isPaused && (
                          <>
                            <button
                              className="btn btn-success"
                              style={{ padding: '5px 12px', fontSize: 12 }}
                              disabled={!!actionLoading}
                              onClick={() => handleAction(d.id, 'resume')}
                            >
                              <Play size={12} /> Resume
                            </button>
                            <button
                              className="btn btn-danger"
                              style={{ padding: '5px 12px', fontSize: 12 }}
                              disabled={!!actionLoading}
                              onClick={() => handleAction(d.id, 'stop')}
                            >
                              <Square size={12} /> Stop
                            </button>
                          </>
                        )}

                        <Link
                          to={`/devices/${d.id}`}
                          className="btn btn-ghost"
                          style={{ padding: '5px 8px', fontSize: 12 }}
                        >
                          <ChevronRight size={14} />
                        </Link>

                        <button
                          className="btn btn-danger"
                          style={{ padding: '5px 8px', fontSize: 12 }}
                          disabled={!!actionLoading}
                          onClick={() => handleAction(d.id, 'delete')}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default DeviceManager;
