import axios from 'axios'

const getCookie = (name) => {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? match[2] : null
}

const getContextHeaders = () => {
  const headers = {}
  const orgId = getCookie('orbit_org_id')
  const brandId = getCookie('orbit_brand_id')
  const projectId = getCookie('orbit_project_id')

  if (orgId) headers['X-Orbita-Org-Id'] = orgId
  if (brandId) headers['X-Orbita-Brand-Id'] = brandId
  if (projectId) headers['X-Orbita-Project-Id'] = projectId

  return headers
}

const api = axios.create({
  baseURL: '/api/create',
  headers: { 'Content-Type': 'application/json' },
})

// Attach token — reads orbit_token cookie OR access_token localStorage (Mission Control)
api.interceptors.request.use((config) => {
  const token = getCookie('orbit_token') || localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  Object.assign(config.headers, getContextHeaders())
  return config
})

// In Mission Control context, don't auto-logout on 401 — just reject so UI can show the error
api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
)

export default api

const authClient = axios.create({
  baseURL: '/api/auth',
  headers: { 'Content-Type': 'application/json' },
})

authClient.interceptors.request.use((config) => {
  const token = getCookie('orbit_token') || localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data) => authClient.post('/register', data),
  login: (data) => authClient.post('/login', data),
  me: () => authClient.get('/me'),
}

// ── Corpus ────────────────────────────────────────────────────────────────────
export const corpusApi = {
  ingestText: (data) => api.post('/corpus/ingest/text', data),
  ingestUrl: (data) => api.post('/corpus/ingest/url', data),
  list: () => api.get('/corpus/documents'),
  delete: (id) => api.delete(`/corpus/documents/${id}`),
  query: (data) => api.post('/corpus/query', data),
  stats: () => api.get('/corpus/stats'),
}

// ── Briefs ────────────────────────────────────────────────────────────────────
export const briefsApi = {
  generate: (data) => api.post('/briefs/generate', data),
  list: () => api.get('/briefs/'),
  get: (id) => api.get(`/briefs/${id}`),
  update: (id, data) => api.put(`/briefs/${id}`, data),
  delete: (id) => api.delete(`/briefs/${id}`),
}

// ── Articles ──────────────────────────────────────────────────────────────────
export const articlesApi = {
  create: (data) => api.post('/articles/', data),
  list: () => api.get('/articles/'),
  get: (id) => api.get(`/articles/${id}`),
  update: (id, data) => api.put(`/articles/${id}`, data),
  saveGenerated: (id, body) => api.post(`/articles/${id}/save-generated`, { body }),
  delete: (id) => api.delete(`/articles/${id}`),
}

// ── FactGuard ─────────────────────────────────────────────────────────────────
export const factguardApi = {
  check: (articleId) => api.post(`/factguard/check/${articleId}`),
  getClaims: (articleId) => api.get(`/factguard/claims/${articleId}`),
  overrideClaim: (claimId, status) =>
    api.put(`/factguard/claims/${claimId}/override`, { status }),
}
