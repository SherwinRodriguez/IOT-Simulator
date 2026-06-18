import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, RotateCcw, Settings, BarChart2,
  Play, Square, PauseCircle, Tag
} from 'lucide-react';
import {
  getDevice, getDatapoints,
  startSimulation, stopSimulation, pauseSimulation, resumeSimulation,
} from '../api';

const DeviceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [device, setDevice] = useState<any>(null);
  const [datapoints, setDatapoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const [newDp, setNewDp] = useState({ name: '', dataType: 'Numeric', unit: '', parsingKey: '' });
  const [showAddDp, setShowAddDp] = useState(false);
  const [addingDp, setAddingDp] = useState(false);

  const load = async () => {
    if (!id) return;
    try {
      const [devRes, dpRes] = await Promise.all([getDevice(id), getDatapoints(id)]);
      setDevice(devRes.data);
      setDatapoints(dpRes.data);
    } catch { navigate('/devices'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleSyncDp = async () => {
    if (!id) return;
    setSyncing(true);
    try { await load(); }
    finally { setSyncing(false); }
  };

  const handleAddDp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newDp.name.trim()) return;
    setAddingDp(true);
    try {
      const { addDatapoint } = await import('../api');
      await addDatapoint(id, newDp);
      setNewDp({ name: '', dataType: 'Numeric', unit: '', parsingKey: '' });
      setShowAddDp(false);
      await load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add datapoint');
    } finally {
      setAddingDp(false);
    }
  };

  const handleDeleteDp = async (dpId: string) => {
    if (!id || !confirm('Are you sure you want to delete this datapoint?')) return;
    try {
      const { deleteDatapoint } = await import('../api');
      await deleteDatapoint(id, dpId);
      await load();
    } catch (err: any) {
      alert('Failed to delete datapoint');
    }
  };

  const handleSim = async (action: 'start' | 'stop' | 'pause' | 'resume') => {
    if (!id) return;
    setActionBusy(true);
    try {
      if (action === 'start') await startSimulation(id);
      if (action === 'stop') await stopSimulation(id);
      if (action === 'pause') await pauseSimulation(id);
      if (action === 'resume') await resumeSimulation(id);
      await load();
    } finally { setActionBusy(false); }
  };

  if (loading) return (
    <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading device…</div>
  );
  if (!device) return null;

  const isRunning = device.status === 'RUNNING';
  const isPaused = device.status === 'PAUSED';

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <button className="btn btn-ghost" style={{ marginBottom: 16 }} onClick={() => navigate('/devices')}>
          <ArrowLeft size={14} /> Back to Devices
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <h1 className="page-title">{device.name}</h1>
              <span className={`badge ${isRunning ? 'badge-green' : isPaused ? 'badge-amber' : 'badge-gray'}`}>
                <span className={`pulse-dot ${isRunning ? 'pulse-dot-green' : isPaused ? 'pulse-dot-amber' : 'pulse-dot-gray'}`} />
                {device.status}
              </span>
            </div>
            <p className="page-subtitle">
              {device.deviceType} · {device.connectivity || 'MQTT'} · ID: <code style={{ fontFamily: 'monospace', fontSize: 12 }}>{device.zohoDeviceId}</code>
            </p>
          </div>
          {/* Simulation controls */}
          <div style={{ display: 'flex', gap: 8 }}>
            {!isRunning && !isPaused && (
              <button className="btn btn-primary" onClick={() => handleSim('start')} disabled={actionBusy}>
                <Play size={14} /> Start Simulation
              </button>
            )}
            {isRunning && (
              <>
                <button className="btn btn-secondary" onClick={() => handleSim('pause')} disabled={actionBusy}>
                  <PauseCircle size={14} /> Pause
                </button>
                <button className="btn btn-danger" onClick={() => handleSim('stop')} disabled={actionBusy}>
                  <Square size={14} /> Stop
                </button>
              </>
            )}
            {isPaused && (
              <>
                <button className="btn btn-primary" onClick={() => handleSim('resume')} disabled={actionBusy}>
                  <Play size={14} /> Resume
                </button>
                <button className="btn btn-danger" onClick={() => handleSim('stop')} disabled={actionBusy}>
                  <Square size={14} /> Stop
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
        <Link to={`/devices/${id}/graph`} className="btn btn-cyan">
          <BarChart2 size={14} /> Live Graph
        </Link>
        <Link to={`/devices/${id}/historical`} className="btn btn-primary" style={{ backgroundColor: '#6366f1', color: '#fff', border: 'none' }}>
          <BarChart2 size={14} /> Historical Graph
        </Link>
        <Link to={`/devices/${id}/config`} className="btn btn-secondary">
          <Settings size={14} /> Simulator Config
        </Link>
      </div>

      {/* MQTT Info */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontWeight: 700, marginBottom: 16, fontSize: 16 }}>MQTT Connection</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {[
            ['Client ID', device.mqttClientId],
            ['Username', device.mqttUsername],
            ['Publish Topic', device.publishTopic],
            ['Last Synced', device.lastSyncedAt ? new Date(device.lastSyncedAt).toLocaleString() : 'Never'],
          ].map(([label, val]) => (
            <div key={label}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: typeof val === 'string' && val?.includes('/') ? 'monospace' : 'inherit', fontSize: 13, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                {val || '—'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Datapoints */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: 12 }}>
          <h2 style={{ fontWeight: 700, fontSize: 16 }}>
            Datapoints <span style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 400 }}>({datapoints.length})</span>
          </h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={() => setShowAddDp(!showAddDp)}>
              + Add Datapoint
            </button>
            <button className="btn btn-secondary" onClick={handleSyncDp} disabled={syncing} style={{ fontSize: 13 }}>
              {syncing ? <RotateCcw size={13} style={{ animation: 'spin 0.7s linear infinite' }} /> : <RotateCcw size={13} />}
              Refresh
            </button>
          </div>
        </div>

        {showAddDp && (
          <div style={{ padding: '16px 24px', backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-subtle)' }}>
            <form onSubmit={handleAddDp} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Datapoint Name (e.g. soil_temp)"
                value={newDp.name}
                onChange={e => setNewDp({ ...newDp, name: e.target.value })}
                className="input"
                style={{ flex: 1, minWidth: 200 }}
                required
              />
              <select
                value={newDp.dataType}
                onChange={e => setNewDp({ ...newDp, dataType: e.target.value })}
                className="input"
                style={{ width: 120 }}
              >
                <option value="Numeric">Numeric</option>
                <option value="string">String</option>
                <option value="boolean">Boolean</option>
              </select>
              <input
                type="text"
                placeholder="Unit (e.g. °C)"
                value={newDp.unit}
                onChange={e => setNewDp({ ...newDp, unit: e.target.value })}
                className="input"
                style={{ width: 100 }}
              />
              <input
                type="text"
                placeholder="Parsing Key (e.g. temp)"
                value={newDp.parsingKey}
                onChange={e => setNewDp({ ...newDp, parsingKey: e.target.value })}
                className="input"
                style={{ width: 150 }}
              />
              <button type="submit" className="btn btn-primary" disabled={addingDp}>
                {addingDp ? 'Adding...' : 'Save'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowAddDp(false)}>
                Cancel
              </button>
            </form>
          </div>
        )}

        {datapoints.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            <Tag size={32} style={{ margin: '0 auto 12px', display: 'block' }} />
            No datapoints defined. Add one manually or click "Sync Defaults".
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Parsing Key</th>
                <th>Unit</th>
                <th>Type</th>
                <th>Pattern</th>
                <th>Range</th>
                <th>Interval</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {datapoints.map((dp) => {
                const cfg = dp.simulationConfig;
                return (
                  <tr key={dp.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{dp.name}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{dp.parsingKey || '—'}</td>
                    <td>{dp.unit || '—'}</td>
                    <td><span className="badge badge-cyan">{dp.dataType}</span></td>
                    <td>
                      {cfg ? (
                        <span className={`badge ${cfg.pattern === 'INCREMENTAL' ? 'badge-green' : cfg.pattern === 'DECREMENTAL' ? 'badge-red' : 'badge-cyan'}`}>
                          {cfg.pattern}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {cfg ? `${cfg.minValue} – ${cfg.maxValue}` : '—'}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {cfg ? `${cfg.publishIntervalMs / 1000}s` : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '4px 8px', fontSize: 11 }}
                        onClick={() => handleDeleteDp(dp.id)}
                      >
                        Delete
                      </button>
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

export default DeviceDetail;
