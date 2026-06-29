import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Check, Wifi, ArrowRight, RefreshCw, LogOut, AlertCircle, Plus } from 'lucide-react';
import { getConnections, discoverConnections, activateConnection, getCurrentUser, logout as apiLogout, addConnection } from '../api';

interface AppConnection {
  id: string;
  appDomain: string;
  appName: string;
  isActive: boolean;
  createdAt: string;
}

const SelectApplication: React.FC = () => {
  const navigate = useNavigate();
  const [connections, setConnections] = useState<AppConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [activating, setActivating] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [appName, setAppName] = useState('');
  const [appDomain, setAppDomain] = useState('');
  const [adding, setAdding] = useState(false);

  const load = async (discover = false) => {
    setLoading(!discover);
    setDiscovering(discover);
    setError('');
    try {
      const [userRes, connRes] = await Promise.all([
        getCurrentUser(),
        discover ? discoverConnections() : getConnections(),
      ]);
      setUser(userRes.data);
      setConnections(connRes.data);
    } catch (e: any) {
      if (e.response?.status === 401 || e.response?.status === 403) {
        navigate('/login');
        return;
      }
      setError(e.response?.data?.error || 'Zoho did not expose any IoT sandbox application domain for this account.');
    } finally {
      setLoading(false);
      setDiscovering(false);
    }
  };

  useEffect(() => { load(true); }, []);

  const handleActivate = async (conn: AppConnection) => {
    setActivating(conn.id);
    setError('');
    try {
      await activateConnection(conn.id);
      navigate('/');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Could not switch to the selected application.');
      setActivating(null);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setError('');
    try {
      const res = await addConnection({ appName, appDomain });
      await activateConnection(res.data.id);
      navigate('/');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Could not validate this Zoho IoT sandbox.');
    } finally {
      setAdding(false);
    }
  };

  const handleLogout = async () => {
    await apiLogout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4ff' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--accent-blue)', borderTop: '3px solid transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Finding your Zoho IoT applications...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f5e9 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px',
    }}>
      <div style={{ width: '100%', maxWidth: 760 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, background: 'var(--accent-blue)', borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(26,115,232,0.25)',
          }}>
            <Wifi size={26} color="#fff" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
            Select Application
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            {user && <>Welcome, <strong>{user.displayName}</strong>. </>}
            Choose the Zoho IoT Sandbox to use.
          </p>
        </div>

        {error && (
          <div style={{
            display: 'flex', gap: 10, alignItems: 'flex-start',
            background: '#fff7ed', border: '1px solid #fdba74', color: '#9a3412',
            borderRadius: 8, padding: 14, marginBottom: 18, fontSize: 13,
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ lineHeight: 1.45 }}>{error}</div>
          </div>
        )}

        {connections.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 16, marginBottom: 20 }}>
            {connections.map(conn => (
              <button
                key={conn.id}
                onClick={() => !activating && handleActivate(conn)}
                style={{
                  textAlign: 'left',
                  background: '#fff', borderRadius: 8, padding: '22px 18px',
                  border: conn.isActive ? '2px solid var(--accent-blue)' : '1px solid var(--border-subtle)',
                  boxShadow: conn.isActive ? '0 4px 20px rgba(26,115,232,0.14)' : '0 2px 10px rgba(0,0,0,0.06)',
                  cursor: activating ? 'wait' : 'pointer',
                  transition: 'all 0.2s', position: 'relative', minHeight: 170,
                }}>
                {conn.isActive && (
                  <div style={{
                    position: 'absolute', top: 12, right: 12,
                    background: '#22c55e', color: '#fff', borderRadius: 6,
                    fontSize: 10, fontWeight: 700, padding: '2px 7px',
                  }}>ACTIVE</div>
                )}

                <div style={{
                  width: 44, height: 44, borderRadius: 8,
                  background: conn.isActive ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
                }}>
                  <Layers size={21} color={conn.isActive ? '#fff' : 'var(--accent-blue)'} />
                </div>

                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 5, wordBreak: 'break-word' }}>
                  {conn.appName || conn.appDomain.replace(/^https?:\/\//, '').split('.')[0]}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 18 }}>
                  {conn.appDomain.replace(/^https?:\/\//, '')}
                </div>

                {activating === conn.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--accent-blue)', fontWeight: 600 }}>
                    <RefreshCw size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Connecting...
                  </div>
                ) : conn.isActive ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#22c55e', fontWeight: 600 }}>
                    <Check size={14} /> Continue
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--accent-blue)', fontWeight: 600 }}>
                    Select <ArrowRight size={14} />
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div style={{
            background: '#fff', borderRadius: 8, padding: '30px 26px', textAlign: 'center',
            border: '1px solid var(--border-subtle)', boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
            marginBottom: 20,
          }}>
            <Layers size={38} style={{ color: 'var(--accent-blue)', opacity: 0.5, marginBottom: 14 }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              No Zoho IoT applications found
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 460, margin: '0 auto 22px' }}>
              Add your sandbox once. The simulator validates it with your Zoho account before saving.
            </p>
          </div>
        )}

        <form
          onSubmit={handleAdd}
          style={{
            background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 8,
            padding: 18, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', marginBottom: 18,
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 14 }}>
            <Plus size={16} /> Add Zoho IoT Sandbox
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 1fr) minmax(260px, 2fr)', gap: 10, marginBottom: 12 }}>
            <input
              value={appName}
              onChange={e => setAppName(e.target.value)}
              placeholder="Name"
              style={{ padding: '10px 12px', border: '1px solid var(--border-subtle)', borderRadius: 6, fontSize: 13 }}
            />
            <input
              value={appDomain}
              onChange={e => setAppDomain(e.target.value)}
              placeholder="https://app1234xxxx.zohoiot.in"
              required
              style={{ padding: '10px 12px', border: '1px solid var(--border-subtle)', borderRadius: 6, fontSize: 13, fontFamily: 'monospace' }}
            />
          </div>
          <button
            type="submit"
            disabled={adding}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              width: '100%', padding: '10px 14px', borderRadius: 8, border: 'none',
              background: adding ? '#90caf9' : 'var(--accent-blue)', color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: adding ? 'not-allowed' : 'pointer',
            }}>
            {adding ? <RefreshCw size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Check size={14} />}
            Validate and Connect
          </button>
        </form>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
          <button
            onClick={() => load(true)}
            disabled={discovering}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700,
              color: '#fff', background: discovering ? '#90caf9' : 'var(--accent-blue)',
              border: 'none', borderRadius: 8, cursor: discovering ? 'not-allowed' : 'pointer',
              padding: '10px 16px',
            }}>
            <RefreshCw size={14} style={{ animation: discovering ? 'spin 0.8s linear infinite' : undefined }} />
            Refresh Applications
          </button>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default SelectApplication;
