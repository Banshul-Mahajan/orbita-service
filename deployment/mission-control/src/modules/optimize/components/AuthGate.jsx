import { useState, useEffect } from 'react'

const getCookie = (name) => {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? match[2] : null
}
const setCookie = (name, value) => {
  document.cookie = `${name}=${value};path=/;max-age=86400;SameSite=Lax`
}

async function authRequest(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }
  const token = getCookie('orbit_token')
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`/auth-api${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    let errMsg = `Authentication failed (${response.status})`;
    if (error.detail) {
      errMsg = Array.isArray(error.detail) ? error.detail[0].msg : error.detail;
    }
    throw new Error(errMsg)
  }

  return response.json()
}

function LoginStep({ onDone }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ org_name: '', email: '', password: '', full_name: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register'
      const payload = mode === 'login' ? { email: form.email, password: form.password } : form
      const data = await authRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      setCookie('orbit_token', data.access_token)
      setCookie('orbit_org_id', data.org_id)
      localStorage.setItem('orbit_user', JSON.stringify({ id: data.user_id, email: data.email, full_name: data.full_name, org_id: data.org_id }))
      onDone()
    } catch (err) { setError(err.message || 'Authentication failed') }
    finally { setLoading(false) }
  }

  return (
    <div style={pageStyle}><div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg,#10b981,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16 }}>OO</div>
        <div><div style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>Optimize Orbit</div><div style={{ fontSize: 12, color: '#64748b' }}>{mode === 'login' ? 'Sign in' : 'Create account'}</div></div>
      </div>
      {error && <div style={errorStyle}>{error}</div>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {mode === 'register' && (<><label style={labelStyle}>Organization</label><input style={inputStyle} value={form.org_name} onChange={set('org_name')} required placeholder="Company" /><label style={labelStyle}>Name</label><input style={inputStyle} value={form.full_name} onChange={set('full_name')} placeholder="Jane Smith" /></>)}
        <label style={labelStyle}>Email</label><input style={inputStyle} type="email" value={form.email} onChange={set('email')} required placeholder="you@example.com" />
        <label style={labelStyle}>Password</label><input style={inputStyle} type="password" value={form.password} onChange={set('password')} required placeholder="••••••••" />
        <button type="submit" disabled={loading} style={btnStyle}>{loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
      </form>
      <p style={{ marginTop: 16, textAlign: 'center', color: '#64748b', fontSize: 13 }}>{mode === 'login' ? 'No account? ' : 'Have account? '}<span onClick={() => setMode(mode === 'login' ? 'register' : 'login')} style={{ color: '#60a5fa', cursor: 'pointer' }}>{mode === 'login' ? 'Create one' : 'Sign in'}</span></p>
    </div></div>
  )
}

function BrandStep({ onDone }) {
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [brandName, setBrandName] = useState('')
  const [industry, setIndustry] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    authRequest('/brands')
      .then((data) => { setBrands(data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const selectBrand = (b) => { setCookie('orbit_brand_id', b.id); onDone() }
  const createBrand = async () => {
    if (!brandName.trim()) return; setCreating(true); setError('')
    try {
      const data = await authRequest('/brands', {
        method: 'POST',
        body: JSON.stringify({ name: brandName, industry }),
      })
      setCookie('orbit_brand_id', data.id)
      onDone()
    }
    catch (err) { setError(err.message || 'Failed'); setCreating(false) }
  }

  if (loading) return <div style={pageStyle}><div style={cardStyle}><p style={{ color: '#94a3b8' }}>Loading…</p></div></div>

  return (
    <div style={pageStyle}><div style={cardStyle}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>Select or Create a Brand</h2>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>Choose which brand to optimize content for.</p>
      {error && <div style={errorStyle}>{error}</div>}
      {brands.length > 0 && (<div style={{ marginBottom: 16 }}>{brands.map(b => (
        <div key={b.id} onClick={() => selectBrand(b)} style={{ padding: '10px 14px', background: '#0f172a', border: '1px solid #1f2937', borderRadius: 8, marginBottom: 6, cursor: 'pointer', color: '#e2e8f0', fontSize: 14, display: 'flex', justifyContent: 'space-between' }}>
          <span>{b.name}</span><span style={{ fontSize: 11, color: '#64748b' }}>{b.industry || ''}</span>
        </div>
      ))}</div>)}
      <label style={labelStyle}>New Brand</label>
      <input style={inputStyle} value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Brand name" />
      <input style={{ ...inputStyle, marginTop: 8 }} value={industry} onChange={e => setIndustry(e.target.value)} placeholder="Industry" />
      <button onClick={createBrand} disabled={creating || !brandName.trim()} style={{ ...btnStyle, marginTop: 10 }}>{creating ? 'Creating…' : 'Create Brand'}</button>
    </div></div>
  )
}

const pageStyle = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0f1a' }
const cardStyle = { background: '#111827', border: '1px solid #1f2937', borderRadius: 16, padding: 36, width: '100%', maxWidth: 440 }
const inputStyle = { padding: '10px 14px', background: '#0a0f1a', border: '1px solid #1f2937', borderRadius: 8, color: '#e2e8f0', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }
const labelStyle = { fontSize: 13, color: '#94a3b8', marginBottom: 2 }
const btnStyle = { padding: 12, border: 'none', borderRadius: 8, background: 'linear-gradient(135deg,#10b981,#3b82f6)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const errorStyle = { background: '#7f1d1d30', border: '1px solid #991b1b', borderRadius: 8, padding: '8px 12px', marginBottom: 16, color: '#fca5a5', fontSize: 13 }

export default function AuthGate({ children }) {
  const [step, setStep] = useState(() => {
    if (!getCookie('orbit_token')) return 'login'
    if (!getCookie('orbit_brand_id')) return 'brand'
    return 'ready'
  })
  if (step === 'login') return <LoginStep onDone={() => setStep('brand')} />
  if (step === 'brand') return <BrandStep onDone={() => setStep('ready')} />
  return <>{children}</>
}
