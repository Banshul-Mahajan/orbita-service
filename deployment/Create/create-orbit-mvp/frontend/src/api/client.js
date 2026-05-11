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
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = getCookie('orbit_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  Object.assign(config.headers, getContextHeaders())
  return config
})

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      document.cookie = 'orbit_token=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

const authClient = axios.create({
  baseURL: '/auth-api',
  headers: { 'Content-Type': 'application/json' },
})

authClient.interceptors.request.use((config) => {
  const token = getCookie('orbit_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data) => authClient.post('/auth/register', data),
  login: (data) => authClient.post('/auth/login', data),
  me: () => authClient.get('/auth/me'),
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
