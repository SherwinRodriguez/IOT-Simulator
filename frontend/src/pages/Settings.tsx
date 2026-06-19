import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, Globe, Mail, User, Shield } from 'lucide-react';

const REGION_LABELS: Record<string, { name: string; flag: string; host: string }> = {
  in: { name: 'India',         flag: '🇮🇳', host: 'zoho.in' },
  us: { name: 'United States', flag: '🇺🇸', host: 'zoho.com' },
  eu: { name: 'Europe',        flag: '🇪🇺', host: 'zoho.eu' },
  au: { name: 'Australia',     flag: '🇦🇺', host: 'zoho.com.au' },
  sa: { name: 'Saudi Arabia',  flag: '🇸🇦', host: 'zoho.sa' },
};

const Settings: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const region = REGION_LABELS[user?.region || 'in'];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Your Zoho account and platform configuration</p>
      </div>

      {/* Account card */}
      <div className="card" style={{ marginBottom: 24, maxWidth: 600 }}>
        <h2 style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>Zoho Account</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Avatar + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 20, borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{
              width: 64, height: 64,
              background: 'var(--accent-blue)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, fontWeight: 800, color: '#fff',
              flexShrink: 0,
            }}>
              {user?.displayName?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{user?.displayName}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user?.email}</div>
            </div>
          </div>

          {/* Details */}
          {[
            { icon: <User size={15} />, label: 'Display Name', val: user?.displayName },
            { icon: <Mail size={15} />, label: 'Email', val: user?.email },
            { icon: <Shield size={15} />, label: 'Zoho User ID', val: user?.zohoUserId },
            { icon: <Globe size={15} />, label: 'Data Center', val: `${region?.flag} ${region?.name} (${region?.host})` },
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

      {/* Required scopes */}
      <div className="card" style={{ marginBottom: 24, maxWidth: 600 }}>
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
      <div className="card" style={{ maxWidth: 600, border: '1px solid #ef9a9a' }}>
        <h2 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: 'var(--accent-red)' }}>Sign Out</h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>
          This will revoke your Zoho access token and end your session.
        </p>
        <button className="btn btn-danger" onClick={handleLogout}>
          <LogOut size={14} /> Sign out of Zoho IoT Console
        </button>
      </div>
    </div>
  );
};

export default Settings;
