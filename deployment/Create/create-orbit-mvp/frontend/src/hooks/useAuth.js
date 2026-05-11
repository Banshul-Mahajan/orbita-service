import { create } from 'zustand'

const getCookie = (name) => {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? match[2] : null
}

const setCookie = (name, value) => {
  document.cookie = `${name}=${value};path=/;max-age=86400;SameSite=Lax`
}

const clearCookie = (name) => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
}

const safeParseItem = (key) => {
  try { return JSON.parse(localStorage.getItem(key)) } catch (e) { return null }
}

const useAuth = create((set) => ({
  user: safeParseItem('orbit_user'),
  token: getCookie('orbit_token') || null,

  login: (token, user) => {
    setCookie('orbit_token', token)
    localStorage.setItem('orbit_user', JSON.stringify(user))
    set({ token, user })
  },

  logout: () => {
    clearCookie('orbit_token')
    clearCookie('orbit_org_id')
    clearCookie('orbit_brand_id')
    clearCookie('orbit_project_id')
    localStorage.removeItem('orbit_user')
    set({ token: null, user: null })
  },

  isAuthenticated: () => !!getCookie('orbit_token'),
}))

export default useAuth
