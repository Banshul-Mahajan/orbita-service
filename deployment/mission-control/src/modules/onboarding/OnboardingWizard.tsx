import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, Check, Loader2, Plus, Rocket, Trash2, Sparkles, Building2,
  Users, Package, Swords, Globe2, Search, Share2, Wrench, Info, Target, FileText, MapPin,
} from 'lucide-react'
import { useBrandStore } from '../../store/brandStore'
import { useProjectStore } from '../discover/store/projectStore'
import { brandApi, profileApi, projectsApi, onboardingApi } from './api/client'
import {
  TextField, TextArea, SelectField, ChipMultiSelect, TagInput, FieldGrid, GroupCard, Collapsible,
} from './fields'
import type {
  OnboardingProfile, CompanySection, AudienceSection, ProductItem, CompetitorItem,
  GeographySection, KeywordsSection, AiGeoSection, DigitalPresenceSection, TechnicalSeoSection,
} from './types'

// ── Option sets (from the Orbita onboarding IA) ─────────────────────────────────
const COMPANY_SIZES = ['1–10', '11–50', '51–200', '201–500', '500+']
const BUSINESS_TYPES = ['B2B', 'B2C', 'D2C', 'Marketplace', 'SaaS', 'Healthcare', 'Enterprise', 'Agency', 'Local Business', 'Ecommerce', 'Other']
const BUSINESS_GOALS = ['Increase SEO Visibility', 'Increase AI Search Visibility', 'Improve Local Discoverability', 'Generate Leads', 'Improve Brand Awareness', 'Expand into New Geographies', 'Increase Organic Traffic', 'Improve Conversational Search Presence']
const INTENT_STAGES = ['Awareness Stage', 'Research Stage', 'Purchase Stage', 'Retention Stage']
const SEARCH_INTENT = ['Informational', 'Commercial', 'Transactional', 'Local', 'AI-search intent']
const AI_PLATFORMS = ['ChatGPT', 'Google AI Overviews', 'Gemini', 'Claude', 'Perplexity', 'Voice Assistants']
const CONTENT_INTENT = ['Educational', 'Conversational', 'Decision-making', 'Local discovery', 'Product comparison', 'Expert positioning']
const SEO_TOOLS = ['Google Search Console', 'Google Analytics', 'Ahrefs', 'SEMrush', 'HubSpot', 'Other Tools']
const SOCIAL_PLATFORMS = ['LinkedIn', 'Instagram', 'Facebook', 'YouTube', 'X/Twitter', 'Reddit', 'Quora']
const INTEGRATIONS = ['Google Analytics', 'Search Console', 'CRM', 'CMS', 'Shopify', 'WordPress', 'HubSpot']

type StepKey =
  | 'company' | 'audience' | 'products' | 'competitors' | 'geography'
  | 'keywords' | 'ai_geo' | 'digital_presence' | 'technical_seo' | 'review'

interface StepMeta {
  key: StepKey; title: string; subtitle: string; icon: React.ReactNode; purpose: string
}

const STEPS: StepMeta[] = [
  { key: 'company', title: 'Company Information', subtitle: 'Tell us about the business', icon: <Building2 size={18} />,
    purpose: 'Establishes your brand entity, domain and goals — the foundation for SEO targeting and how AI engines describe you.' },
  { key: 'audience', title: 'Target Audience', subtitle: 'Who you want to reach', icon: <Users size={18} />,
    purpose: 'Shapes keyword intent and content tone so you rank for what real buyers search — and ask AI assistants.' },
  { key: 'products', title: 'Products & Services', subtitle: 'What you offer', icon: <Package size={18} />,
    purpose: 'Maps each offering to search & AI intent so we can find ranking and citation opportunities per product.' },
  { key: 'competitors', title: 'Competitors', subtitle: 'Who you compete with', icon: <Swords size={18} />,
    purpose: 'Benchmarks your share of voice in Google and AI answers, and surfaces gaps you can win.' },
  { key: 'geography', title: 'Geography & Localization', subtitle: 'Where you operate', icon: <Globe2 size={18} />,
    purpose: 'Drives local SEO and geo-specific AI visibility — city, region and language targeting.' },
  { key: 'keywords', title: 'Seed Keywords', subtitle: 'Topics to research', icon: <Search size={18} />,
    purpose: 'Seeds the keyword universe we expand, cluster and track across SEO and AI search.' },
  { key: 'ai_geo', title: 'AI Search & GEO', subtitle: 'AI discoverability', icon: <Sparkles size={18} />,
    purpose: 'Tells us which AI engines to monitor and optimize for — GEO (Generative Engine Optimization).' },
  { key: 'digital_presence', title: 'Digital Presence', subtitle: 'Existing SEO & channels', icon: <Share2 size={18} />,
    purpose: 'Connects your existing tools and channels so audits and tracking reflect your real footprint.' },
  { key: 'technical_seo', title: 'Technical SEO', subtitle: 'Optional advanced setup', icon: <Wrench size={18} />,
    purpose: 'Captures crawlability and structured-data signals that affect both rankings and AI answer eligibility.' },
  { key: 'review', title: 'Review & Launch', subtitle: 'Run your first scan', icon: <Rocket size={18} />,
    purpose: 'Crawl the site, extract topics, and generate your first keyword opportunities across intents.' },
]

const STEP_TO_SECTION: Partial<Record<StepKey, keyof OnboardingProfile>> = {
  company: 'company', audience: 'audience', products: 'products', competitors: 'competitors',
  geography: 'geography', keywords: 'keywords', ai_geo: 'ai_geo',
  digital_presence: 'digital_presence', technical_seo: 'technical_seo',
}

export default function OnboardingWizard() {
  const navigate = useNavigate()
  const { currentBrand, setCurrentBrand, setBrands, brands } = useBrandStore()
  const { selectedProject, setSelectedProject } = useProjectStore()

  const [stepIdx, setStepIdx] = useState(0)
  const [saving, setSaving] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completed, setCompleted] = useState<string[]>([])
  const [launchResult, setLaunchResult] = useState<{ keywords: number; pages: number } | null>(null)

  // Section state
  const [company, setCompany] = useState<CompanySection>({})
  const [audience, setAudience] = useState<AudienceSection>({})
  const [products, setProducts] = useState<ProductItem[]>([])
  const [competitors, setCompetitors] = useState<CompetitorItem[]>([])
  const [geography, setGeography] = useState<GeographySection>({})
  const [keywords, setKeywords] = useState<KeywordsSection>({})
  const [aiGeo, setAiGeo] = useState<AiGeoSection>({})
  const [digital, setDigital] = useState<DigitalPresenceSection>({})
  const [technical, setTechnical] = useState<TechnicalSeoSection>({})

  const accountUser = useMemo(() => {
    const raw = localStorage.getItem('orbit_user') || localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  }, [])

  // Tracks which brand we've already auto-resolved, so we (a) only auto-load
  // once per brand and (b) never wipe in-progress input when WE create the
  // brand from the Company step (ensureBrandAndProject marks it handled first).
  const loadedForBrand = useRef<string | null>(null)

  // Fully replace section state from a fetched profile (used when switching to
  // an already-onboarded brand). Missing sections reset to empty.
  function applyProfile(p: OnboardingProfile | null) {
    setCompany(p?.company || {})
    setAudience(p?.audience || {})
    setProducts(p?.products || [])
    setCompetitors(p?.competitors || [])
    setGeography(p?.geography || {})
    setKeywords(p?.keywords || {})
    setAiGeo(p?.ai_geo || {})
    setDigital(p?.digital_presence || {})
    setTechnical(p?.technical_seo || {})
    setCompleted(p?.completed_steps || [])
  }

  // Brand-driven onboarding: when the active brand changes, find that brand's
  // onboarding project (reuse it — never spawn a duplicate) and load its saved
  // profile so onboarding is editable/repeatable. No project selection needed.
  useEffect(() => {
    const brandId = currentBrand?.id
    if (!brandId || loadedForBrand.current === brandId) return
    loadedForBrand.current = brandId
    let cancelled = false
    ;(async () => {
      try {
        const projects = await projectsApi.list() // scoped to current brand via cookie
        const proj = projects?.length
          ? (projects.find(p => /onboarding/i.test(p.name)) ?? projects[0])
          : null
        if (cancelled) return
        if (proj) {
          setSelectedProject(proj)
          const profile = await profileApi.get(proj.id).catch(() => null)
          if (cancelled) return
          applyProfile(profile)
          if (!profile?.company?.company_name) {
            setCompany(c => ({ ...c, company_name: c.company_name || currentBrand?.name, website_url: c.website_url || currentBrand?.website }))
          }
        } else {
          // Brand has no project yet — start fresh; one is created on first save.
          setSelectedProject(null)
          applyProfile(null)
          setCompany({ company_name: currentBrand?.name, website_url: currentBrand?.website })
          setStepIdx(0)
        }
      } catch {
        /* ignore — fall back to a blank wizard */
      }
    })()
    return () => { cancelled = true }
  }, [currentBrand?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const step = STEPS[stepIdx]
  const isLast = stepIdx === STEPS.length - 1
  const progressPct = Math.round((stepIdx / (STEPS.length - 1)) * 100)

  // Ensure a brand + project exist before any section can be saved.
  async function ensureBrandAndProject(): Promise<string> {
    let brandId = currentBrand?.id
    if (!brandId) {
      const name = (company.company_name || 'My Brand').trim()
      const created = await brandApi.create({
        name,
        website_url: company.website_url,
        industry: company.industry,
        country: company.country,
      })
      brandId = created.id
      // Mark this brand handled BEFORE setCurrentBrand so the brand-resolve
      // effect skips it and doesn't reset the data the user just entered.
      loadedForBrand.current = brandId
      document.cookie = `orbit_brand_id=${brandId};path=/;max-age=86400;SameSite=Lax`
      setCurrentBrand({ id: created.id, name: created.name, website: created.website_url, industry: created.industry })
      setBrands([{ id: created.id, name: created.name }, ...brands])
    }
    if (!selectedProject?.id) {
      const projName = `${company.company_name || currentBrand?.name || 'Project'} — Onboarding`
      const project = await projectsApi.create(projName, 'Created during onboarding')
      setSelectedProject(project)
      return project.id
    }
    return selectedProject.id
  }

  function sectionValue(key: StepKey) {
    switch (key) {
      case 'company': return company
      case 'audience': return audience
      case 'products': return products
      case 'competitors': return competitors
      case 'geography': return geography
      case 'keywords': return keywords
      case 'ai_geo': return aiGeo
      case 'digital_presence': return digital
      case 'technical_seo': return technical
      default: return undefined
    }
  }

  async function persistStep(key: StepKey, projectId: string) {
    const sectionField = STEP_TO_SECTION[key]
    if (!sectionField) return
    const nextCompleted = Array.from(new Set([...completed, key]))
    await profileApi.save(projectId, {
      [sectionField]: sectionValue(key),
      completed_steps: nextCompleted,
    } as any)
    setCompleted(nextCompleted)
  }

  async function handleNext() {
    setError(null)
    if (step.key === 'company') {
      if (!company.company_name?.trim() || !company.website_url?.trim()) {
        setError('Company name and website URL are required to continue.')
        return
      }
    }
    setSaving(true)
    try {
      const projectId = await ensureBrandAndProject()
      await persistStep(step.key, projectId)
      setStepIdx((i) => Math.min(i + 1, STEPS.length - 1))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function handleBack() {
    setError(null)
    setStepIdx((i) => Math.max(i - 1, 0))
  }

  async function handleLaunch() {
    setError(null)
    setLaunching(true)
    try {
      const projectId = await ensureBrandAndProject()
      const result = await onboardingApi.start({
        project_id: projectId,
        company_name: company.company_name || currentBrand?.name || 'Company',
        website_url: company.website_url || '',
        industry: company.industry,
        target_audience: audience.summary || audience.primary_audience_type,
        country: company.country || geography.primary_market,
        seed_keywords: keywords.seed_keywords ?? [],
      })
      await profileApi.save(projectId, { status: 'completed', completed_steps: STEPS.map(s => s.key) })
      setLaunchResult({
        keywords: result.keyword_summary?.total ?? 0,
        pages: result.scan?.pages_scanned ?? 0,
      })
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to launch the first scan.')
    } finally {
      setLaunching(false)
    }
  }

  const updateProduct = (i: number, patch: Partial<ProductItem>) =>
    setProducts((arr) => arr.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))
  const updateCompetitor = (i: number, patch: Partial<CompetitorItem>) =>
    setCompetitors((arr) => arr.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))

  const seedCount = keywords.seed_keywords?.length ?? 0

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <p className="label mb-1">Guided setup</p>
        <h1 className="text-2xl font-bold text-white">
          {currentBrand ? `Onboarding — ${currentBrand.name}` : 'Set up your brand on Orbita'}
        </h1>
        <p className="text-slate-400 text-sm mt-1 max-w-2xl">
          Each step feeds Orbita's SEO and GEO (AI-search) engines — keyword targeting, content
          briefs, competitor benchmarking and AI-answer monitoring. We save as you go.
        </p>
        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
          <Building2 size={12} />
          {currentBrand
            ? 'Editing this brand’s onboarding — switch brands from the top bar, and re-open anytime to update.'
            : 'A brand is created from your company details below. Switch brands from the top bar to onboard another.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
        {/* ── Progress rail ─────────────────────────────────────────────────── */}
        <aside className="card lg:sticky lg:top-4 h-fit">
          {accountUser && (
            <div className="mb-4 pb-4 border-b border-gray-700/60 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {(accountUser.full_name || accountUser.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-white font-medium truncate">{accountUser.full_name || accountUser.email}</p>
                {accountUser.email && <p className="text-xs text-gray-400 truncate">{accountUser.email}</p>}
              </div>
            </div>
          )}

          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
              <span>Progress</span><span>{progressPct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300" style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          <ol className="relative space-y-0.5">
            {STEPS.map((s, i) => {
              const done = completed.includes(s.key) || (s.key === 'review' && !!launchResult)
              const active = i === stepIdx
              return (
                <li key={s.key}>
                  <button
                    type="button"
                    onClick={() => setStepIdx(i)}
                    className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-colors ${
                      active ? 'bg-indigo-600/20' : 'hover:bg-gray-800/60'
                    }`}
                  >
                    <span className={`flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold flex-shrink-0 ${
                      done ? 'bg-emerald-600 text-white' : active ? 'bg-indigo-500 text-white' : 'bg-gray-700 text-gray-300'
                    }`}>
                      {done ? <Check size={13} /> : i + 1}
                    </span>
                    <span className={`text-sm ${active ? 'text-indigo-100 font-medium' : done ? 'text-gray-300' : 'text-gray-400'}`}>
                      {s.title}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </aside>

        {/* ── Step body ─────────────────────────────────────────────────────── */}
        <section>
          {/* Step header */}
          <div className="card mb-4">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-indigo-600/20 border border-indigo-700/40 flex items-center justify-center text-indigo-300 flex-shrink-0">
                {step.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-indigo-300/80 font-medium">Step {stepIdx + 1} of {STEPS.length}</p>
                <h2 className="text-lg font-semibold text-white leading-tight">{step.title}</h2>
                <p className="text-sm text-gray-400">{step.subtitle}</p>
              </div>
            </div>
            <div className="mt-3 flex items-start gap-2 text-xs text-gray-400 bg-gray-800/50 border border-gray-700/60 rounded-lg px-3 py-2">
              <Info size={13} className="text-indigo-400 mt-0.5 flex-shrink-0" />
              <span><span className="text-gray-300 font-medium">Why this matters: </span>{step.purpose}</span>
            </div>
          </div>

          {/* Step content */}
          <div className="card">
            {error && (
              <div className="mb-4 text-sm text-red-300 bg-red-900/30 border border-red-800/50 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            {step.key === 'company' && (
              <div className="space-y-4">
                <GroupCard title="Company basics" icon={<Building2 size={15} />} accent
                  hint="Required — used to create your brand and seed the website scan.">
                  <FieldGrid>
                    <TextField label="Company name" value={company.company_name} onChange={(v) => setCompany({ ...company, company_name: v })} placeholder="e.g. Orbita" />
                    <TextField label="Website URL" value={company.website_url} onChange={(v) => setCompany({ ...company, website_url: v })} placeholder="https://example.com" />
                    <TextField label="Industry / Category" value={company.industry} onChange={(v) => setCompany({ ...company, industry: v })} placeholder="e.g. SEO software" />
                    <TextField label="Sub-category / Niche" value={company.sub_category} onChange={(v) => setCompany({ ...company, sub_category: v })} optional />
                  </FieldGrid>
                </GroupCard>

                <GroupCard title="Classification & goals" icon={<Target size={15} />}>
                  <FieldGrid>
                    <SelectField label="Company size" value={company.company_size} onChange={(v) => setCompany({ ...company, company_size: v })} options={COMPANY_SIZES} optional />
                    <TextField label="Primary country" value={company.country} onChange={(v) => setCompany({ ...company, country: v })} placeholder="e.g. India" optional />
                  </FieldGrid>
                  <ChipMultiSelect label="Business type" options={BUSINESS_TYPES} value={company.business_type} onChange={(v) => setCompany({ ...company, business_type: v })} />
                  <ChipMultiSelect label="Business goals" options={BUSINESS_GOALS} value={company.business_goals} onChange={(v) => setCompany({ ...company, business_goals: v })} />
                </GroupCard>

                <Collapsible label="Brand assets (optional)">
                  <FieldGrid>
                    <TextField label="Logo URL" value={company.logo_url} onChange={(v) => setCompany({ ...company, logo_url: v })} optional />
                    <TextField label="Brand guidelines URL" value={company.brand_guidelines_url} onChange={(v) => setCompany({ ...company, brand_guidelines_url: v })} optional />
                    <TextField label="Existing SEO report URL" value={company.existing_seo_report_url} onChange={(v) => setCompany({ ...company, existing_seo_report_url: v })} optional />
                    <TextField label="Existing keyword list" value={company.existing_keyword_list} onChange={(v) => setCompany({ ...company, existing_keyword_list: v })} optional />
                  </FieldGrid>
                </Collapsible>
              </div>
            )}

            {step.key === 'audience' && (
              <div className="space-y-4">
                <GroupCard title="Who they are" icon={<Users size={15} />}>
                  <FieldGrid>
                    <TextField label="Primary audience type" value={audience.primary_audience_type} onChange={(v) => setAudience({ ...audience, primary_audience_type: v })} placeholder="e.g. Marketing teams" />
                    <TextField label="Industry served" value={audience.industry_served} onChange={(v) => setAudience({ ...audience, industry_served: v })} optional />
                  </FieldGrid>
                  <TextArea label="Customer personas" value={audience.personas} onChange={(v) => setAudience({ ...audience, personas: v })} placeholder="Describe your key personas" optional />
                </GroupCard>

                <GroupCard title="Markets & intent" icon={<Target size={15} />}>
                  <FieldGrid>
                    <TextField label="Primary markets" value={audience.primary_markets} onChange={(v) => setAudience({ ...audience, primary_markets: v })} optional />
                    <TextField label="Secondary markets" value={audience.secondary_markets} onChange={(v) => setAudience({ ...audience, secondary_markets: v })} optional />
                  </FieldGrid>
                  <ChipMultiSelect label="Audience intent stages" options={INTENT_STAGES} value={audience.intent_stages} onChange={(v) => setAudience({ ...audience, intent_stages: v })} />
                </GroupCard>

                <GroupCard title="Audience summary" icon={<FileText size={15} />} accent
                  hint="A short summary saved to the project and reused across the platform (briefs, content tone).">
                  <TextArea label="Summary" value={audience.summary} onChange={(v) => setAudience({ ...audience, summary: v })} placeholder="e.g. SEO & content marketers at B2B SaaS companies" optional />
                </GroupCard>

                <Collapsible label="Demographics & language (optional)">
                  <FieldGrid>
                    <TextField label="Age group" value={audience.age_group} onChange={(v) => setAudience({ ...audience, age_group: v })} optional />
                    <TextField label="Gender" value={audience.gender} onChange={(v) => setAudience({ ...audience, gender: v })} optional />
                    <TextField label="Income group" value={audience.income_group} onChange={(v) => setAudience({ ...audience, income_group: v })} optional />
                    <TextField label="Preferred languages" value={audience.preferred_languages} onChange={(v) => setAudience({ ...audience, preferred_languages: v })} optional />
                  </FieldGrid>
                </Collapsible>
              </div>
            )}

            {step.key === 'products' && (
              <div className="space-y-4">
                {products.length === 0 && (
                  <div className="text-center py-8 border border-dashed border-gray-700 rounded-xl">
                    <Package size={24} className="mx-auto text-gray-600 mb-2" />
                    <p className="text-sm text-gray-500">No products or services added yet.</p>
                  </div>
                )}
                {products.map((p, i) => (
                  <GroupCard key={i} title={p.name?.trim() ? p.name : `Product / Service ${i + 1}`} icon={<Package size={15} />}>
                    <div className="flex justify-end -mt-8 mb-1">
                      <button type="button" onClick={() => setProducts(products.filter((_, idx) => idx !== i))} className="text-gray-500 hover:text-red-400">
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <FieldGrid>
                      <TextField label="Name" value={p.name} onChange={(v) => updateProduct(i, { name: v })} />
                      <TextField label="Category" value={p.category} onChange={(v) => updateProduct(i, { category: v })} />
                    </FieldGrid>
                    <TextArea label="Short description" value={p.short_description} onChange={(v) => updateProduct(i, { short_description: v })} />
                    <ChipMultiSelect label="Search intent" options={SEARCH_INTENT} value={p.search_intent} onChange={(v) => updateProduct(i, { search_intent: v })} />
                    <Collapsible label="URLs, pricing & geo (optional)">
                      <FieldGrid>
                        <TextField label="Pricing range" value={p.pricing_range} onChange={(v) => updateProduct(i, { pricing_range: v })} optional />
                        <TextField label="Target audience" value={p.target_audience} onChange={(v) => updateProduct(i, { target_audience: v })} optional />
                        <TextField label="Website page URL" value={p.website_page_url} onChange={(v) => updateProduct(i, { website_page_url: v })} optional />
                        <TextField label="Landing page URL" value={p.landing_page_url} onChange={(v) => updateProduct(i, { landing_page_url: v })} optional />
                        <TextField label="Ecommerce URL" value={p.ecommerce_url} onChange={(v) => updateProduct(i, { ecommerce_url: v })} optional />
                        <TextField label="Target cities" value={p.target_cities} onChange={(v) => updateProduct(i, { target_cities: v })} optional />
                      </FieldGrid>
                    </Collapsible>
                  </GroupCard>
                ))}
                <button type="button" onClick={() => setProducts([...products, {}])} className="btn-secondary inline-flex items-center gap-2">
                  <Plus size={14} /> Add product / service
                </button>
              </div>
            )}

            {step.key === 'competitors' && (
              <div className="space-y-4">
                {competitors.length === 0 && (
                  <div className="text-center py-8 border border-dashed border-gray-700 rounded-xl">
                    <Swords size={24} className="mx-auto text-gray-600 mb-2" />
                    <p className="text-sm text-gray-500">No competitors yet. Add the ones you know — Orbita discovers more during the scan.</p>
                  </div>
                )}
                {competitors.map((c, i) => (
                  <GroupCard key={i} title={c.name?.trim() ? c.name : `Competitor ${i + 1}`} icon={<Swords size={15} />}>
                    <div className="flex justify-end -mt-8 mb-1">
                      <button type="button" onClick={() => setCompetitors(competitors.filter((_, idx) => idx !== i))} className="text-gray-500 hover:text-red-400">
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <FieldGrid>
                      <TextField label="Competitor name" value={c.name} onChange={(v) => updateCompetitor(i, { name: v })} />
                      <TextField label="Competitor website" value={c.website} onChange={(v) => updateCompetitor(i, { website: v })} />
                      <TextField label="Category" value={c.category} onChange={(v) => updateCompetitor(i, { category: v })} optional />
                      <TextField label="Visibility notes" value={c.visibility} onChange={(v) => updateCompetitor(i, { visibility: v })} optional />
                    </FieldGrid>
                    <Collapsible label="Competitor URLs (optional)">
                      <TextField label="Product URLs" value={c.product_urls} onChange={(v) => updateCompetitor(i, { product_urls: v })} optional />
                      <TextField label="Blog URLs" value={c.blog_urls} onChange={(v) => updateCompetitor(i, { blog_urls: v })} optional />
                      <TextField label="Landing pages" value={c.landing_pages} onChange={(v) => updateCompetitor(i, { landing_pages: v })} optional />
                    </Collapsible>
                  </GroupCard>
                ))}
                <button type="button" onClick={() => setCompetitors([...competitors, {}])} className="btn-secondary inline-flex items-center gap-2">
                  <Plus size={14} /> Add competitor
                </button>
              </div>
            )}

            {step.key === 'geography' && (
              <div className="space-y-4">
                <GroupCard title="Markets" icon={<MapPin size={15} />}>
                  <FieldGrid>
                    <TextField label="Countries" value={geography.countries} onChange={(v) => setGeography({ ...geography, countries: v })} placeholder="e.g. India, USA" />
                    <TextField label="States / Regions" value={geography.states} onChange={(v) => setGeography({ ...geography, states: v })} optional />
                    <TextField label="Cities" value={geography.cities} onChange={(v) => setGeography({ ...geography, cities: v })} optional />
                    <TextField label="Districts / Zones" value={geography.districts} onChange={(v) => setGeography({ ...geography, districts: v })} optional />
                  </FieldGrid>
                </GroupCard>
                <GroupCard title="Localization" icon={<Globe2 size={15} />}>
                  <FieldGrid>
                    <TextField label="Languages" value={geography.languages} onChange={(v) => setGeography({ ...geography, languages: v })} optional />
                    <TextField label="Primary language" value={geography.primary_language} onChange={(v) => setGeography({ ...geography, primary_language: v })} optional />
                    <TextField label="Dialects" value={geography.dialects} onChange={(v) => setGeography({ ...geography, dialects: v })} optional />
                    <TextField label="Currency" value={geography.currency} onChange={(v) => setGeography({ ...geography, currency: v })} optional />
                  </FieldGrid>
                </GroupCard>
                <GroupCard title="Priority markets" icon={<Target size={15} />}>
                  <FieldGrid cols={3}>
                    <TextField label="Primary market" value={geography.primary_market} onChange={(v) => setGeography({ ...geography, primary_market: v })} optional />
                    <TextField label="Secondary market" value={geography.secondary_market} onChange={(v) => setGeography({ ...geography, secondary_market: v })} optional />
                    <TextField label="Expansion markets" value={geography.expansion_markets} onChange={(v) => setGeography({ ...geography, expansion_markets: v })} optional />
                  </FieldGrid>
                </GroupCard>
                <Collapsible label="Hyperlocal inputs (optional)">
                  <FieldGrid cols={3}>
                    <TextField label="Pin / ZIP codes" value={geography.pin_codes} onChange={(v) => setGeography({ ...geography, pin_codes: v })} optional />
                    <TextField label="Store locations" value={geography.store_locations} onChange={(v) => setGeography({ ...geography, store_locations: v })} optional />
                    <TextField label="Google Business locations" value={geography.google_business_locations} onChange={(v) => setGeography({ ...geography, google_business_locations: v })} optional />
                  </FieldGrid>
                </Collapsible>
              </div>
            )}

            {step.key === 'keywords' && (
              <div className="space-y-4">
                <GroupCard title="Seed keywords & prompts" icon={<Search size={15} />} accent
                  hint="Add at least 10 primary keywords or prompts across all products and services. We expand and cluster these automatically.">
                  <TagInput
                    label="Keywords"
                    value={keywords.seed_keywords}
                    onChange={(v) => setKeywords({ ...keywords, seed_keywords: v })}
                    placeholder="e.g. creative agency in mumbai"
                    max={30}
                  />
                </GroupCard>
                <Collapsible label="Keyword categories (optional)" count={[keywords.brand_keywords, keywords.product_keywords, keywords.problem_solving_keywords, keywords.competitor_keywords, keywords.local_keywords].filter(Boolean).length}>
                  <FieldGrid>
                    <TextArea label="Brand keywords" value={keywords.brand_keywords} onChange={(v) => setKeywords({ ...keywords, brand_keywords: v })} optional />
                    <TextArea label="Product keywords" value={keywords.product_keywords} onChange={(v) => setKeywords({ ...keywords, product_keywords: v })} optional />
                    <TextArea label="Problem-solving keywords" value={keywords.problem_solving_keywords} onChange={(v) => setKeywords({ ...keywords, problem_solving_keywords: v })} optional />
                    <TextArea label="Competitor keywords" value={keywords.competitor_keywords} onChange={(v) => setKeywords({ ...keywords, competitor_keywords: v })} optional />
                    <TextArea label="Local keywords" value={keywords.local_keywords} onChange={(v) => setKeywords({ ...keywords, local_keywords: v })} optional />
                  </FieldGrid>
                </Collapsible>
              </div>
            )}

            {step.key === 'ai_geo' && (
              <div className="space-y-4">
                <GroupCard title="Platforms to optimize for" icon={<Sparkles size={15} />} accent
                  hint="The AI engines Orbita will probe and optimize your visibility in.">
                  <ChipMultiSelect label="AI platforms" options={AI_PLATFORMS} value={aiGeo.platforms} onChange={(v) => setAiGeo({ ...aiGeo, platforms: v })} />
                </GroupCard>
                <GroupCard title="Content intent preferences" icon={<FileText size={15} />}>
                  <ChipMultiSelect label="Content intent" options={CONTENT_INTENT} value={aiGeo.content_intent} onChange={(v) => setAiGeo({ ...aiGeo, content_intent: v })} />
                </GroupCard>
              </div>
            )}

            {step.key === 'digital_presence' && (
              <div className="space-y-4">
                <GroupCard title="Website" icon={<Globe2 size={15} />}>
                  <FieldGrid>
                    <TextField label="CMS platform" value={digital.cms_platform} onChange={(v) => setDigital({ ...digital, cms_platform: v })} optional />
                    <TextField label="Blog availability" value={digital.blog_availability} onChange={(v) => setDigital({ ...digital, blog_availability: v })} optional />
                    <TextField label="Sitemap URL" value={digital.sitemap_url} onChange={(v) => setDigital({ ...digital, sitemap_url: v })} optional />
                    <TextField label="Robots.txt URL" value={digital.robots_url} onChange={(v) => setDigital({ ...digital, robots_url: v })} optional />
                  </FieldGrid>
                </GroupCard>
                <GroupCard title="Existing SEO tools" icon={<Wrench size={15} />}>
                  <ChipMultiSelect label="Tools in use" options={SEO_TOOLS} value={digital.seo_tools} onChange={(v) => setDigital({ ...digital, seo_tools: v })} />
                  <TextField label="Other tools" value={digital.other_tools} onChange={(v) => setDigital({ ...digital, other_tools: v })} optional />
                </GroupCard>
                <GroupCard title="Social & local presence" icon={<Share2 size={15} />}>
                  <ChipMultiSelect label="Social platforms" options={SOCIAL_PLATFORMS} value={digital.social_platforms} onChange={(v) => setDigital({ ...digital, social_platforms: v })} />
                  <FieldGrid cols={3}>
                    <TextField label="Google Business Profile" value={digital.google_business_profile} onChange={(v) => setDigital({ ...digital, google_business_profile: v })} optional />
                    <TextField label="Maps listings" value={digital.maps_listings} onChange={(v) => setDigital({ ...digital, maps_listings: v })} optional />
                    <TextField label="Directory listings" value={digital.directory_listings} onChange={(v) => setDigital({ ...digital, directory_listings: v })} optional />
                  </FieldGrid>
                </GroupCard>
              </div>
            )}

            {step.key === 'technical_seo' && (
              <div className="space-y-4">
                <GroupCard title="Site signals" icon={<Wrench size={15} />}
                  hint="All optional — leave blank if unsure. These refine technical audits.">
                  <FieldGrid>
                    <TextField label="Domain authority" value={technical.domain_authority} onChange={(v) => setTechnical({ ...technical, domain_authority: v })} optional />
                    <TextField label="Website speed report" value={technical.website_speed_report} onChange={(v) => setTechnical({ ...technical, website_speed_report: v })} optional />
                    <TextField label="Core Web Vitals" value={technical.core_web_vitals} onChange={(v) => setTechnical({ ...technical, core_web_vitals: v })} optional />
                    <TextField label="Structured data availability" value={technical.structured_data} onChange={(v) => setTechnical({ ...technical, structured_data: v })} optional />
                  </FieldGrid>
                </GroupCard>
                <GroupCard title="Integrations" icon={<Share2 size={15} />}>
                  <ChipMultiSelect label="Connect" options={INTEGRATIONS} value={technical.integrations} onChange={(v) => setTechnical({ ...technical, integrations: v })} />
                </GroupCard>
              </div>
            )}

            {step.key === 'review' && (
              <div className="space-y-4">
                {launchResult ? (
                  <div className="text-center py-6">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-600/20 text-emerald-300 mb-3">
                      <Check size={28} />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Onboarding complete</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      Scanned {launchResult.pages} page(s) and generated {launchResult.keywords} keyword opportunities.
                    </p>
                    <div className="mt-5 flex justify-center gap-3">
                      <button onClick={() => navigate('/dashboard/discover/keywords')} className="btn-primary inline-flex items-center gap-2">
                        Review Keywords <ArrowRight size={14} />
                      </button>
                      <button onClick={() => navigate('/dashboard/discover')} className="btn-secondary">Go to Discover</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-400">
                      Review your setup, then launch the first website scan and keyword generation.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                      <ReviewRow label="Company" value={company.company_name} />
                      <ReviewRow label="Website" value={company.website_url} />
                      <ReviewRow label="Industry" value={company.industry} />
                      <ReviewRow label="Business type" value={company.business_type?.join(', ')} />
                      <ReviewRow label="Audience" value={audience.summary || audience.primary_audience_type} />
                      <ReviewRow label="Products" value={products.length ? `${products.length} added` : undefined} />
                      <ReviewRow label="Competitors" value={competitors.length ? `${competitors.length} added` : undefined} />
                      <ReviewRow label="Seed keywords" value={seedCount ? `${seedCount} added` : undefined} />
                      <ReviewRow label="AI platforms" value={aiGeo.platforms?.join(', ')} />
                    </div>
                    {seedCount < 10 && (
                      <div className="text-xs text-amber-300/90 bg-amber-900/20 border border-amber-800/40 rounded-lg px-3 py-2 flex items-center gap-2">
                        <Sparkles size={13} /> Tip: the IA recommends at least 10 seed keywords — we'll auto-extract more from your site during the scan.
                      </div>
                    )}
                    <button onClick={handleLaunch} disabled={launching || !company.website_url} className="btn-primary inline-flex items-center gap-2">
                      {launching ? <Loader2 size={15} className="animate-spin" /> : <Rocket size={15} />}
                      {launching ? 'Scanning website & generating keywords…' : 'Finish & run first scan'}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Footer nav */}
            {!(step.key === 'review' && launchResult) && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-700/60">
                <button onClick={handleBack} disabled={stepIdx === 0 || saving} className="btn-secondary inline-flex items-center gap-2 disabled:opacity-40">
                  <ArrowLeft size={14} /> Back
                </button>
                <div className="flex items-center gap-3">
                  {!isLast && step.key !== 'company' && (
                    <button onClick={() => { setError(null); setStepIdx((i) => Math.min(i + 1, STEPS.length - 1)) }} disabled={saving} className="text-sm text-gray-400 hover:text-gray-200">
                      Skip
                    </button>
                  )}
                  {!isLast && (
                    <button onClick={handleNext} disabled={saving} className="btn-primary inline-flex items-center gap-2">
                      {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                      {saving ? 'Saving…' : 'Save & Continue'}
                      {!saving && <ArrowRight size={14} />}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

        </section>
      </div>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-lg bg-gray-800/50 border border-gray-700/60 px-3 py-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm text-gray-200 truncate">{value || <span className="text-gray-600">—</span>}</p>
    </div>
  )
}
