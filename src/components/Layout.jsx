import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Clock, Palmtree, BarChart3, Settings, Users, LogOut, Menu, X, ScrollText, AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

const consultantLinks = [
  { to: '/time-reporting', label: 'Time Reporting', icon: Clock },
  { to: '/vacation', label: 'Vacation, Planned absence', icon: Palmtree },
  { to: '/summary', label: 'Summary', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
]

const adminLinks = [
  { to: '/admin/time-reporting', label: 'Time Reporting', icon: Clock },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/audit-log', label: 'Audit Log', icon: ScrollText },
  { to: '/admin/error-log', label: 'Error Log', icon: AlertTriangle },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Layout() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const links = profile?.role === 'admin' ? adminLinks : consultantLinks

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="app-layout">
      <button
        className="sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-title">Time Report</h2>
        </div>

        <nav className="sidebar-nav">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="sidebar-user-email">{user?.email}</span>
            <span className="sidebar-user-role">{profile?.role}</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleSignOut}>
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
