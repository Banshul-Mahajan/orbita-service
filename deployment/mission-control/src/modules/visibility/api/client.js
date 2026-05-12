import axios from 'axios'

export const getCookie = (name) => {
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

const api = axios.create({ baseURL: '/api/visibility' })

// Attach JWT on every request — reads from orbit_token cookie OR access_token localStorage
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

// ─── Auth (uses /auth-api so auth routes never overlap with local /api/v1/*) ───
const authClient = axios.create({ baseURL: '/api/auth' })
authClient.interceptors.request.use((config) => {
  const token = getCookie('orbit_token') || localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

const platformApi = axios.create({ baseURL: '/api' })
platformApi.interceptors.request.use((config) => {
  const token = getCookie('orbit_token') || localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const authAPI = {
  register: (data) => authClient.post('/register', data),
  login:    (data) => authClient.post('/login', data),
  me:       ()     => authClient.get('/me'),
}

// ─── Brands ────────────────────────────────────────────────────────────────────
export const brandsAPI = {
  list:   ()       => api.get('/brands'),
  create: (data)   => api.post('/brands', data),
  update: (id, data) => platformApi.put(`/brands/${id}`, {
    name: data.name,
    industry: data.industry || null,
    description: data.description || null,
    website_url: data.website || data.website_url || null,
  }),
  get:    (id)     => api.get(`/brands/${id}`),
  delete: (id)     => api.delete(`/brands/${id}`),
}

// ─── Facts ─────────────────────────────────────────────────────────────────────
export const factsAPI = {
  list:   (brandId)         => api.get(`/brands/${brandId}/facts`),
  create: (brandId, data)   => api.post(`/brands/${brandId}/facts`, data),
  delete: (brandId, factId) => api.delete(`/brands/${brandId}/facts/${factId}`),
}

// ─── Prompts ───────────────────────────────────────────────────────────────────
export const promptsAPI = {
  list:   (brandId)           => api.get(`/brands/${brandId}/prompts`),
  create: (brandId, data)     => api.post(`/brands/${brandId}/prompts`, data),
  delete: (brandId, promptId) => api.delete(`/brands/${brandId}/prompts/${promptId}`),
}

// ─── Probes ────────────────────────────────────────────────────────────────────
export const probesAPI = {
  run:       (brandId, data) => api.post(`/brands/${brandId}/probes/run`, data),
  list:      (brandId)       => api.get(`/brands/${brandId}/probes`),
  get:       (brandId, runId)=> api.get(`/brands/${brandId}/probes/${runId}`),
  dashboard: (brandId)       => api.get(`/brands/${brandId}/dashboard`),
}

// ─── Alerts ────────────────────────────────────────────────────────────────────
export const alertsAPI = {
  list:    (brandId, resolved = false) => api.get(`/brands/${brandId}/alerts`, { params: { resolved } }),
  resolve: (brandId, alertId)  => api.patch(`/brands/${brandId}/alerts/${alertId}/resolve`),
}
