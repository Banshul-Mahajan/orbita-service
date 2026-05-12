// @ts-nocheck
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { brandsAPI } from '../api/client'
import toast from 'react-hot-toast'
import { Building2, ExternalLink, Globe2, Pencil, Plus, Save, X } from 'lucide-react'

const setCookie = (name, value) => {
  document.cookie = `${name}=${value};path=/;max-age=86400;SameSite=Lax`
}

export default function BrandList() {
  const navigate = useNavigate()
  const formPanelRef = useRef(null)
  const nameInputRef = useRef(null)
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingBrand, setEditingBrand] = useState(null)
  const [form, setForm] = useState({ name: '', industry: '', description: '', website: '' })
  const [saving, setSaving] = useState(false)
  const [activeBrandId, setActiveBrandId] = useState(
    document.cookie.match(new RegExp('(^| )orbit_brand_id=([^;]+)'))?.[2] || ''
  )

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const selectBrandContext = (brand) => {
    setCookie('orbit_brand_id', brand.id)
    setActiveBrandId(brand.id)
  }

  useEffect(() => {
    brandsAPI.list()
      .then(r => setBrands(r.data))
      .catch(() => toast.error('Failed to load brands'))
      .finally(() => setLoading(false))
  }, [])

  const resetForm = () => {
    setFormOpen(false)
    setEditingBrand(null)
    setForm({ name: '', industry: '', description: '', website: '' })
  }

  const focusForm = () => {
    window.setTimeout(() => {
      formPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      nameInputRef.current?.focus()
    }, 0)
  }

  const startCreate = () => {
    setFormOpen(true)
    setEditingBrand(null)
    setForm({ name: '', industry: '', description: '', website: '' })
    focusForm()
  }

  const startEdit = (brand) => {
    setFormOpen(true)
    setEditingBrand(brand)
    setForm({
      name: brand.name || '',
      industry: brand.industry || '',
      description: brand.description || '',
      website: brand.website || brand.website_url || '',
    })
    focusForm()
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingBrand) {
        const { data } = await brandsAPI.update(editingBrand.id, form)
        setBrands(b => b.map(brand => brand.id === data.id ? { ...brand, ...data, website: data.website_url } : brand))
        toast.success(`Brand "${data.name}" updated`)
        selectBrandContext(data)
        resetForm()
      } else {
        const { data } = await brandsAPI.create(form)
        setBrands(b => [...b, data])
        toast.success(`Brand "${data.name}" created with preset probes!`)
        selectBrandContext(data)
        resetForm()
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save brand')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-500">Loading...</div>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="label mb-2">Brand workspace</p>
          <h1 className="text-2xl font-bold text-gray-100">Brands</h1>
          <p className="text-gray-500 text-sm mt-1 max-w-2xl">
            Manage brand profiles used across Discover, Visibility, Create, Optimize, and Knowledge Core.
          </p>
        </div>
        <button className="btn-primary inline-flex items-center gap-2" onClick={startCreate}>
          <Plus size={14} />
          New brand
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Total brands</p>
            <Building2 size={18} className="text-indigo-400" />
          </div>
          <p className="text-3xl font-bold text-gray-100 mt-3">{brands.length}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">With websites</p>
            <Globe2 size={18} className="text-emerald-400" />
          </div>
          <p className="text-3xl font-bold text-gray-100 mt-3">
            {brands.filter(b => b.website || b.website_url).length}
          </p>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Active context</p>
            <span className="text-xs text-indigo-300 bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded-full">
              Selected
            </span>
          </div>
          <p className="text-lg font-semibold text-gray-100 mt-3 truncate">
            {brands.find(b => b.id === activeBrandId)?.name || 'None selected'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
        <div ref={formPanelRef}>
          {formOpen ? (
            <form onSubmit={handleSave} className="card p-6 space-y-4">
              <div>
                <h2 className="font-semibold text-gray-100">{editingBrand ? 'Edit brand details' : 'Create brand'}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  These details become the shared brand profile for all modules.
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="label">Brand name *</label>
                  <input ref={nameInputRef} className="input" placeholder="Acme AI" value={form.name} onChange={set('name')} required />
                </div>
                <div>
                  <label className="label">Industry</label>
                  <input className="input" placeholder="SaaS, Fintech..." value={form.industry} onChange={set('industry')} />
                </div>
                <div>
                  <label className="label">Website</label>
                  <input className="input" placeholder="https://acme.ai" value={form.website} onChange={set('website')} />
                </div>
                <div>
                  <label className="label">Short description</label>
                  <textarea className="input min-h-[96px]" rows={4} placeholder="What does this brand do?" value={form.description} onChange={set('description')} />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2">
                  <Save size={14} />
                  {saving ? 'Saving...' : editingBrand ? 'Update brand' : 'Create brand'}
                </button>
                <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={resetForm}>
                  <X size={14} />
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="card p-6">
              <p className="label mb-3">Brand details</p>
              <h2 className="font-semibold text-gray-100">Create or edit a brand profile</h2>
              <p className="text-sm text-gray-500 mt-2">
                Use a brand profile as the shared context for Discover research, Visibility probes, Create briefs, Optimize checks, and Knowledge Core facts.
              </p>
              <button type="button" className="btn-primary inline-flex items-center gap-2 mt-6" onClick={startCreate}>
                <Plus size={14} />
                New brand
              </button>
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-100">Brand directory</h2>
              <p className="text-sm text-gray-500 mt-1">Select a context, edit profiles, or open Visibility Orbit.</p>
            </div>
          </div>

          {brands.length === 0 ? (
            <div className="text-center py-14">
              <Building2 size={34} className="text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">No brands yet</p>
              <p className="text-gray-600 text-sm mt-1">Create your first brand using the form.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {brands.map(brand => (
                <div key={brand.id} className="py-4 flex items-start justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      selectBrandContext(brand)
                      toast.success(`${brand.name} selected`)
                    }}
                    className="text-left flex-1 min-w-0"
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-100 hover:text-indigo-300 transition-colors truncate">
                        {brand.name}
                      </h3>
                      {brand.id === activeBrandId && (
                        <span className="text-[10px] uppercase tracking-wide text-emerald-300 bg-emerald-950/50 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                      <span>{brand.industry || 'No industry'}</span>
                      <span>{brand.website || brand.website_url || 'No website'}</span>
                      <span>Created {new Date(brand.created_at).toLocaleDateString()}</span>
                    </div>
                    {brand.description && (
                      <p className="text-gray-500 text-sm mt-2 line-clamp-2">{brand.description}</p>
                    )}
                  </button>

                  <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    className="btn-secondary text-xs py-1 px-2 inline-flex items-center gap-1"
                    onClick={() => startEdit(brand)}
                  >
                    <Pencil size={12} />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn-primary text-xs py-1 px-2 inline-flex items-center gap-1"
                    onClick={() => {
                      selectBrandContext(brand)
                      navigate(`/dashboard/visibility/brands/${brand.id}`)
                    }}
                  >
                    <ExternalLink size={12} />
                    Visibility
                  </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
