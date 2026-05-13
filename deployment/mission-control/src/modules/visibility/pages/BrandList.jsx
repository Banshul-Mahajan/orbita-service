import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { brandsAPI } from '../api/client'
import toast from 'react-hot-toast'

const setCookie = (name, value) => {
  document.cookie = `${name}=${value};path=/;max-age=86400;SameSite=Lax`
}

export default function BrandList() {
  const navigate = useNavigate()
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', industry: '', description: '', website: '' })
  const [saving, setSaving] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  useEffect(() => {
    brandsAPI.list()
      .then(r => setBrands(r.data))
      .catch(() => toast.error('Failed to load brands'))
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await brandsAPI.create(form)
      setBrands(b => [...b, data])
      setShowForm(false)
      setForm({ name: '', industry: '', description: '', website: '' })
      toast.success(`Brand "${data.name}" created with preset probes!`)
      setCookie('orbit_brand_id', data.id)
      navigate(`/dashboard/visibility/brands/${data.id}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create brand')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-500">Loading…</div>
    </div>
  )

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Brands</h1>
          <p className="text-gray-500 text-sm mt-1">Track AI visibility for each brand</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(s => !s)}>
          {showForm ? 'Cancel' : '+ Add brand'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="card mb-6 space-y-4">
          <h2 className="font-semibold text-gray-200">New brand</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Brand name *</label>
              <input className="input" placeholder="Acme AI" value={form.name} onChange={set('name')} required />
            </div>
            <div>
              <label className="label">Industry</label>
              <input className="input" placeholder="SaaS, Fintech…" value={form.industry} onChange={set('industry')} />
            </div>
          </div>
          <div>
            <label className="label">Website</label>
            <input className="input" placeholder="https://acme.ai" value={form.website} onChange={set('website')} />
          </div>
          <div>
            <label className="label">Short description</label>
            <textarea className="input" rows={2} placeholder="What does this brand do?" value={form.description} onChange={set('description')} />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Creating…' : 'Create brand'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Brand grid */}
      {brands.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-4xl mb-3">🚀</div>
          <p className="text-gray-400 font-medium">No brands yet</p>
          <p className="text-gray-600 text-sm mt-1">Add your first brand to start tracking</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {brands.map(brand => (
            <button
              key={brand.id}
              onClick={() => {
                setCookie('orbit_brand_id', brand.id)
                navigate(`/dashboard/visibility/brands/${brand.id}`)
              }}
              className="card text-left hover:border-indigo-600/60 transition-colors group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-100 group-hover:text-indigo-300 transition-colors">
                    {brand.name}
                  </h3>
                  {brand.industry && (
                    <span className="text-xs text-gray-500 mt-0.5 block">{brand.industry}</span>
                  )}
                </div>
                <span className="text-gray-600 group-hover:text-indigo-400 transition-colors">→</span>
              </div>
              {brand.description && (
                <p className="text-gray-500 text-sm mt-3 line-clamp-2">{brand.description}</p>
              )}
              <p className="text-xs text-gray-700 mt-3">
                Created {new Date(brand.created_at).toLocaleDateString()}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
