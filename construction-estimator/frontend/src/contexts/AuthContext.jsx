import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authLogin, authSignup, getMe } from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]         = useState(null)
  const [isLoading, setLoading] = useState(true)

  // On mount: check for existing token and fetch /me
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setLoading(false)
      return
    }
    getMe()
      .then((r) => setUser(r.data))
      .catch(() => {
        localStorage.removeItem('access_token')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const r = await authLogin({ email, password })
    localStorage.setItem('access_token', r.data.access_token)
    setUser(r.data.user)
  }, [])

  const signup = useCallback(async (email, password, fullName, companyName) => {
    const r = await authSignup({
      email,
      password,
      full_name:    fullName,
      company_name: companyName,
    })
    localStorage.setItem('access_token', r.data.access_token)
    setUser(r.data.user)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    setUser(null)
  }, [])

  const getUser = useCallback(() => user, [user])

  const refreshUser = useCallback(async () => {
    const r = await getMe()
    setUser(r.data)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        signup,
        getUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
