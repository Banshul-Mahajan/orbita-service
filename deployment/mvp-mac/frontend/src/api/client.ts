import axios from 'axios'

export const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

const getContextHeaders = () => {
  const headers: Record<string, string> = {}
  const orgId = getCookie('orbit_org_id')
  const brandId = getCookie('orbit_brand_id')
  const projectId = getCookie('orbit_project_id')

  if (orgId) headers['X-Orbita-Org-Id'] = orgId
  if (brandId) headers['X-Orbita-Brand-Id'] = brandId
  if (projectId) headers['X-Orbita-Project-Id'] = projectId

  return headers
}

api.interceptors.request.use((config) => {
  const match = document.cookie.match(new RegExp('(^| )orbit_token=([^;]+)'))
  const token = match ? match[2] : null
  if (token) config.headers.Authorization = `Bearer ${token}`
  Object.assign(config.headers, getContextHeaders())
  return config
})

// Separate client for Auth Service endpoints (brands, projects, auth)
// This uses /auth-api so auth routes never overlap with local /api/* routes.
const authApi = axios.create({
  baseURL: '/auth-api',
  headers: { 'Content-Type': 'application/json' },
})
authApi.interceptors.request.use((config) => {
  const match = document.cookie.match(new RegExp('(^| )orbit_token=([^;]+)'))
  const token = match ? match[2] : null
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Type helpers ──────────────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean
  data: T
  error?: string
}

async function call<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data } = await promise
  if (!data.success) throw new Error(data.error ?? 'Unknown API error')
  return data.data
}

export const getCookie = (name: string) => {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? match[2] : ''
}

// ── Projects (via Auth Service) ───────────────────────────────────────────────
export interface Project {
  id: string
  name: string
  description?: string
  created_at: string
}

export const projectsApi = {
  list: async (): Promise<Project[]> => {
    const brandId = getCookie('orbit_brand_id');
    if (!brandId) return []
    const { data } = await authApi.get(`/brands/${brandId}/projects`)
    return data
  },
  create: async (name: string, description?: string): Promise<Project> => {
    const brandId = getCookie('orbit_brand_id');
    if (!brandId) throw new Error('No brand selected. Set orbit_brand_id cookie first.')
    const { data } = await authApi.post(`/brands/${brandId}/projects`, { name, description })
    return data
  },
  delete: (id: string) => call<{ deleted: string }>(api.delete(`/projects/${id}`)),
}

// ── Onboarding ────────────────────────────────────────────────────────────────
export interface OnboardingStartInput {
  project_id: string
  company_name: string
  website_url: string
  industry?: string
  target_audience?: string
  country?: string
  limit_per_seed?: number
}

export interface OnboardingStatus {
  project: Project
  profile?: {
    company_name: string
    website_url: string
    primary_domain?: string
    industry?: string
    target_audience?: string
    country?: string
    onboarding_status: string
  }
  scan?: {
    id: string
    status?: string
    pages_scanned: number
    seed_topics: string[]
    errors: string[]
  }
  pages?: {
    id: string
    url: string
    title?: string
    h1?: string
    page_type?: string
    word_count?: number
    crawl_status: string
  }[]
  keyword_summary: {
    total: number
    selected: number
    by_intent: Record<string, number>
  }
}

export const onboardingApi = {
  start: (input: OnboardingStartInput) =>
    call<OnboardingStatus>(api.post('/onboarding/start', input)),
  get: (project_id: string) =>
    call<OnboardingStatus>(api.get(`/onboarding/${project_id}`)),
  scan: (project_id: string, website_url: string, limit_per_seed = 12) =>
    call<Pick<OnboardingStatus, 'scan' | 'keyword_summary'>>(
      api.post('/onboarding/scan', { project_id, website_url, limit_per_seed })
    ),
}

// ── Keywords ──────────────────────────────────────────────────────────────────
export interface KeywordItem {
  id?: string
  keyword: string
  intent: string
  volume?: number
  difficulty?: number
}

export interface KeywordCluster {
  cluster_id: number
  cluster_name: string
  intent: string
  keywords: KeywordItem[]
}

export interface KeywordExpandResult {
  seed_keyword: string
  total_keywords: number
  clusters: KeywordCluster[]
}

export interface KeywordOpportunity {
  id: string
  keyword: string
  seed_topic?: string
  intent: string
  intent_score?: number
  volume?: number
  difficulty?: number
  relevance_score?: number
  cluster_name?: string
  selected: boolean
  source_page_url?: string
}

export interface KeywordOpportunityResult {
  project_id: string
  total_keywords: number
  selected_keywords: number
  grouped: Record<string, KeywordOpportunity[]>
  all: KeywordOpportunity[]
}

export const keywordsApi = {
  expand: (project_id: string, seed_keyword: string, limit = 50) =>
    call<KeywordExpandResult>(api.post('/keywords/expand', { project_id, seed_keyword, limit })),
  get: (project_id: string) =>
    call<{ clusters: KeywordCluster[]; total_keywords: number }>(
      api.get(`/keywords/${project_id}`)
    ),
  opportunities: (project_id: string) =>
    call<KeywordOpportunityResult>(api.get(`/keywords/opportunities/${project_id}`)),
  select: (project_id: string, keyword_ids: string[], selected = true) =>
    call<{ updated: number; selected: boolean; keyword_ids: string[] }>(
      api.post('/keywords/select', { project_id, keyword_ids, selected })
    ),
}

// ── SERP ──────────────────────────────────────────────────────────────────────
export interface SerpResultItem {
  position: number
  title: string
  url: string
  domain: string
  snippet: string
  headings: { level: string; text: string }[]
  entities: string[]
  word_count: number
  readability: number
}

export const serpApi = {
  analyze: (project_id: string, query: string, num_results = 10) =>
    call<{ query: string; results: SerpResultItem[] }>(
      api.post('/serp/analyze', { project_id, query, num_results })
    ),
  get: (project_id: string, query: string) =>
    call<{ query: string; results: SerpResultItem[] }>(
      api.get(`/serp/${project_id}`, { params: { query } })
    ),
}

// ── Competitors ───────────────────────────────────────────────────────────────
export interface CompetitorDomain {
  id: string
  domain: string
  avg_position?: number
  ranking_keyword_count: number
  visibility_score: number
  top_keywords: string[]
  created_at: string
}

export interface CompetitorPage {
  id: string
  competitor_domain_id: string
  domain?: string
  keyword_id?: string
  keyword: string
  url?: string
  title?: string
  position?: number
  headings: { level: string; text: string }[]
  entities: string[]
  word_count?: number
  readability?: number
  created_at: string
}

export interface CompetitorResult {
  project_id: string
  domains: CompetitorDomain[]
  pages: CompetitorPage[]
}

export const competitorsApi = {
  discover: (project_id: string, num_results = 10) =>
    call<CompetitorResult>(api.post('/competitors/discover', { project_id, num_results })),
  get: (project_id: string) =>
    call<CompetitorResult>(api.get(`/competitors/${project_id}`)),
}

// ── AI Scan ───────────────────────────────────────────────────────────────────
export interface AiEngineResult {
  engine: string
  answer_text: string
  cited_urls: string[]
  cited_domains: string[]
  answer_length: number
}

export const aiScanApi = {
  scan: (project_id: string, query: string, engines = ['openai', 'gemini', 'perplexity']) =>
    call<{ query: string; results: AiEngineResult[] }>(
      api.post('/ai-scan', { project_id, query, engines })
    ),
  get: (project_id: string, query: string) =>
    call<{ query: string; results: AiEngineResult[] }>(
      api.get(`/ai-scan/${project_id}`, { params: { query } })
    ),
}

// ── Heatmap ───────────────────────────────────────────────────────────────────
export interface HeatmapChannel {
  channel: string
  label: string
  coverage_score: number
  top_domains: string[]
  gap: boolean
}

export interface HeatmapData {
  query: string
  channels: HeatmapChannel[]
  overlap_analysis: {
    domains_in_both: string[]
    only_in_google: string[]
    only_in_ai: string[]
    overlap_ratio: number
  }
  insight: string
}

export const heatmapApi = {
  get: (project_id: string, query: string) =>
    call<HeatmapData>(api.get(`/heatmap/${project_id}`, { params: { query } })),
}

// ── Questions ─────────────────────────────────────────────────────────────────
export interface QuestionResult {
  question_text: string
  source: string
  q_type: string
}

export interface QuestionMineResult {
  topic: string
  total: number
  grouped: Record<string, string[]>
  all: QuestionResult[]
}

export const questionsApi = {
  mine: (project_id: string, topic: string) =>
    call<QuestionMineResult>(api.post('/questions/mine', { project_id, topic })),
  get: (project_id: string, topic: string) =>
    call<{ topic: string; total: number; grouped: Record<string, string[]> }>(
      api.get(`/questions/${project_id}`, { params: { topic } })
    ),
}

// ── Content ──────────────────────────────────────────────────────────────────
export interface ContentDraft {
  id: string
  project_id: string
  keyword_id?: string
  title: string
  slug?: string
  content_type: string
  intent: string
  status: string
  meta_title?: string
  meta_description?: string
  outline: string[]
  body_markdown?: string
  faq: { question: string; answer: string }[]
  created_at: string
  updated_at: string
}

export const contentApi = {
  generate: (project_id: string, keyword_id: string, content_type: string, tone = 'helpful') =>
    call<ContentDraft>(
      api.post('/content/generate', { project_id, keyword_id, content_type, tone })
    ),
  list: (project_id: string) =>
    call<{ project_id: string; drafts: ContentDraft[] }>(api.get(`/content/${project_id}`)),
  get: (draft_id: string) =>
    call<ContentDraft>(api.get(`/content/draft/${draft_id}`)),
}


// ── Dashboard counts ──────────────────────────────────────────────────────────
export const dashboardApi = {
  serpCount: (project_id: string) =>
    call<{ total_results: number; total_queries: number }>(
      api.get(`/serp/${project_id}/count`)
    ),
  aiCount: (project_id: string) =>
    call<{ total_scans: number; total_queries: number }>(
      api.get(`/ai-scan/${project_id}/count`)
    ),
  questionCount: (project_id: string) =>
    call<{ total_questions: number; total_topics: number }>(
      api.get(`/questions/${project_id}/count`)
    ),
}
