import { Outlet, NavLink, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../api/auth'

const ENGINE_COLORS = {
  claude: 'text-purple-400',
  gpt4:   'text-emerald-400',
  gemini: 'text-blue-400',
}

function NavItem({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
          isActive
            ? 'bg-indigo-600/30 text-indigo-300 font-medium'
            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
        }`
      }
    >
      <span className="text-base">{icon}</span>
      {label}
    </NavLink>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const { brandId } = useParams()
  const navigate = useNavigate()

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
              VO
            </div>
            <span className="font-semibold text-gray-100 text-sm">Visibility Orbit</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
            Workspace
          </p>
          <NavItem to="/brands" icon="🏢" label="Brands" />

          {brandId && (
            <>
              <p className="px-3 text-xs font-semibold text-gray-600 uppercase tracking-wider mt-4 mb-2">
                Brand
              </p>
              <NavItem to={`/brands/${brandId}`}            icon="📊" label="Dashboard" />
              <NavItem to={`/brands/${brandId}/knowledge`}  icon="🧠" label="Knowledge Core" />
              <NavItem to={`/brands/${brandId}/probes`}     icon="🔍" label="Probe Runner" />
              <NavItem to={`/brands/${brandId}/alerts`}     icon="🚨" label="Alerts" />
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="px-3 py-4 border-t border-gray-800">
          <div className="px-3 py-2 rounded-lg bg-gray-800">
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            <button
              onClick={() => { logout(); navigate('/login') }}
              className="text-xs text-indigo-400 hover:text-indigo-300 mt-1"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
