import axios from 'axios'
import type { OnboardingProfile, ProfileSave } from '../types'

// Re-export the discover helpers the wizard reuses for the final scan + project creation.
export { onboardingApi, projectsApi } from '../../discover/api/client'
export type { OnboardingStartInput } from '../../discover/api/client'

const getCookie = (name: string) => {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? match[2] : ''
}

// Single axios instance for the auth-service (/api/*) and discover (/api/discover/*)
// endpoints the onboarding wizard touches. Token comes from the orbit_token cookie,
// matching the other module clients.
const http = axios.create({ headers: { 'Content-Type': 'application/json' } })
http.interceptors.request.use((config) => {
  const token = getCookie('orbit_token') || localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  const orgId = getCookie('orbit_org_id')
  const brandId = getCookie('orbit_brand_id')
  const projectId = getCookie('orbit_project_id')
  if (orgId) config.headers['X-Orbita-Org-Id'] = orgId
  if (brandId) config.headers['X-Orbita-Brand-Id'] = brandId
  if (projectId) config.headers['X-Orbita-Project-Id'] = projectId
  return config
})

interface ApiResponse<T> { success: boolean; data: T; error?: string }

// ── Brand creation (Auth Service) ──────────────────────────────────────────────
export interface BrandRecord {
  id: string
  name: string
  industry?: string
  website_url?: string
  country?: string
}

export interface BrandCreateInput {
  name: string
  website_url?: string
  industry?: string
  country?: string
}

export const brandApi = {
  create: async (input: BrandCreateInput): Promise<BrandRecord> => {
    // Trailing slash avoids the Nginx 307 redirect on POST in production.
    const { data } = await http.post('/api/brands/', input)
    return data
  },
}

// ── Onboarding profile (Discover backend) ──────────────────────────────────────
export const profileApi = {
  get: async (projectId: string): Promise<OnboardingProfile> => {
    const { data } = await http.get<ApiResponse<OnboardingProfile>>(
      `/api/discover/onboarding/${projectId}/profile`
    )
    if (!data.success) throw new Error(data.error ?? 'Failed to load profile')
    return data.data
  },
  save: async (projectId: string, body: ProfileSave): Promise<OnboardingProfile> => {
    const { data } = await http.put<ApiResponse<OnboardingProfile>>(
      `/api/discover/onboarding/${projectId}/profile`,
      body
    )
    if (!data.success) throw new Error(data.error ?? 'Failed to save profile')
    return data.data
  },
}
