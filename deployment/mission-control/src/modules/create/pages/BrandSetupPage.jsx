import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

const getCookie = (name) => {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? match[2] : null
}
const setCookie = (name, value) => {
  document.cookie = `${name}=${value};path=/;max-age=86400;SameSite=Lax`
}

const authClient = axios.create({ baseURL: '/auth-api' })
authClient.interceptors.request.use((config) => {
  const token = getCookie('orbit_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default function BrandSetupPage() {
  const navigate = useNavigate()
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [brandName, setBrandName] = useState('')
  const [industry, setIndustry] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    // If brand already selected, skip
    if (getCookie('orbit_brand_id')) {
      navigate('/dashboard', { replace: true })
      return
    }
    authClient.get('/brands').then(r => {
      setBrands(r.data || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const selectBrand = (brand) => {
    setCookie('orbit_brand_id', brand.id)
    navigate('/dashboard', { replace: true })
  }

  const createBrand = async () => {
    if (!brandName.trim()) return
    setCreating(true)
    setError('')
    try {
      const { data } = await authClient.post('/brands', { name: brandName, industry })
      setCookie('orbit_brand_id', data.id)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create brand')
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}><p style={{ color: '#94a3b8' }}>Loading your brands…</p></div>
      </div>
    )
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>Select or Create a Brand</h2>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Each brand has its own corpus, briefs, and articles.</p>
        {error && <div style={errorStyle}>{error}</div>}

        {brands.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Your Brands</label>
            {brands.map(b => (
              <div key={b.id} onClick={() => selectBrand(b)} style={{
                padding: '12px 14px', background: '#0f172a', border: '1px solid #1f2937',
                borderRadius: 8, marginBottom: 6, cursor: 'pointer', color: '#e2e8f0', fontSize: 14,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#1f2937'}
              >
                <span style={{ fontWeight: 600 }}>{b.name}</span>
                <span style={{ fontSize: 11, color: '#64748b' }}>{b.industry || ''}</span>
              </div>
            ))}
          </div>
        )}

        <label style={labelStyle}>Create New Brand</label>
        <input style={inputStyle} value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Brand name (e.g. Snitch)" />
        <input style={{ ...inputStyle, marginTop: 8 }} value={industry} onChange={e => setIndustry(e.target.value)} placeholder="Industry (e.g. Men's Fashion)" />
        <button onClick={createBrand} disabled={creating || !brandName.trim()} style={{ ...btnStyle, marginTop: 12 }}>
          {creating ? 'Creating…' : 'Create Brand & Continue'}
        </button>
      </div>
    </div>
  )
}

const pageStyle = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', fontFamily: 'Inter, system-ui, sans-serif' }
const cardStyle = { background: '#1e293b', border: '1px solid #334155', borderRadius: 16, padding: 40, width: '100%', maxWidth: 440 }
const inputStyle = { padding: '10px 14px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }
const labelStyle = { fontSize: 13, color: '#94a3b8', marginBottom: 4, display: 'block' }
const btnStyle = { width: '100%', padding: '12px', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const errorStyle = { background: '#7f1d1d30', border: '1px solid #991b1b', borderRadius: 8, padding: '8px 12px', marginBottom: 16, color: '#fca5a5', fontSize: 13 }
