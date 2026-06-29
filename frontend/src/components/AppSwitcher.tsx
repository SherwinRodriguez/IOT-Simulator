import React, { useState, useEffect, useRef } from 'react';
import { Layers, ChevronDown, Check, Trash2, RefreshCw } from 'lucide-react';
import { getConnections, activateConnection, removeConnection, discoverConnections } from '../api';
import { useAuth } from '../context/AuthContext';

interface AppConnection {
  id: string;
  appDomain: string;
  appName: string;
  isActive: boolean;
  createdAt: string;
}

interface AppSwitcherProps {
  // reserved for future compact sidebar mode
}

/**
 * Application Switcher
 *
 * Allows the user to switch between saved Zoho IoT Sandbox applications
 * without logging out. The active application's domain is used for all
 * API calls (models, devices, datapoints).
 */
const AppSwitcher: React.FC<AppSwitcherProps> = () => {
  const { user, refetchUser } = useAuth();
  const [connections, setConnections]     = useState<AppConnection[]>([]);
  const [open, setOpen]                   = useState(false);
  const [discovering, setDiscovering]     = useState(false);
  const [switching, setSwitching]         = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeConn = connections.find(c => c.isActive);

  const load = async () => {
    try {
      const res = await getConnections();
      setConnections(res.data);
    } catch {
      setConnections([]);
    }
  };

  useEffect(() => { load(); }, [user?.appDomain]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleActivate = async (id: string) => {
    setSwitching(id);
    try {
      await activateConnection(id);
      await load();
      await refetchUser();
      setOpen(false);
    } finally {
      setSwitching(null);
    }
  };

  const handleRemove = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Remove this application connection?')) return;
    await removeConnection(id);
    await load();
    await refetchUser();
  };

  const handleDiscover = async () => {
    setDiscovering(true);
    try {
      const res = await discoverConnections();
      setConnections(res.data);
      await load();
      await refetchUser();
    } finally {
      setDiscovering(false);
    }
  };

  const shortLabel = (conn?: AppConnection) => {
    if (!conn) return 'No App Connected';
    return conn.appName || conn.appDomain.replace(/^https?:\/\//, '').split('.')[0];
  };

  if (connections.length === 0 && !open) {
    return (
      <div
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 10px', borderRadius: 8,
          background: '#fff3e0', border: '1px solid #ffe0b2',
          cursor: 'pointer', fontSize: 12, color: '#e65100',
        }}>
        <Layers size={13} />
        <span>Connect App</span>
      </div>
    );
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 8,
          background: open ? 'var(--accent-blue-light)' : 'var(--bg-secondary)',
          border: open ? '1.5px solid var(--accent-blue)' : '1px solid var(--border-subtle)',
          cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)',
          fontWeight: 500, transition: 'all 0.15s',
        }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: activeConn ? '#22c55e' : '#f97316',
          flexShrink: 0,
        }} />
        <Layers size={13} style={{ color: 'var(--accent-blue)' }} />
        <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {shortLabel(activeConn)}
        </span>
        <ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 6,
          minWidth: 280, background: '#fff',
          border: '1px solid var(--border-subtle)', borderRadius: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          zIndex: 1000, overflow: 'hidden',
        }}>
          <div style={{ padding: '10px 14px 8px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', borderBottom: '1px solid var(--border-subtle)' }}>
            Sandbox Applications
          </div>

          {connections.map(conn => (
            <div
              key={conn.id}
              onClick={() => !conn.isActive && handleActivate(conn.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px',
                cursor: conn.isActive ? 'default' : 'pointer',
                background: conn.isActive ? 'var(--accent-blue-light)' : 'transparent',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (!conn.isActive) (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)'; }}
              onMouseLeave={e => { if (!conn.isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: conn.isActive ? '#22c55e' : '#d1d5db', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {conn.appName || 'Unnamed'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {conn.appDomain.replace('https://', '')}
                </div>
              </div>
              {conn.isActive ? (
                <Check size={14} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
              ) : switching === conn.id ? (
                <RefreshCw size={13} style={{ color: 'var(--text-muted)', flexShrink: 0, animation: 'spin 1s linear infinite' }} />
              ) : (
                <button
                  onClick={e => handleRemove(conn.id, e)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-muted)', flexShrink: 0, borderRadius: 4 }}
                  title="Remove this connection">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}

          {/* Add new connection */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '8px 14px 10px' }}>
            <button
              onClick={handleDiscover}
              disabled={discovering}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                fontSize: 13, color: discovering ? 'var(--text-muted)' : 'var(--accent-blue)',
                background: 'none', border: 'none', cursor: discovering ? 'not-allowed' : 'pointer',
                padding: '4px 0', fontWeight: 500, width: '100%',
              }}>
              <RefreshCw size={14} style={{ animation: discovering ? 'spin 1s linear infinite' : undefined }} />
              Refresh Applications
            </button>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AppSwitcher;
