import axios from 'axios'

export const getCookie = (name: string) => {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? match[2] : ''
}

export const BRAND_ID = () => getCookie('orbit_brand_id')
export const ORG_ID = () => getCookie('orbit_org_id')

const api = axios.create({
  baseURL: '/api/knowledge',
  headers: { 'Content-Type': 'application/json' },
})

const getContextHeaders = () => {
  const headers: Record<string, string> = {}
  const orgId = ORG_ID()
  const brandId = BRAND_ID()

  if (orgId) headers['X-Orbita-Org-Id'] = orgId
  if (brandId) headers['X-Orbita-Brand-Id'] = brandId

  return headers
}

api.interceptors.request.use((config) => {
  const token = getCookie('orbit_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  Object.assign(config.headers, getContextHeaders())
  return config
})

// ── Entities ──────────────────────────────────────────────────────────────
export const getEntities = (search?: string, type?: string) =>
  BRAND_ID()
    ? api.get('/entities', { params: { brand_id: BRAND_ID(), search, type } }).then(r => r.data)
    : Promise.resolve([])

export const getEntity = (id: string) =>
  api.get(`/entities/${id}`).then(r => r.data)

export const createEntity = (data: object) =>
  api.post('/entities', { ...data, brand_id: BRAND_ID(), organization_id: ORG_ID() }).then(r => r.data)

export const updateEntity = (id: string, data: object) =>
  api.put(`/entities/${id}`, data).then(r => r.data)

export const deleteEntity = (id: string) =>
  api.delete(`/entities/${id}`).then(r => r.data)

// ── Facts ─────────────────────────────────────────────────────────────────
export const searchFacts = (params?: object) =>
  BRAND_ID()
    ? api.get('/facts/search', { params: { brand_id: BRAND_ID(), ...params } }).then(r => r.data)
    : Promise.resolve([])

export const addFact = (entityId: string, data: object) =>
  api.post(`/facts/entity/${entityId}`, data).then(r => r.data)

export const updateFact = (factId: string, data: object) =>
  api.put(`/facts/${factId}`, data).then(r => r.data)

export const deleteFact = (factId: string) =>
  api.delete(`/facts/${factId}`).then(r => r.data)

// ── Sources ───────────────────────────────────────────────────────────────
export const getSources = (type?: string) =>
  BRAND_ID()
    ? api.get('/sources', { params: { brand_id: BRAND_ID(), source_type: type } }).then(r => r.data)
    : Promise.resolve([])

export const addSource = (data: object) =>
  api.post('/sources', { ...data, brand_id: BRAND_ID(), organization_id: ORG_ID() }).then(r => r.data)

export const deleteSource = (id: string) =>
  api.delete(`/sources/${id}`).then(r => r.data)

// ── FactGuard ─────────────────────────────────────────────────────────────
export const verifyClaim = (claim: string) =>
  BRAND_ID()
    ? api.post('/factguard/verify', { claim, brand_id: BRAND_ID() }).then(r => r.data)
    : Promise.resolve({ claim, status: 'error', matches: [], confidence: 0, match_count: 0 })

// ── Authors ───────────────────────────────────────────────────────────────
export const getAuthors = () =>
  BRAND_ID()
    ? api.get('/authors', { params: { brand_id: BRAND_ID() } }).then(r => r.data)
    : Promise.resolve([])

export const createAuthor = (data: object) =>
  api.post('/authors', { ...data, brand_id: BRAND_ID(), organization_id: ORG_ID() }).then(r => r.data)

export const updateAuthor = (id: string, data: object) =>
  api.put(`/authors/${id}`, data).then(r => r.data)

export const deleteAuthor = (id: string) =>
  api.delete(`/authors/${id}`).then(r => r.data)
