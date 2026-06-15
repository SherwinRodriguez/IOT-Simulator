import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * This page handles the OAuth callback redirect from Zoho.
 * The backend processes the code at GET /oauth/callback and then
 * server-redirects to the frontend root '/'. React Router handles it here.
 * If there's an error param, we show it.
 */
const OAuthCallback: React.FC = () => {
  const [params] = useSearchParams();
  const navigate  = useNavigate();
  const { refetchUser } = useAuth();
  const error = params.get('error');

  useEffect(() => {
    if (error) return;
    // Re-hydrate user from session set by backend
    refetchUser().then(() => navigate('/', { replace: true }));
  }, [error]);

  if (error) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--bg-base)', gap: 16, textAlign: 'center', padding: 24,
      }}>
        <div style={{ fontSize: 48 }}>⚠️</div>
        <h1 style={{ color: 'var(--text-primary)', fontSize: 22, fontWeight: 700 }}>Authentication Failed</h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 380 }}>
          {error === 'state_mismatch'
            ? 'Security check failed. Please try logging in again.'
            : error === 'token_exchange_failed'
            ? 'Failed to exchange authorization code. Please try again.'
            : `Error: ${error}`}
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/login')}>
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg-base)', gap: 16,
    }}>
      <div style={{
        width: 52, height: 52,
        border: '3px solid var(--border-subtle)',
        borderTop: '3px solid var(--accent-green)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Completing sign-in…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default OAuthCallback;
