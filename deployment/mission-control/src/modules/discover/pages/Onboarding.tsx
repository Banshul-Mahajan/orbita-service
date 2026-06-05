import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Globe2, Loader2, Sparkles, X, Search } from 'lucide-react'
import { onboardingApi, type OnboardingStartInput } from '../api/client'
import { useProjectStore } from '../store/projectStore'

const EMPTY_FORM: OnboardingStartInput = {
  project_id: '',
  company_name: '',
  website_url: '',
  industry: '',
  target_audience: '',
  country: '',
  seed_keywords: [],
  limit_per_seed: 12,
}

export default function Onboarding() {
  const { selectedProject, setSelectedProject } = useProjectStore()
  const [form, setForm] = useState<OnboardingStartInput>(EMPTY_FORM)
  const [seedInput, setSeedInput] = useState('')
  const qc = useQueryClient()

  const addSeedKeyword = (value: string) => {
    const trimmed = value.trim().toLowerCase()
    if (!trimmed) return
    const current = form.seed_keywords ?? []
    if (current.length >= 10) return
    if (current.some(k => k.toLowerCase() === trimmed)) return
    setForm({ ...form, seed_keywords: [...current, trimmed] })
    setSeedInput('')
  }

  const removeSeedKeyword = (index: number) => {
    const current = form.seed_keywords ?? []
    setForm({ ...form, seed_keywords: current.filter((_, i) => i !== index) })
  }

  const handleSeedInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addSeedKeyword(seedInput)
    }
    // Allow backspace to remove last tag when input is empty
    if (e.key === 'Backspace' && !seedInput && (form.seed_keywords?.length ?? 0) > 0) {
      removeSeedKeyword((form.seed_keywords?.length ?? 1) - 1)
    }
  }

  const { data: status } = useQuery({
    queryKey: ['onboarding', selectedProject?.id],
    queryFn: () => onboardingApi.get(selectedProject!.id),
    enabled: !!selectedProject,
  })

  const startMut = useMutation({
    mutationFn: () => onboardingApi.start({...form, project_id: selectedProject!.id}),
    onSuccess: (data) => {
      setSelectedProject(data.project)
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['keywords', data.project.id] })
      qc.invalidateQueries({ queryKey: ['keyword-opportunities', data.project.id] })
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

            {/* Seed Keywords Tag Input */}
            <div>
              <label className="label mb-1 block">
                <span className="flex items-center gap-1.5">
                  <Search size={12} className="text-emerald-400" />
                  Seed Keywords
                </span>
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Add 3–6 keywords your customers would search for. Press <kbd className="px-1 py-0.5 bg-gray-700 rounded text-gray-300 text-[10px]">Enter</kbd> or <kbd className="px-1 py-0.5 bg-gray-700 rounded text-gray-300 text-[10px]">,</kbd> to add.
              </p>
              <div className="rounded-lg border border-gray-700 bg-gray-800/60 p-2 flex flex-wrap gap-1.5 min-h-[42px] focus-within:border-blue-500 transition-colors">
                {(form.seed_keywords ?? []).map((kw, i) => (
                  <span
                    key={`${kw}-${i}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-900/60 text-emerald-200 text-xs font-medium border border-emerald-700/40"
                  >
                    {kw}
                    <button
                      type="button"
                      onClick={() => removeSeedKeyword(i)}
                      className="hover:text-red-300 transition-colors p-0 leading-none"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <input
                  className="bg-transparent border-none outline-none text-sm text-white placeholder-gray-500 flex-1 min-w-[140px] p-1"
                  value={seedInput}
                  onChange={e => setSeedInput(e.target.value)}
                  onKeyDown={handleSeedInputKeyDown}
                  onBlur={() => { if (seedInput.trim()) addSeedKeyword(seedInput) }}
                  placeholder={
                    (form.seed_keywords?.length ?? 0) === 0
                      ? 'e.g. creative agency in mumbai'
                      : (form.seed_keywords?.length ?? 0) >= 10
                        ? 'Max 10 keywords reached'
                        : 'Add another keyword...'
                  }
                  disabled={(form.seed_keywords?.length ?? 0) >= 10}
                />
              </div>
              {(form.seed_keywords?.length ?? 0) > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {form.seed_keywords?.length}/10 keywords added
                </p>
              )}
            </div>
            <button
              className="btn-primary w-full flex items-center justify-center gap-2"
              disabled={startMut.isPending || !form.company_name.trim() || !form.website_url.trim()}
              onClick={() => startMut.mutate()}
            >
              {startMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {startMut.isPending ? 'Scanning website...' : 'Start Guided Research'}
            </button>
            {startMut.isError && (
              <p className="text-sm text-red-400">{(startMut.error as Error).message}</p>
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
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link to="/dashboard/discover/keywords" className="btn-primary inline-flex items-center gap-2">
                    Review Keywords <ArrowRight size={14} />
                  </Link>
                  <Link to="/dashboard/discover/competitors" className="btn-secondary inline-flex items-center gap-2">
                    Find Competitors <ArrowRight size={14} />
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
