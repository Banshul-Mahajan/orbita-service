import { Link, useLocation } from 'react-router-dom'

// ── Sidebar nav ──────────────────────────────────────────────────────────
const NAV = [
  { to: '/dashboard/knowledge',           label: 'Dashboard', icon: '⬡' },
  { to: '/dashboard/knowledge/entities',  label: 'Entities',  icon: '📦' },
  { to: '/dashboard/knowledge/sources',   label: 'Citations', icon: '🔗' },
  { to: '/dashboard/knowledge/authors',   label: 'Authors',   icon: '👤' },
  { to: '/dashboard/knowledge/factguard', label: 'FactGuard', icon: '🛡️' },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-brand-900 flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-white/10">
          <p className="text-white font-bold text-lg tracking-wide">ORBITA</p>
          <p className="text-brand-100 text-xs mt-0.5 opacity-70">Knowledge Core</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, label, icon }) => {
            const active = pathname === to || (to !== '/dashboard/knowledge' && pathname.startsWith(to))
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-white/15 text-white font-medium'
                    : 'text-brand-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="text-base">{icon}</span>
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="px-5 py-4 border-t border-white/10">
          <p className="text-brand-100 text-xs opacity-50">MVP v1.0.0</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-5xl mx-auto">{children}</div>
      </main>
    </div>
  )
}

// ── Page header ──────────────────────────────────────────────────────────
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'h-4 w-4' : 'h-8 w-8'
  return (
    <div className={`${s} animate-spin rounded-full border-2 border-brand-600 border-t-transparent`} />
  )
}

// ── Loading overlay ───────────────────────────────────────────────────────
export function LoadingBox() {
  return (
    <div className="flex items-center justify-center py-20">
      <Spinner />
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────
export function EmptyState({ message, icon = '📭' }: { message: string; icon?: string }) {
  return (
    <div className="text-center py-16 text-gray-400">
      <p className="text-4xl mb-3">{icon}</p>
      <p className="text-sm">{message}</p>
    </div>
  )
}

// ── Confidence badge ──────────────────────────────────────────────────────
export function ConfidenceBadge({ score }: { score: number }) {
  if (score >= 0.85)
    return <span className="badge-verified">✓ {(score * 100).toFixed(0)}%</span>
  if (score >= 0.65)
    return <span className="badge-low">~ {(score * 100).toFixed(0)}%</span>
  return <span className="badge-unverified">✗ {(score * 100).toFixed(0)}%</span>
}

// ── Modal shell ───────────────────────────────────────────────────────────
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative card w-full max-w-lg mx-4 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Select field helper ───────────────────────────────────────────────────
export function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="input"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
