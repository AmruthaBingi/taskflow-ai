import { useEffect, useState } from 'react'
import { apiRequest, setOnUnauthorized } from '../lib/api'
import { AuthContext } from './authContext'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    apiRequest('/auth/session')
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    setOnUnauthorized(() => setUser(null))
    return () => setOnUnauthorized(null)
  }, [])

  async function login(credentials) {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
    setUser(data.user)
  }

  async function register(details) {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(details),
    })
    setUser(data.user)
  }

  async function logout() {
    await apiRequest('/auth/logout', { method: 'POST' })
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: Boolean(user), login, register, logout, updateUser: setUser }}>
      {children}
    </AuthContext.Provider>
  )
}