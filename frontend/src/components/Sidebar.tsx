import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Cpu, Settings, LogOut, Wifi, WifiOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';

const navItems = [
  { to: '/',        icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/devices', icon: Cpu,             label: 'Devices'   },
  { to: '/settings',icon: Settings,        label: 'Settings'  },
];

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const { isConnected }  = useWebSocket();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div style={{
        padding: '14px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div style={{
          width: 32, height: 32,
          background: 'var(--accent-blue)',
          borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Wifi size={16} color="#fff" />
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '8px 0' }}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `sidebar-item ${isActive ? 'active' : ''}`
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom: WS + User */}
      <div style={{ padding: '8px 0', borderTop: '1px solid var(--border-subtle)' }}>
        {/* WebSocket status */}
        <div className="sidebar-item" style={{ cursor: 'default' }}>
          {isConnected
            ? <Wifi size={16} color="var(--accent-green)" />
            : <WifiOff size={14} color="var(--text-muted)" />
          }
          <span style={{ fontSize: 9, color: isConnected ? 'var(--accent-green)' : 'var(--text-muted)' }}>
            {isConnected ? 'Live' : 'Off'}
          </span>
        </div>

        {/* User avatar */}
        {user && (
          <div className="sidebar-item" style={{ cursor: 'default', padding: '10px 0' }}>
            <div style={{
              width: 28, height: 28,
              background: 'var(--accent-blue)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#fff',
            }}>
              {user.displayName?.[0]?.toUpperCase() || '?'}
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="sidebar-item"
          title="Logout"
          style={{ color: 'var(--text-muted)' }}
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
