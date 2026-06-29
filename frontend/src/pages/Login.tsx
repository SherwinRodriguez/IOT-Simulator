import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wifi, Globe, ArrowRight, Play } from 'lucide-react';
import { getLoginUrl } from '../api';

const REGIONS = [
  { id: 'in', label: 'India',         flag: '🇮🇳', url: 'zoho.in' },
  { id: 'us', label: 'United States', flag: '🇺🇸', url: 'zoho.com' },
  { id: 'eu', label: 'Europe',        flag: '🇪🇺', url: 'zoho.eu' },
  { id: 'au', label: 'Australia',     flag: '🇦🇺', url: 'zoho.com.au' },
  { id: 'sa', label: 'Saudi Arabia',  flag: '🇸🇦', url: 'zoho.sa' },
];

const Login: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'zohologin' | 'demo'>('zohologin');
  const [selectedRegion, setSelectedRegion] = useState('in');
  const [loading, setLoading] = useState(false);
  const [demoConfig, setDemoConfig] = useState({
    brokerProtocol: 'tcp', brokerHost: '', brokerPort: '1883',
    clientId: '', username: '', password: '', publishTopic: ''
  });
  const [demoError, setDemoError] = useState('');
  const navigate = useNavigate();

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

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoConfig.clientId) { setDemoError('Client ID is required'); return; }
    const brokerUrl = demoConfig.brokerHost
      ? `${demoConfig.brokerProtocol}://${demoConfig.brokerHost}:${demoConfig.brokerPort}` : '';
    navigate('/demo', { state: { demoConfig: { ...demoConfig, brokerUrl } } });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f5e9 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 0',
    }}>
      <div style={{ width: '100%', maxWidth: 480, padding: '0 24px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, background: 'var(--accent-blue)', borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(26,115,232,0.25)',
          }}>
            <Wifi size={26} color="#fff" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px', marginBottom: 6 }}>
            IoT Simulator Console
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Smart device simulation &amp; monitoring
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[{ id: 'zohologin', label: 'Login with Zoho', color: 'var(--accent-blue)' },
            { id: 'demo', label: 'Demo Mode', color: '#10b981' }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} style={{
              flex: 1, padding: '12px 0', border: 'none', borderRadius: 8,
              background: activeTab === tab.id ? tab.color : '#e0e4e8',
              color: activeTab === tab.id ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s',
            }}>{tab.label}</button>
          ))}
        </div>

        {/* Card */}
        <div style={{
          background: '#fff', border: '1px solid var(--border-subtle)',
          borderRadius: 14, padding: 28, boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
        }}>
          {activeTab === 'zohologin' ? (
            <>
              {/* Region selector */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  <Globe size={16} /> Select your Zoho data center
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {REGIONS.map(r => (
                    <button key={r.id} onClick={() => setSelectedRegion(r.id)} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8,
                      border: selectedRegion === r.id ? '1.5px solid var(--accent-blue)' : '1px solid var(--border-subtle)',
                      background: selectedRegion === r.id ? 'var(--accent-blue-light)' : '#fff',
                      color: selectedRegion === r.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
                      cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
                    }}>
                      <span style={{ fontSize: 18 }}>{r.flag}</span>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{r.label}</div>
                        <div style={{ fontSize: 11, opacity: 0.7 }}>{r.url}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Login button */}
              <button onClick={handleLogin} disabled={loading} style={{
                width: '100%', padding: '13px 24px',
                background: loading ? '#90caf9' : 'var(--accent-blue)',
                border: 'none', borderRadius: 8, color: '#fff',
                fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 16px rgba(26,115,232,0.3)',
              }}>
                {loading
                  ? <><div className="spinner" /> Redirecting to Zoho...</>
                  : <> Sign in with Zoho <ArrowRight size={16} /></>}
              </button>

              <p style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                After sign-in, you'll select which IoT application to connect.
              </p>
            </>
          ) : (
            /* Demo Mode */
            <form onSubmit={handleDemoSubmit}>
              <div style={{ background: '#ecfdf5', border: '1px solid #10b981', color: '#047857', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '20px', lineHeight: 1.5 }}>
                <strong>Demo Mode:</strong> Connect to any MQTT broker to simulate telemetry without a Zoho account.
              </div>
              {demoError && <div style={{ background: '#fef2f2', border: '1px solid #ef4444', color: '#b91c1c', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px' }}>{demoError}</div>}
              {[
                { label: 'Client ID / Device ID', key: 'clientId', type: 'text', required: true },
                { label: 'Broker Host', key: 'brokerHost', type: 'text' },
                { label: 'Port', key: 'brokerPort', type: 'text' },
                { label: 'Username', key: 'username', type: 'text' },
                { label: 'Password / Token', key: 'password', type: 'password' },
                { label: 'Publish Topic (Optional)', key: 'publishTopic', type: 'text' },
              ].map(({ label, key, type, required }) => (
                <div key={key} style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5, color: 'var(--text-secondary)' }}>{label}</label>
                  <input type={type} value={(demoConfig as any)[key]} required={required}
                    onChange={e => setDemoConfig({ ...demoConfig, [key]: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', boxSizing: 'border-box' as const }} />
                </div>
              ))}
              <button type="submit" style={{ width: '100%', padding: '12px', background: '#10b981', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Play size={16} /> Start Demo Session
              </button>
            </form>
          )}
        </div>
      </div>
      <style>{`.spinner { width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top:2px solid #fff;border-radius:50%;animation:spin 0.7s linear infinite } @keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

export default Login;
