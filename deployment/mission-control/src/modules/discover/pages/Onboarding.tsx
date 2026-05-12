import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Building2, Globe2, Loader2, Sparkles } from 'lucide-react'
import {
  brandsApi,
  onboardingApi,
  projectsApi,
  setCookie,
  type Brand,
  type OnboardingStartInput,
} from '../api/client'
import { useProjectStore } from '../store/projectStore'

const EMPTY_FORM: OnboardingStartInput = {
  project_id: '',
  company_name: '',
  website_url: '',
  industry: '',
  target_audience: '',
  country: '',
  limit_per_seed: 12,
}

export default function Onboarding() {
  const { selectedProject, setSelectedProject } = useProjectStore()
  const [form, setForm] = useState<OnboardingStartInput>(EMPTY_FORM)
  const [selectedBrandId, setSelectedBrandId] = useState('')
  const [flowError, setFlowError] = useState('')
  const qc = useQueryClient()

  const { data: brands = [], isLoading: brandsLoading } = useQuery({
    queryKey: ['my-brands'],
    queryFn: brandsApi.list,
  })

  const { data: status } = useQuery({
    queryKey: ['onboarding', selectedProject?.id],
    queryFn: () => onboardingApi.get(selectedProject!.id),
    enabled: !!selectedProject,
  })

  useEffect(() => {
    if (selectedBrandId || brands.length === 0) return
    const cookieBrand = document.cookie.match(new RegExp('(^| )orbit_brand_id=([^;]+)'))?.[2]
    const initial = brands.find(b => b.id === cookieBrand) ?? brands[0]
    setSelectedBrandId(initial.id)
    setForm(f => ({
      ...f,
      company_name: f.company_name || initial.name || '',
      website_url: f.website_url || initial.website_url || '',
      industry: f.industry || initial.industry || '',
      target_audience: f.target_audience || initial.description || '',
      country: f.country || initial.country || '',
    }))
  }, [brands, selectedBrandId])

  const selectBrand = (brandId: string) => {
    setSelectedBrandId(brandId)
    setSelectedProject(null)
    if (!brandId) {
      setForm(EMPTY_FORM)
      return
    }
    const brand = brands.find(b => b.id === brandId)
    if (!brand) return
    setCookie('orbit_brand_id', brand.id)
    setForm(f => ({
      ...f,
      company_name: brand.name || '',
      website_url: brand.website_url || '',
      industry: brand.industry || '',
      target_audience: brand.description || '',
      country: brand.country || '',
    }))
  }

  const normalizeUrl = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return ''
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  }

  const getPrimaryDomain = (value: string) => {
    try {
      return new URL(normalizeUrl(value)).hostname.replace(/^www\./, '')
    } catch {
      return undefined
    }
  }

  const ensureBrandAndProject = async () => {
    const websiteUrl = normalizeUrl(form.website_url)
    const payload = {
      name: form.company_name.trim(),
      website_url: websiteUrl,
      primary_domain: getPrimaryDomain(websiteUrl),
      industry: form.industry?.trim() || undefined,
      description: form.target_audience?.trim() || undefined,
      country: form.country?.trim() || undefined,
    }

    let brand: Brand | undefined = selectedBrandId
      ? brands.find(b => b.id === selectedBrandId)
      : undefined

    if (!brand) {
      const domain = payload.primary_domain
      brand = brands.find(b =>
        (domain && b.primary_domain === domain) ||
        b.name.toLowerCase() === payload.name.toLowerCase()
      )
    }

    brand = brand
      ? await brandsApi.update(brand.id, payload)
      : await brandsApi.create(payload)

    setSelectedBrandId(brand.id)
    setCookie('orbit_brand_id', brand.id)

    const projects = await projectsApi.listForBrand(brand.id)
    const projectName = payload.name
    let project = selectedProject?.brand_id === brand.id ? selectedProject : undefined
    project = project ?? projects.find(p => p.name.toLowerCase() === projectName.toLowerCase())
    project = project ?? await projectsApi.create({
      name: projectName,
      description: websiteUrl,
      target_audience: form.target_audience?.trim() || undefined,
    }, undefined, brand.id)

    setSelectedProject(project)
    return { brand, project, websiteUrl }
  }

  const startMut = useMutation({
    mutationFn: async () => {
      setFlowError('')
      const { project, websiteUrl } = await ensureBrandAndProject()
      return onboardingApi.start({ ...form, website_url: websiteUrl, project_id: project.id })
    },
    onSuccess: (data) => {
      setSelectedProject(data.project)
      qc.invalidateQueries({ queryKey: ['my-brands'] })
      qc.invalidateQueries({ queryKey: ['brands-for-picker'] })
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['keywords', data.project.id] })
      qc.invalidateQueries({ queryKey: ['keyword-opportunities', data.project.id] })
    },
    onError: (err) => {
      setFlowError(err instanceof Error ? err.message : 'Failed to start guided research')
    },
  })

  const active = startMut.data ?? status
  const byIntent = active?.keyword_summary?.by_intent ?? {}

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <p className="label mb-2">Website-first SEO journey</p>
        <h1 className="text-2xl font-bold text-white mb-2">Start with the website, not SEO jargon</h1>
        <p className="text-slate-400 text-sm max-w-2xl">
          Add the company and website. Discover Orbit scans the site, extracts seed topics,
          and creates beginner-friendly keyword opportunities across all four intent buckets.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Globe2 size={16} className="text-blue-400" />
            <h2 className="section-title mb-0">Company Details</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="label mb-1 block">Brand workspace</label>
              <div className="flex gap-2">
                <select
                  className="input"
                  value={selectedBrandId}
                  onChange={e => selectBrand(e.target.value)}
                  disabled={brandsLoading}
                >
                  <option value="">Create new brand</option>
                  {brands.map(brand => (
                    <option key={brand.id} value={brand.id}>{brand.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn-secondary shrink-0"
                  onClick={() => selectBrand('')}
                  title="Create a separate brand"
                >
                  <Building2 size={14} />
                  New
                </button>
              </div>
            </div>
            <div>
              <label className="label mb-1 block">Company name</label>
              <input
                className="input"
                value={form.company_name}
                onChange={e => setForm({ ...form, company_name: e.target.value })}
                placeholder="e.g. Orbit"
              />
            </div>
            <div>
              <label className="label mb-1 block">Website URL</label>
              <input
                className="input"
                value={form.website_url}
                onChange={e => setForm({ ...form, website_url: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
            <div>
              <label className="label mb-1 block">Industry</label>
              <input
                className="input"
                value={form.industry}
                onChange={e => setForm({ ...form, industry: e.target.value })}
                placeholder="e.g. SEO software"
              />
            </div>
            <div>
              <label className="label mb-1 block">Target audience</label>
              <textarea
                className="input min-h-[84px]"
                value={form.target_audience}
                onChange={e => setForm({ ...form, target_audience: e.target.value })}
                placeholder="e.g. founders and marketers at small businesses"
              />
            </div>
            <button
              className="btn-primary w-full flex items-center justify-center gap-2"
              disabled={startMut.isPending || !form.company_name.trim() || !form.website_url.trim()}
              onClick={() => startMut.mutate()}
            >
              {startMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {startMut.isPending
                ? 'Preparing workspace...'
                : selectedBrandId
                  ? 'Update Brand & Start Research'
                  : 'Create Brand & Start Research'}
            </button>
            {flowError && (
              <p className="text-sm text-red-400">{flowError}</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card">
            <h2 className="section-title">Current Journey Status</h2>
            {!active ? (
              <p className="text-sm text-gray-500">
                Start onboarding to create a project, scan the website, and generate keywords.
              </p>
            ) : (
              <div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                  {['informational', 'commercial', 'transactional', 'navigational'].map(intent => (
                    <div key={intent} className="rounded-lg bg-gray-800/60 border border-gray-700 p-3">
                      <p className="text-xs text-gray-500 capitalize">{intent}</p>
                      <p className="text-2xl font-bold text-white">{byIntent[intent] ?? 0}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 text-sm text-gray-400">
                  <p><span className="text-gray-200 font-medium">Project:</span> {active.project.name}</p>
                  <p><span className="text-gray-200 font-medium">Website:</span> {active.profile?.website_url ?? 'Not set'}</p>
                  <p><span className="text-gray-200 font-medium">Pages scanned:</span> {active.scan?.pages_scanned ?? 0}</p>
                  <p><span className="text-gray-200 font-medium">Keywords:</span> {active.keyword_summary.total} generated, {active.keyword_summary.selected} pre-selected</p>
                </div>
                <div className="flex gap-3 mt-5">
                  <Link to="../keywords" className="btn-primary inline-flex items-center gap-2">
                    Review Keywords <ArrowRight size={16} />
                  </Link>
                  <Link to="../competitors" className="btn-secondary inline-flex items-center gap-2">
                    Find Competitors
                  </Link>
                </div>
              </div>
            )}
          </div>

          {active?.scan?.seed_topics && active.scan.seed_topics.length > 0 && (
            <div className="card">
              <h2 className="section-title">Seed Topics Found</h2>
              <div className="flex flex-wrap gap-2">
                {active.scan.seed_topics.map(topic => (
                  <span key={topic} className="badge bg-blue-900 text-blue-200">{topic}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
