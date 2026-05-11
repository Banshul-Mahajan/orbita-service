import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '../api/client'
import useAuth from '../hooks/useAuth'
import toast from 'react-hot-toast'
import { Cpu, Loader } from 'lucide-react'

export default function RegisterPage() {
  const [form, setForm] = useState({ org_name: '', email: '', password: '', full_name: '' })
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters')
    setLoading(true)
    try {
      const { data } = await authApi.register(form)
      const user = { id: data.user_id, email: data.email, full_name: data.full_name, org_id: data.org_id }
      login(data.access_token, user)
      document.cookie = `orbit_org_id=${data.org_id};path=/;max-age=86400;SameSite=Lax`
      toast.success('Account created!')
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}><Cpu size={24} color="#fff" /></div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>CREATE ORBIT</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>AI Content Studio</div>
          </div>
        </div>
        <h2 style={styles.heading}>Create your account</h2>
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Organization Name</label>
          <input style={styles.input} value={form.org_name} onChange={set('org_name')} required placeholder="Your Company" />
          <label style={styles.label}>Full Name</label>
          <input style={styles.input} value={form.full_name} onChange={set('full_name')} placeholder="Jane Smith" />
          <label style={styles.label}>Email</label>
          <input style={styles.input} type="email" value={form.email} onChange={set('email')} required placeholder="you@example.com" />
          <label style={styles.label}>Password</label>
          <input style={styles.input} type="password" value={form.password} onChange={set('password')} required placeholder="Min 8 characters" />
          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Create account'}
          </button>
        </form>
        <p style={styles.footer}>
          Already have an account? <Link to="/login" style={styles.link}>Sign in</Link>
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' },
  card: { background: '#1e293b', border: '1px solid #334155', borderRadius: 16, padding: 40, width: '100%', maxWidth: 420 },
  logo: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 },
  logoIcon: { width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 22, fontWeight: 700, color: '#e2e8f0', marginBottom: 24 },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  label: { fontSize: 13, color: '#94a3b8', marginBottom: 4 },
  input: { padding: '10px 14px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0', fontSize: 14, outline: 'none' },
  btn: { marginTop: 8, padding: '12px', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 },
  footer: { marginTop: 20, textAlign: 'center', color: '#64748b', fontSize: 13 },
  link: { color: '#60a5fa', textDecoration: 'none' },
}
