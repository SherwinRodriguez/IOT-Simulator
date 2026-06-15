import React, { useState } from 'react';
import { Activity, Globe, ArrowRight, Zap } from 'lucide-react';
import { getLoginUrl } from '../api';

const REGIONS = [
  { id: 'in', label: 'India', flag: '🇮🇳', url: 'zoho.in' },
  { id: 'us', label: 'United States', flag: '🇺🇸', url: 'zoho.com' },
  { id: 'eu', label: 'Europe', flag: '🇪🇺', url: 'zoho.eu' },
  { id: 'au', label: 'Australia', flag: '🇦🇺', url: 'zoho.com.au' },
  { id: 'sa', label: 'Saudi Arabia', flag: '🇸🇦', url: 'zoho.sa' },
];

const Login: React.FC = () => {
  const [selectedRegion, setSelectedRegion] = useState('in');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await getLoginUrl(selectedRegion);
      window.location.href = res.data.authorizationUrl;
    } catch (e) {
      console.error('Login initiation failed', e);
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow orbs */}
      <div style={{
        position: 'absolute', top: '20%', left: '15%',
        width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '20%', right: '15%',
        width: 350, height: 350,
        background: 'radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 460, padding: '0 24px' }}>
        {/* Logo header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 72, height: 72,
            background: 'linear-gradient(135deg, #22c55e, #06b6d4)',
            borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 0 40px rgba(34,197,94,0.3)',
          }}>
            <Activity size={32} color="#fff" />
          </div>
          <h1 style={{
            fontSize: 30, fontWeight: 800, color: 'var(--text-primary)',
            letterSpacing: '-0.5px', marginBottom: 8,
          }}>
            IoT Console
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>
            Smart device simulation & monitoring
          </p>
        </div>

        {/* Login card */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 20,
          padding: 32,
          boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
        }}>
          {/* Region selector */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Globe size={14} />
              Select your Zoho data center
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {REGIONS.map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRegion(r.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: selectedRegion === r.id
                      ? '1px solid var(--accent-cyan)'
                      : '1px solid var(--border-subtle)',
                    background: selectedRegion === r.id
                      ? 'rgba(6,182,212,0.08)'
                      : 'var(--bg-elevated)',
                    color: selectedRegion === r.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 500,
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 18 }}>{r.flag}</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 600 }}>{r.label}</div>
                    <div style={{ fontSize: 11, opacity: 0.7 }}>{r.url}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* OAuth button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px 24px',
              background: loading
                ? 'rgba(34,197,94,0.3)'
                : 'linear-gradient(135deg, #22c55e, #16a34a)',
              border: 'none',
              borderRadius: 12,
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              transition: 'all 0.2s',
              boxShadow: loading ? 'none' : '0 0 24px rgba(34,197,94,0.35)',
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: 16, height: 16,
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid #fff',
                  borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                }} />
                Redirecting to Zoho...
              </>
            ) : (
              <>
                <Zap size={18} />
                Login with Zoho
                <ArrowRight size={16} />
              </>
            )}
          </button>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            You will be redirected to Zoho to authorize access to your IoT devices. No passwords are stored.
          </p>
        </div>

        {/* Required scopes */}
        <div style={{ marginTop: 20, padding: '14px 16px', background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Required Permissions</div>
          {[
            'ZohoIOT.modules.devices.ALL',
            'ZohoIOT.modules.datapoints.ALL'
          ].map(scope => (
            <div key={scope} style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace', marginBottom: 3 }}>
              · {scope}
            </div>
          ))}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default Login;
