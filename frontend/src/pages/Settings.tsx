import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, Globe, Mail, User, Shield, Layers, Check, Trash2, RefreshCw, Plus } from 'lucide-react';
import { getConnections, discoverConnections, activateConnection, removeConnection, addConnection } from '../api';

const REGION_LABELS: Record<string, { name: string; flag: string; host: string }> = {
  in: { name: 'India',         flag: '🇮🇳', host: 'zoho.in' },
  us: { name: 'United States', flag: '🇺🇸', host: 'zoho.com' },
  eu: { name: 'Europe',        flag: '🇪🇺', host: 'zoho.eu' },
  au: { name: 'Australia',     flag: '🇦🇺', host: 'zoho.com.au' },
  sa: { name: 'Saudi Arabia',  flag: '🇸🇦', host: 'zoho.sa' },
};

interface AppConnection {
  id: string;
  appDomain: string;
  appName: string;
  isActive: boolean;
  createdAt: string;
}

const Settings: React.FC = () => {
  const { user, logout, refetchUser } = useAuth();
  const navigate = useNavigate();
  const region = REGION_LABELS[user?.region || 'in'];

  const [connections, setConnections]   = useState<AppConnection[]>([]);
  const [discovering, setDiscovering]   = useState(false);
  const [switching, setSwitching]       = useState<string | null>(null);
  const [appName, setAppName]           = useState('');
  const [appDomain, setAppDomain]       = useState('');
  const [adding, setAdding]             = useState(false);
  const [connectionError, setConnectionError] = useState('');

  const loadConnections = async () => {
    try {
      const res = await getConnections();
      setConnections(res.data);
    } catch { setConnections([]); }
  };

  useEffect(() => { loadConnections(); }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleActivate = async (id: string) => {
    setSwitching(id);
    try {
      await activateConnection(id);
      await loadConnections();
      await refetchUser();
    } finally { setSwitching(null); }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this application connection?')) return;
    await removeConnection(id);
    await loadConnections();
    await refetchUser();
  };

  const handleDiscover = async () => {
    setDiscovering(true);
    setConnectionError('');
    try {
      const res = await discoverConnections();
      setConnections(res.data);
      await loadConnections();
      await refetchUser();
    } catch (e: any) {
      setConnectionError(e.response?.data?.error || 'Could not refresh applications.');
    } finally { setDiscovering(false); }
  };

  const handleAddConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setConnectionError('');
    try {
      await addConnection({ appName, appDomain });
      setAppName('');
      setAppDomain('');
      await loadConnections();
      await refetchUser();
    } catch (e: any) {
      setConnectionError(e.response?.data?.error || 'Could not validate this Zoho IoT sandbox.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Your Zoho account and platform configuration</p>
      </div>

      {/* Account card */}
      <div className="card" style={{ marginBottom: 24, maxWidth: 640 }}>
        <h2 style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>Zoho Account</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Avatar + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 20, borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{
              width: 64, height: 64,
              background: 'var(--accent-blue)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, fontWeight: 800, color: '#fff', flexShrink: 0,
            }}>
              {user?.displayName?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{user?.displayName}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user?.email}</div>
            </div>
          </div>
          {[
            { icon: <User size={15} />,   label: 'Display Name',  val: user?.displayName },
            { icon: <Mail size={15} />,   label: 'Email',         val: user?.email },
            { icon: <Shield size={15} />, label: 'Zoho User ID',  val: user?.zohoUserId },
            { icon: <Globe size={15} />,  label: 'Data Center',   val: `${region?.flag} ${region?.name} (${region?.host})` },
          ].map(({ icon, label, val }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ color: 'var(--text-muted)', width: 20 }}>{icon}</div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)', fontFamily: label === 'Zoho User ID' ? 'monospace' : 'inherit' }}>{val || '—'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Connected Applications */}
      <div className="card" style={{ marginBottom: 24, maxWidth: 640 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>Connected Applications</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              Each Sandbox application has its own devices, models, and datapoints.
            </p>
          </div>
          <Layers size={20} style={{ color: 'var(--accent-blue)', opacity: 0.7 }} />
        </div>

        {connections.length === 0 && (
          <div style={{
            padding: '20px 16px', textAlign: 'center',
            background: '#fff8e1', border: '1px dashed #ffd54f',
            borderRadius: 10, marginBottom: 16,
          }}>
            <Layers size={28} style={{ color: '#f9a825', marginBottom: 8 }} />
            <div style={{ fontWeight: 600, fontSize: 14, color: '#5d4037', marginBottom: 4 }}>No application connected</div>
            <div style={{ fontSize: 13, color: '#795548' }}>
              Refresh applications after signing in with a Zoho IoT account.
            </div>
          </div>
        )}

        {/* Connection list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: connections.length > 0 ? 16 : 0 }}>
          {connections.map(conn => (
            <div key={conn.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', borderRadius: 10,
              border: conn.isActive ? '1.5px solid var(--accent-blue)' : '1px solid var(--border-subtle)',
              background: conn.isActive ? 'var(--accent-blue-light)' : 'var(--bg-secondary)',
              transition: 'all 0.2s',
            }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                background: conn.isActive ? '#22c55e' : '#d1d5db',
                boxShadow: conn.isActive ? '0 0 0 3px rgba(34,197,94,0.2)' : 'none',
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 2 }}>
                  {conn.appName || 'Unnamed Application'}
                  {conn.isActive && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--accent-blue)', fontWeight: 500 }}>Active</span>}
                </div>
                <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {conn.appDomain}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {!conn.isActive && (
                  <button
                    onClick={() => handleActivate(conn.id)}
                    disabled={!!switching}
                    style={{
                      padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                      background: 'var(--accent-blue)', color: '#fff',
                      border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                    {switching === conn.id ? <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={11} />}
                    Switch
                  </button>
                )}
                <button
                  onClick={() => handleRemove(conn.id)}
                  style={{
                    padding: '6px 8px', borderRadius: 6, fontSize: 12,
                    background: 'transparent', color: 'var(--text-muted)',
                    border: '1px solid var(--border-subtle)', cursor: 'pointer',
                  }}
                  title="Remove connection">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {connectionError && (
          <div style={{ background: '#fff7ed', border: '1px solid #fdba74', color: '#9a3412', borderRadius: 8, padding: 10, fontSize: 12, marginBottom: 12 }}>
            {connectionError}
          </div>
        )}

        <form onSubmit={handleAddConnection} style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 10 }}>
            <Plus size={14} /> Add Sandbox
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, marginBottom: 10 }}>
            <input
              value={appName}
              onChange={e => setAppName(e.target.value)}
              placeholder="Name"
              style={{ padding: '9px 10px', borderRadius: 6, border: '1px solid var(--border-subtle)', fontSize: 13 }}
            />
            <input
              value={appDomain}
              onChange={e => setAppDomain(e.target.value)}
              placeholder="https://app1234xxxx.zohoiot.in"
              required
              style={{ padding: '9px 10px', borderRadius: 6, border: '1px solid var(--border-subtle)', fontSize: 13, fontFamily: 'monospace' }}
            />
          </div>
          <button
            type="submit"
            disabled={adding}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '9px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: adding ? '#90caf9' : '#111827', color: '#fff',
              border: 'none', cursor: adding ? 'not-allowed' : 'pointer', width: '100%',
            }}>
            {adding ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
            Validate and Save
          </button>
        </form>

        <button
          onClick={handleDiscover}
          disabled={discovering}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '9px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: discovering ? '#90caf9' : 'var(--accent-blue)', color: '#fff',
            border: 'none', cursor: discovering ? 'not-allowed' : 'pointer', width: '100%',
            justifyContent: 'center', transition: 'all 0.15s',
          }}>
          <RefreshCw size={14} style={{ animation: discovering ? 'spin 1s linear infinite' : undefined }} />
          Refresh Applications
        </button>
      </div>

      {/* Active Permissions */}
      <div className="card" style={{ marginBottom: 24, maxWidth: 640 }}>
        <h2 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Active Permissions</h2>
        {[
          { scope: 'ZohoIOT.modules.devices.ALL',            desc: 'Read and manage IoT devices' },
          { scope: 'ZohoIOT.modules.datapoints.ALL',         desc: 'Read and manage datapoints' },
          { scope: 'ZohoIOT.modules.datapoints.data.CREATE', desc: 'Publish telemetry data' },
          { scope: 'ZohoIOT.settings.cirrus.data.READ',      desc: 'Read account settings' },
        ].map(({ scope, desc }) => (
          <div key={scope} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <span className="badge badge-green" style={{ whiteSpace: 'nowrap', alignSelf: 'flex-start', marginTop: 2 }}>✓</span>
            <div>
              <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-primary)' }}>{scope}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Logout */}
      <div className="card" style={{ maxWidth: 640, border: '1px solid #ef9a9a' }}>
        <h2 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: 'var(--accent-red)' }}>Sign Out</h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>
          This will revoke your Zoho access token and end your session.
        </p>
        <button className="btn btn-danger" onClick={handleLogout}>
          <LogOut size={14} /> Sign out of Zoho IoT Console
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default Settings;
