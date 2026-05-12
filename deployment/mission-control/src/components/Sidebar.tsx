import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Search,
  Globe,
  PenTool,
  FileText,
  BarChart,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard',            label: 'Mission Control', Icon: LayoutDashboard, end: true },
  { to: '/dashboard/brands',     label: 'Brands',          Icon: Building2 },
  { to: '/dashboard/discover',   label: 'Discover Orbit',  Icon: Search },
  { to: '/dashboard/visibility', label: 'Visibility Orbit',Icon: Globe },
  { to: '/dashboard/create',     label: 'Create Orbit',    Icon: PenTool },
  { to: '/dashboard/optimize',   label: 'Optimize Orbit',  Icon: FileText },
  { to: '/dashboard/knowledge',  label: 'Knowledge Core',  Icon: BarChart },
  { to: '/dashboard/settings',   label: 'Settings',        Icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const navigate = useNavigate();

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const initials = user?.full_name
    ? user.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <aside
      style={{
        width: collapsed ? 64 : 240,
        minWidth: collapsed ? 64 : 240,
        background: 'linear-gradient(180deg, #0d1117 0%, #0f1520 100%)',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.25s ease, min-width 0.25s ease',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* Header */}
      <div style={{ padding: collapsed ? '1.25rem 0' : '1.25rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between' }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg,#a3e635,#84cc16)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 16, color: '#0f1211', flexShrink: 0, boxShadow: '0 0 10px rgba(163,230,53,0.3)' }}>O</div>
            <span style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>ORBITA</span>
          </div>
        )}
        {collapsed && (
          <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg,#a3e635,#84cc16)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 16, color: '#0f1211', boxShadow: '0 0 10px rgba(163,230,53,0.3)' }}>O</div>
        )}
        {!collapsed && (
          <button
            onClick={onToggle}
            title="Collapse sidebar"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, cursor: 'pointer', padding: '4px 6px', display: 'flex', alignItems: 'center', color: '#94a3b8', transition: 'all 0.15s' }}
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <button
            onClick={onToggle}
            title="Expand sidebar"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, cursor: 'pointer', padding: '4px 6px', display: 'flex', alignItems: 'center', color: '#94a3b8' }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: collapsed ? '0.75rem 0' : '0.75rem 0', overflowY: 'auto' }}>
        {NAV_ITEMS.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={collapsed ? label : undefined}
            className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
            style={collapsed ? { justifyContent: 'center', padding: '0.75rem 0' } : {}}
          >
            <Icon size={20} style={{ flexShrink: 0 }} />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: collapsed ? '1rem 0' : '1rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        {!collapsed ? (
          <>
            <div className="user-profile">
              <div className="avatar">{initials}</div>
              <div className="user-info">
                <h5>{user?.full_name || 'User'}</h5>
                <p>{user?.email || 'Brand Workspace'}</p>
              </div>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <LogOut size={16} />
              <span>Log out</span>
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div className="avatar" style={{ width: 32, height: 32, fontSize: 13 }}>{initials}</div>
            <button
              onClick={handleLogout}
              title="Log out"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', display: 'flex', alignItems: 'center' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
