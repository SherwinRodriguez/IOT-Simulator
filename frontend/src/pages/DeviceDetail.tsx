import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, RotateCcw, Settings, BarChart2,
  Play, Square, PauseCircle, Tag, ChevronRight, Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getDevice, getDatapoints,
  startSimulation, stopSimulation, pauseSimulation, resumeSimulation,
  registerDevice,
} from '../api';

const DeviceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [device, setDevice] = useState<any>(null);
  const [datapoints, setDatapoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const authContext = useAuth();
  const isDemo = authContext?.user?.region === 'demo';

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
    setError('');
    try {
      if (action === 'start') {
        await getDatapoints(id);
        await startSimulation(id);
      }
      if (action === 'stop') await stopSimulation(id);
      if (action === 'pause') await pauseSimulation(id);
      if (action === 'resume') await resumeSimulation(id);
      await load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Simulation action failed');
    } finally { setActionBusy(false); }
  };

  const handleRegister = async () => {
    if (!id) return;
    setActionBusy(true);
    setError('');
    try {
      await registerDevice(id);
      await load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Registration failed. Keep the Zoho onboarding screen open and try again.');
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) return (
    <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading device…</div>
  );
  if (!device) return null;

  const isRunning = device.status === 'RUNNING';
  const isPaused = device.status === 'PAUSED';
  const isRegistered = Boolean(device.mqttBrokerUrl && device.mqttClientId && device.mqttUsername && device.mqttPassword && device.publishTopic);

  let tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'datapoints', label: 'Datapoints' },
    { key: 'config', label: 'Config', to: `/devices/${id}/config` },
    { key: 'data-explorer', label: 'Data Explorer', to: `/devices/${id}/graph` },
    { key: 'historical', label: 'Historical', to: `/devices/${id}/historical` },
  ];

  if (isDemo) {
    tabs = tabs.filter(t => t.key !== 'historical'); // "historical" fetches from zoho api
  }

  return (
    <div className="fade-in">
      {/* Header with breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => navigate('/devices')}>
          <ArrowLeft size={14} />
        </button>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Devices</span>
        <ChevronRight size={14} color="var(--text-muted)" />
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{device.name}</span>
      </div>

      {/* Tab Navigation */}
      <div className="tab-bar">
        {tabs.map(tab => (
          tab.to ? (
            <Link
              key={tab.key}
              to={tab.to}
              className="tab-item"
              style={{ textDecoration: 'none' }}
            >
              {tab.label}
            </Link>
          ) : (
            <button
              key={tab.key}
              className={`tab-item ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          )
        ))}

        {/* Actions on the right side */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, paddingBottom: 8 }}>
          {!isRunning && !isPaused && (
            isRegistered ? (
              <button
                className="btn btn-success"
                onClick={() => handleSim('start')}
                disabled={actionBusy}
                style={{ fontSize: 12 }}>
                <Play size={13} /> Start
              </button>
            ) : (
              <button
                className="btn btn-secondary"
                onClick={handleRegister}
                disabled={actionBusy}
                title="Fetch broker, client id, token and publish topic from Zoho IoT."
                style={{ fontSize: 12 }}>
                <RotateCcw size={13} /> Register
              </button>
            )
          )}
          {isRunning && (
            <>
              <button className="btn btn-secondary" onClick={() => handleSim('pause')} disabled={actionBusy} style={{ fontSize: 12 }}>
                <PauseCircle size={13} /> Pause
              </button>
              <button className="btn btn-danger" onClick={() => handleSim('stop')} disabled={actionBusy} style={{ fontSize: 12 }}>
                <Square size={13} /> Stop
              </button>
            </>
          )}
          {isPaused && (
            <>
              <button className="btn btn-success" onClick={() => handleSim('resume')} disabled={actionBusy} style={{ fontSize: 12 }}>
                <Play size={13} /> Resume
              </button>
              <button className="btn btn-danger" onClick={() => handleSim('stop')} disabled={actionBusy} style={{ fontSize: 12 }}>
                <Square size={13} /> Stop
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div>
          {/* Info cards row */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
            <div className="info-card">
              <div className="info-card-label">Status</div>
              <div>
                <span className={`badge ${isRunning ? 'badge-green' : isPaused ? 'badge-amber' : 'badge-gray'}`}>
                  {device.status}
                </span>
              </div>
            </div>
            <div className="info-card">
              <div className="info-card-label">Device Type</div>
              <div className="info-card-value">{device.deviceType || 'Direct Endpoint'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Type</div>
            </div>
            <div className="info-card">
              <div className="info-card-label">Connection</div>
              <div className="info-card-value">{device.connectivity || 'MQTT'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Protocol</div>
            </div>
            <div className="info-card">
              <div className="info-card-label">Last Activity Time</div>
              <div className="info-card-value">
                {device.lastSyncedAt ? new Date(device.lastSyncedAt).toLocaleString() : '--'}
              </div>
            </div>
          </div>

          {/* MQTT Connection Info */}
          <div className="card" style={{ marginBottom: 24 }}>
            <h2 style={{ fontWeight: 600, marginBottom: 16, fontSize: 15 }}>MQTT Connection</h2>
            {!isRegistered && (
              <div className="alert" style={{ borderColor: '#93c5fd', background: '#eff6ff', color: '#1d4ed8', marginBottom: 16 }}>
                Keep this device's Zoho onboarding screen open on the Connect step, then click Register. The app will connect to Zoho IoT with this device's MQTT credentials and refresh the device after registration.
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              {[
                ['Client ID', device.mqttClientId],
                ['Broker URL', device.mqttBrokerUrl],
                ['Username', device.mqttUsername],
                ['Publish Topic', device.publishTopic],
                ['Zoho Device ID', device.zohoDeviceId],
              ].map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontFamily: typeof val === 'string' && val?.includes('/') ? 'monospace' : 'inherit', fontSize: 13, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                    {val || '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link to={`/devices/${id}/graph`} className="btn btn-primary">
              <BarChart2 size={14} /> Live Telemetry
            </Link>
            <Link to={`/devices/${id}/historical`} className="btn btn-secondary">
              <BarChart2 size={14} /> Historical Data
            </Link>
            <Link to={`/devices/${id}/config`} className="btn btn-secondary">
              <Settings size={14} /> Simulator Config
            </Link>
          </div>
        </div>
      )}

      {activeTab === 'datapoints' && (
        <div>
          {/* Datapoints header */}
          <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Device Datapoints</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              {!isDemo && (
                <button className="btn btn-secondary" onClick={handleSyncDp} disabled={syncing}>
                  <RotateCcw size={14} className={syncing ? 'spinning' : ''} />
                  Fetch from Zoho
                </button>
              )}
              <button className="btn btn-primary" onClick={() => setShowAddDp(true)}>
                <Settings size={14} /> Add Datapoint
              </button>
            </div>
          </div>

          {isDemo && (
             <div style={{ marginBottom: 16, background: '#f8fafc', padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, color: 'var(--text-secondary)' }}>
                <Info size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: '-2px' }} />
                You are in Demo Mode. Datapoints are simulated locally and cannot be synchronized from Zoho.
             </div>
          )}

          {showAddDp && (
            <div className="card" style={{ marginBottom: 16, padding: 16 }}>
              <form onSubmit={handleAddDp} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Datapoint Name"
                  value={newDp.name}
                  onChange={e => setNewDp({ ...newDp, name: e.target.value })}
                  className="input"
                  style={{ flex: 1, minWidth: 180 }}
                  required
                />
                <select
                  value={newDp.dataType}
                  onChange={e => setNewDp({ ...newDp, dataType: e.target.value })}
                  className="input"
                  style={{ width: 110 }}
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
                  style={{ width: 90 }}
                />
                <input
                  type="text"
                  placeholder="Parsing Key"
                  value={newDp.parsingKey}
                  onChange={e => setNewDp({ ...newDp, parsingKey: e.target.value })}
                  className="input"
                  style={{ width: 130 }}
                />
                <button type="submit" className="btn btn-primary" disabled={addingDp} style={{ fontSize: 12 }}>
                  {addingDp ? 'Adding...' : 'Save'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddDp(false)} style={{ fontSize: 12 }}>
                  Cancel
                </button>
              </form>
            </div>
          )}

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {datapoints.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                <Tag size={28} style={{ margin: '0 auto 12px', display: 'block' }} />
                No datapoints defined. Add one above or sync from Zoho.
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
                        <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: 12 }}>{dp.parsingKey || '—'}</td>
                        <td>{dp.unit || '—'}</td>
                        <td><span className="badge badge-blue">{dp.dataType}</span></td>
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
        </div>
      )}
    </div>
  );
};

export default DeviceDetail;
