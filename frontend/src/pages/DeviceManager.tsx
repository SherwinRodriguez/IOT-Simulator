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

const DeviceManager: React.FC = () => {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

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
            <h1 className="page-title">Devices</h1>
            <p className="page-subtitle">Synced from your Zoho IoT account · {devices.length} device{devices.length !== 1 ? 's' : ''}</p>
          </div>
          <button className="btn btn-cyan" onClick={handleSync} disabled={syncing}>
            {syncing ? <RefreshCw size={15} style={{ animation: 'spin 0.7s linear infinite' }} /> : <RotateCcw size={15} />}
            {syncing ? 'Syncing…' : 'Sync from Zoho'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#f87171', fontSize: 14,
        }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading devices…</div>
        ) : devices.length === 0 ? (
          <div style={{ padding: 64, textAlign: 'center' }}>
            <Cpu size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px', display: 'block' }} />
            <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 8 }}>No devices found</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
              Click "Sync from Zoho" to import your IoT devices.
            </p>
            <button className="btn btn-cyan" onClick={handleSync} disabled={syncing}>
              <RotateCcw size={14} /> Sync from Zoho
            </button>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Device</th>
                <th>Type</th>
                <th>Topic</th>
                <th>Status</th>
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
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{d.zohoDeviceId}</div>
                    </td>
                    <td>{d.deviceType || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {d.publishTopic || '—'}
                    </td>
                    <td>
                      <span className={`badge ${
                        isRunning ? 'badge-green'
                        : isPaused ? 'badge-amber'
                        : 'badge-gray'
                      }`}>
                        <span className={`pulse-dot ${
                          isRunning ? 'pulse-dot-green'
                          : isPaused ? 'pulse-dot-amber'
                          : 'pulse-dot-gray'
                        }`} />
                        {d.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                        {/* Start / Stop / Pause / Resume */}
                        {!isRunning && !isPaused && (
                          <button
                            className="btn btn-primary"
                            style={{ padding: '6px 12px', fontSize: 12 }}
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
                              style={{ padding: '6px 12px', fontSize: 12 }}
                              disabled={!!actionLoading}
                              onClick={() => handleAction(d.id, 'pause')}
                            >
                              <PauseCircle size={12} /> Pause
                            </button>
                            <button
                              className="btn btn-danger"
                              style={{ padding: '6px 12px', fontSize: 12 }}
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
                              className="btn btn-primary"
                              style={{ padding: '6px 12px', fontSize: 12 }}
                              disabled={!!actionLoading}
                              onClick={() => handleAction(d.id, 'resume')}
                            >
                              <Play size={12} /> Resume
                            </button>
                            <button
                              className="btn btn-danger"
                              style={{ padding: '6px 12px', fontSize: 12 }}
                              disabled={!!actionLoading}
                              onClick={() => handleAction(d.id, 'stop')}
                            >
                              <Square size={12} /> Stop
                            </button>
                          </>
                        )}

                        {/* View detail */}
                        <Link
                          to={`/devices/${d.id}`}
                          className="btn btn-ghost"
                          style={{ padding: '6px 10px', fontSize: 12 }}
                        >
                          <ChevronRight size={14} />
                        </Link>

                        {/* Delete */}
                        <button
                          className="btn btn-danger"
                          style={{ padding: '6px 10px', fontSize: 12 }}
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
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default DeviceManager;
