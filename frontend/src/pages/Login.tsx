import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wifi, Globe, ArrowRight, Play } from 'lucide-react';
import { getLoginUrl } from '../api';

const REGIONS = [
  { id: 'in', label: 'India', flag: '🇮🇳', url: 'zoho.in' },
  { id: 'us', label: 'United States', flag: '🇺🇸', url: 'zoho.com' },
  { id: 'eu', label: 'Europe', flag: '🇪🇺', url: 'zoho.eu' },
  { id: 'au', label: 'Australia', flag: '🇦🇺', url: 'zoho.com.au' },
  { id: 'sa', label: 'Saudi Arabia', flag: '🇸🇦', url: 'zoho.sa' },
];

const Login: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'zohologin' | 'demo'>('zohologin');
  
  // Zoho Login State
  const [selectedRegion, setSelectedRegion] = useState('in');
  const [loading, setLoading] = useState(false);

  // Demo Login State
  const [demoConfig, setDemoConfig] = useState({
    brokerUrl: 'tcp://60863cfqlp.zohoiothub.in:1883',
    brokerPort: '1883',
    clientId: '',
    username: '',
    password: '',
    publishTopic: ''
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
    if (!demoConfig.clientId) {
      setDemoError('Client ID is required');
      return;
    }
    
    // Navigate directly to the new demo dashboard, passing config in state
    navigate('/demo', { state: { demoConfig } });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f4f5f7',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 0'
    }}>
      <div style={{ width: '100%', maxWidth: 480, padding: '0 24px' }}>
        {/* Logo header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56,
            background: 'var(--accent-blue)',
            borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Wifi size={26} color="#fff" />
          </div>
          <h1 style={{
            fontSize: 24, fontWeight: 700, color: 'var(--text-primary)',
            letterSpacing: '-0.3px', marginBottom: 6,
          }}>
            IoT Simulator Console
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Smart device simulation & monitoring
          </p>
        </div>

        {/* Tab selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button 
            onClick={() => setActiveTab('zohologin')}
            style={{
              flex: 1, padding: '12px 0', border: 'none', borderRadius: 8,
              background: activeTab === 'zohologin' ? 'var(--accent-blue)' : '#e0e4e8',
              color: activeTab === 'zohologin' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s'
            }}>
            Login with Zoho
          </button>
          <button 
            onClick={() => setActiveTab('demo')}
            style={{
              flex: 1, padding: '12px 0', border: 'none', borderRadius: 8,
              background: activeTab === 'demo' ? '#10b981' : '#e0e4e8',
              color: activeTab === 'demo' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s'
            }}>
            Demo Mode (Manual MQTT)
          </button>
        </div>

        {/* Login card */}
        <div style={{
          background: '#fff',
          border: '1px solid var(--border-subtle)',
          borderRadius: 12,
          padding: 28,
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>
          {activeTab === 'zohologin' ? (
            <>
              {/* Region selector */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                  <Globe size={16} />
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
                        borderRadius: 8,
                        border: selectedRegion === r.id
                          ? '1.5px solid var(--accent-blue)'
                          : '1px solid var(--border-subtle)',
                        background: selectedRegion === r.id
                          ? 'var(--accent-blue-light)'
                          : '#fff',
                        color: selectedRegion === r.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 500,
                        transition: 'all 0.15s',
                        fontFamily: 'var(--font-sans)',
                      }}
                    >
                      <span style={{ fontSize: 18 }}>{r.flag}</span>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{r.label}</div>
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
                  padding: '12px 24px',
                  background: loading ? '#90caf9' : 'var(--accent-blue)',
                  border: 'none',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'all 0.15s',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {loading ? (
                  <>
                    <div className="spinner" />
                    Redirecting to Zoho...
                  </>
                ) : (
                  <>
                    Login with Zoho
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <p style={{
                textAlign: 'center', marginTop: 16, fontSize: 12,
                color: 'var(--text-muted)', lineHeight: 1.5,
              }}>
                You will be redirected to Zoho to authorize access to your IoT devices.
              </p>
            </>
          ) : (
            <form onSubmit={handleDemoSubmit}>
              <div style={{
                background: '#ecfdf5', border: '1px solid #10b981', color: '#047857',
                padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '20px', lineHeight: 1.5
              }}>
                <strong>Demo Mode:</strong> Enter your custom MQTT credentials. The simulator will publish telemetry directly to your broker without logging into Zoho. 
                <br/><br/>
                <em>Note: Please ensure your account has <strong>Temperature</strong> and <strong>Humidity</strong> datapoints enabled.</em>
              </div>

              {demoError && (
                <div style={{ background: '#fef2f2', border: '1px solid #ef4444', color: '#b91c1c', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px' }}>
                  {demoError}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>Broker URL</label>
                  <input type="text" value={demoConfig.brokerUrl} onChange={e => setDemoConfig({...demoConfig, brokerUrl: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>Port</label>
                  <input type="text" value={demoConfig.brokerPort} onChange={e => setDemoConfig({...demoConfig, brokerPort: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }} required />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>Client ID / Device ID</label>
                <input type="text" value={demoConfig.clientId} onChange={e => setDemoConfig({...demoConfig, clientId: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }} required placeholder="e.g. my-device-123" />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>Username (Hub ID / Auth)</label>
                <input type="text" value={demoConfig.username} onChange={e => setDemoConfig({...demoConfig, username: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }} />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>Password / Device Token</label>
                <input type="password" value={demoConfig.password} onChange={e => setDemoConfig({...demoConfig, password: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }} />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>Publish Topic (Optional)</label>
                <input type="text" value={demoConfig.publishTopic} onChange={e => setDemoConfig({...demoConfig, publishTopic: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }} placeholder={`devices/${demoConfig.clientId || '{client_id}'}/telemetry`} />
              </div>
              <div style={{ marginTop: 24 }}>
                <button
                  type="submit"
                  style={{
                    width: '100%', padding: '12px 24px', background: '#10b981', border: 'none', borderRadius: 8,
                    color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2), 0 2px 4px -1px rgba(16, 185, 129, 0.1)'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
                >
                  <><Play size={16} /> Start Demo Session</>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <style>{`
        .spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top: 2px solid #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Login;
