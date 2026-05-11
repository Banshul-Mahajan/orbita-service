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

const api = axios.create({ baseURL: '/api/v1' })

// Attach JWT on every request
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

// ─── Auth (uses /auth-api so auth routes never overlap with local /api/v1/*) ───
const authClient = axios.create({ baseURL: '/auth-api' })
authClient.interceptors.request.use((config) => {
  const token = getCookie('orbit_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const authAPI = {
  register: (data) => authClient.post('/auth/register', data),
  login:    (data) => authClient.post('/auth/login', data),
  me:       ()     => authClient.get('/auth/me'),
}

// ─── Brands ────────────────────────────────────────────────────────────────────
export const brandsAPI = {
  list:   ()       => api.get('/brands'),
  create: (data)   => api.post('/brands', data),
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
