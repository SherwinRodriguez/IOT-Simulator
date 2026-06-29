import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw, Play, Square, PauseCircle, ChevronRight,
  Cpu, Trash2, RotateCcw, AlertCircle
} from 'lucide-react';
import {
  getDevices, syncDevices, createDevice, getModels,
  registerDevice,
  getDatapoints,
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
  const [notice, setNotice] = useState('');

  // Add Device Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [creatingDevice, setCreatingDevice] = useState(false);
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [newModel, setNewModel] = useState({
    name: '',
    description: '',
    model_id: ''
  });

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
      setNotice('');
    } catch (e: any) { 
      setError(e.response?.data?.error || 'Zoho sync failed. Check your credentials or ensure you selected a Sandbox Application during login.'); 
    }
    finally { setSyncing(false); }
  };

  const handleRegister = async (id: string) => {
    setActionLoading(`${id}-register`);
    try {
      await registerDevice(id);
      await fetchDevices();
      setError('');
      setNotice('Registration attempted through MQTT. If the device is still not registered, keep the Zoho onboarding screen open and click Register again.');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Registration failed. Keep the Zoho onboarding screen open and try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAction = async (id: string, action: 'start' | 'stop' | 'pause' | 'resume' | 'delete') => {
    setActionLoading(`${id}-${action}`);
    try {
      if (action === 'start') {
        await getDatapoints(id);
        await startSimulation(id);
      }
      if (action === 'stop')    await stopSimulation(id);
      if (action === 'pause')   await pauseSimulation(id);
      if (action === 'resume')  await resumeSimulation(id);
      if (action === 'delete') {
        if (!window.confirm('Delete this device? This cannot be undone.')) return;
        await deleteDevice(id);
      }
      await fetchDevices();
      setNotice('');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Action failed');
    } finally { setActionLoading(null); }
  };

  const handleAddDevice = async () => {
    setCreatingDevice(true);
    try {
      await createDevice({
        name: newModel.name,
        description: newModel.description,
        model_id: newModel.model_id
      });
      await syncDevices();
      setShowAddModal(false);
      setNewModel({ name: '', description: '', model_id: availableModels[0]?.id || '' });
      await fetchDevices();
      setError('');
      setNotice('Device created with MQTT and Security Token without TLS. The app synced registration details from Zoho; if it still shows Not registered, open the device in Zoho IoT onboarding once, then click Register.');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to create device/model');
    } finally {
      setCreatingDevice(false);
    }
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
              <button className="btn btn-primary" onClick={async () => {
                setShowAddModal(true);
                if (availableModels.length === 0) {
                  setFetchingModels(true);
                  try {
                    const res = await getModels();
                    setAvailableModels(res.data);
                    if (res.data.length > 0) {
                      setNewModel(prev => ({ ...prev, model_id: res.data[0].id }));
                    }
                  } catch (e: any) {
                    setError(e.response?.data?.error || 'Failed to load models for the selected Sandbox application.');
                  } finally {
                    setFetchingModels(false);
                  }
                }
              }}>
                + New Device
              </button>
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

      {notice && (
        <div className="alert" style={{ borderColor: '#93c5fd', background: '#eff6ff', color: '#1d4ed8' }}>
          <AlertCircle size={16} /> {notice}
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
                const isRegistered = Boolean(d.mqttBrokerUrl && d.mqttClientId && d.mqttUsername && d.mqttPassword && d.publishTopic);

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
                        <span className={`conn-dot ${isRunning ? 'conn-dot-connected' : isRegistered ? 'conn-dot-registered' : 'conn-dot-disconnected'}`} />
                        <span style={{ fontSize: 13 }}>{isRunning ? 'Connected' : isRegistered ? 'Registered' : 'Not registered'}</span>
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
                          isRegistered ? (
                            <button
                              className="btn btn-success"
                              style={{ padding: '5px 12px', fontSize: 12 }}
                              disabled={actionLoading === `${d.id}-start`}
                              onClick={() => handleAction(d.id, 'start')}
                            >
                              <Play size={12} /> Start
                            </button>
                          ) : (
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '5px 12px', fontSize: 12 }}
                              disabled={actionLoading === `${d.id}-register`}
                              title="Fetch broker, client id, token and publish topic from Zoho IoT."
                              onClick={() => handleRegister(d.id)}
                            >
                              <RefreshCw size={12} /> Register
                            </button>
                          )
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

      {/* Add Device Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header" style={{ marginBottom: 20 }}>
              <h2 className="modal-title" style={{ marginBottom: 0 }}>Create New Device</h2>
              <button className="btn btn-ghost" onClick={() => setShowAddModal(false)} style={{ padding: 4, position: 'absolute', top: 20, right: 20 }}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Device Name <span style={{color: 'red'}}>*</span></label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Enter Device Name" 
                  value={newModel.name}
                  onChange={e => setNewModel({...newModel, name: e.target.value})}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Select Device Model <span style={{color: 'red'}}>*</span></label>
                {fetchingModels ? (
                  <div style={{ padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-muted)', fontSize: 14 }}>
                    Loading available models...
                  </div>
                ) : (
                  <select 
                    className="input-field" 
                    value={newModel.model_id}
                    onChange={e => setNewModel({...newModel, model_id: e.target.value})}
                    style={{ backgroundColor: '#fff' }}
                  >
                    <option value="" disabled>Select a model...</option>
                    {availableModels.map(model => (
                      <option key={model.id} value={model.id}>
                        {model.display_name || model.name}
                      </option>
                    ))}
                  </select>
                )}
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  Models are managed in Zoho IoT Developer Mode.
                </p>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Description</label>
                <textarea 
                  className="input-field" 
                  placeholder="Enter Description (optional)" 
                  rows={3}
                  value={newModel.description}
                  onChange={e => setNewModel({...newModel, description: e.target.value})}
                ></textarea>
                <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  {newModel.description.length}/250
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleAddDevice} disabled={creatingDevice || !newModel.name || !newModel.model_id}>
                  {creatingDevice ? 'Creating...' : 'Create Device'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceManager;
