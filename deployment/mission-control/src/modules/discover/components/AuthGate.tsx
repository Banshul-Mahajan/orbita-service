import { useState, useEffect } from 'react'
import axios from 'axios'

const getCookie = (name: string) => {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? match[2] : null
}

const setCookie = (name: string, value: string) => {
  document.cookie = `${name}=${value};path=/;max-age=86400;SameSite=Lax`
}

// Auth calls use a dedicated prefix so /api/authors does not collide with /api/auth.
const authClient = axios.create({ baseURL: '/auth-api' })
authClient.interceptors.request.use((config) => {
  const token = getCookie('orbit_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ─── Step 1: Login / Register ───────────────────────────────────────────────

function LoginStep({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [form, setForm] = useState({ org_name: '', email: '', password: '', full_name: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register'
      const payload = mode === 'login' ? { email: form.email, password: form.password } : form
      const { data } = await authClient.post(endpoint, payload)
      setCookie('orbit_token', data.access_token)
      setCookie('orbit_org_id', data.org_id)
      localStorage.setItem('orbit_user', JSON.stringify({
        id: data.user_id, email: data.email, full_name: data.full_name, org_id: data.org_id
      }))
      onDone()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg,#3b82f6,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16 }}>O</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>ORBITA Platform</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{mode === 'login' ? 'Sign in to continue' : 'Create your account'}</div>
          </div>
        </div>
        {error && <div style={errorStyle}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {mode === 'register' && (<>
            <label style={labelStyle}>Organization</label>
            <input style={inputStyle} value={form.org_name} onChange={set('org_name')} required placeholder="Your Company" />
            <label style={labelStyle}>Full Name</label>
            <input style={inputStyle} value={form.full_name} onChange={set('full_name')} placeholder="Jane Smith" />
          </>)}
          <label style={labelStyle}>Email</label>
          <input style={inputStyle} type="email" value={form.email} onChange={set('email')} required placeholder="you@example.com" />
          <label style={labelStyle}>Password</label>
          <input style={inputStyle} type="password" value={form.password} onChange={set('password')} required placeholder="••••••••" />
          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <p style={{ marginTop: 16, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
          {mode === 'login' ? 'No account? ' : 'Already registered? '}
          <span onClick={() => setMode(mode === 'login' ? 'register' : 'login')} style={{ color: '#60a5fa', cursor: 'pointer' }}>
            {mode === 'login' ? 'Create one' : 'Sign in'}
          </span>
        </p>
      </div>
    </div>
  )
}

// ─── Step 2: Brand Setup ────────────────────────────────────────────────────

interface Brand { id: string; name: string; slug: string; industry?: string }

function BrandStep({ onDone }: { onDone: () => void }) {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [brandName, setBrandName] = useState('')
  const [industry, setIndustry] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    authClient.get('/brands').then(r => {
      setBrands(r.data || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const selectBrand = (brand: Brand) => {
    setCookie('orbit_brand_id', brand.id)
    onDone()
  }

  const createBrand = async () => {
    if (!brandName.trim()) return
    setCreating(true)
    setError('')
    try {
      const { data } = await authClient.post('/brands', { name: brandName, industry })
      setCookie('orbit_brand_id', data.id)
      onDone()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create brand')
      setCreating(false)
    }
  }

  if (loading) return <div style={pageStyle}><div style={cardStyle}><p style={{ color: '#94a3b8' }}>Loading brands…</p></div></div>

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>Select or Create a Brand</h2>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Each brand has its own knowledge base, content, and analytics.</p>
        {error && <div style={errorStyle}>{error}</div>}

        {brands.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Your Brands</label>
            {brands.map(b => (
              <div key={b.id} onClick={() => selectBrand(b)} style={{
                padding: '10px 14px', background: '#0f172a', border: '1px solid #1f2937',
                borderRadius: 8, marginBottom: 6, cursor: 'pointer', color: '#e2e8f0', fontSize: 14,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span>{b.name}</span>
                <span style={{ fontSize: 11, color: '#64748b' }}>{b.industry || ''}</span>
              </div>
            ))}
          </div>
        )}

        <label style={labelStyle}>Create New Brand</label>
        <input style={inputStyle} value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Brand name (e.g. Snitch)" />
        <input style={{ ...inputStyle, marginTop: 8 }} value={industry} onChange={e => setIndustry(e.target.value)} placeholder="Industry (e.g. Men's Fashion)" />
        <button onClick={createBrand} disabled={creating || !brandName.trim()} style={{ ...btnStyle, marginTop: 10 }}>
          {creating ? 'Creating…' : 'Create Brand'}
        </button>
      </div>
    </div>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: '#0a0f1a', fontFamily: 'Inter, system-ui, sans-serif',
}
const cardStyle: React.CSSProperties = {
  background: '#111827', border: '1px solid #1f2937', borderRadius: 16,
  padding: 36, width: '100%', maxWidth: 440,
}
const inputStyle: React.CSSProperties = {
  padding: '10px 14px', background: '#0a0f1a', border: '1px solid #1f2937',
  borderRadius: 8, color: '#e2e8f0', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = { fontSize: 13, color: '#94a3b8', marginBottom: 2 }
const btnStyle: React.CSSProperties = {
  padding: 12, border: 'none', borderRadius: 8,
  background: 'linear-gradient(135deg,#3b82f6,#06b6d4)',
  color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
}
const errorStyle: React.CSSProperties = {
  background: '#7f1d1d30', border: '1px solid #991b1b', borderRadius: 8,
  padding: '8px 12px', marginBottom: 16, color: '#fca5a5', fontSize: 13,
}

// ─── AuthGate: multi-step auth flow ─────────────────────────────────────────

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [step, setStep] = useState<'login' | 'brand' | 'ready'>(() => {
    if (!getCookie('orbit_token')) return 'login'
    if (!getCookie('orbit_brand_id')) return 'brand'
    return 'ready'
  })

  if (step === 'login') return <LoginStep onDone={() => setStep('brand')} />
  if (step === 'brand') return <BrandStep onDone={() => setStep('ready')} />
  return <>{children}</>
}
