import { createContext, useContext, useState, useCallback } from 'react'
import { authAPI } from '../api/client'

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

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('orbit_user')) } catch { return null }
  })

  const login = useCallback(async (email, password) => {
    const { data } = await authAPI.login({ email, password })
    setCookie('orbit_token', data.access_token)
    setCookie('orbit_org_id', data.org_id)
    const userObj = { id: data.user_id, email: data.email, full_name: data.full_name, org_id: data.org_id }
    localStorage.setItem('orbit_user', JSON.stringify(userObj))
    setUser(userObj)
    return data
  }, [])

  const register = useCallback(async (payload) => {
    const { data } = await authAPI.register(payload)
    setCookie('orbit_token', data.access_token)
    setCookie('orbit_org_id', data.org_id)
    const userObj = { id: data.user_id, email: data.email, full_name: data.full_name, org_id: data.org_id }
    localStorage.setItem('orbit_user', JSON.stringify(userObj))
    setUser(userObj)
    return data
  }, [])

  const logout = useCallback(() => {
    clearCookie('orbit_token')
    clearCookie('orbit_org_id')
    clearCookie('orbit_brand_id')
    clearCookie('orbit_project_id')
    localStorage.removeItem('orbit_user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
