import { useState, useEffect, useMemo, useCallback } from 'react'
import { AuthContext } from './AuthContext.js'
import { loginUser, registerUser, getCurrentUser } from '../utils/api.js'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('token')
      if (savedToken) {
        try {
          const response = await getCurrentUser()
          setUser(response.data)
        } catch {
          localStorage.removeItem('token')
          setToken(null)
        }
      }
      setIsLoading(false)
    }
    initAuth()
  }, [])

  useEffect(() => {
    if (!user?._id || !user?.isVerified) return

    let cancelled = false
    const userId = user._id.toString()

    const waitForOneSignal = (timeoutMs = 30000) => {
      return new Promise((resolve) => {
        let attempts = 0
        const maxAttempts = timeoutMs / 500

        const check = () => {
          if (window.OneSignal && typeof window.OneSignal.init === 'function') {
            resolve(window.OneSignal)
          } else if (attempts >= maxAttempts) {
            resolve(null)
          } else {
            attempts++
            setTimeout(check, 500)
          }
        }
        check()
      })
    }

    const registerUserWithOneSignal = async () => {
      const OneSignal = await waitForOneSignal()
      if (!OneSignal || cancelled) return

      window.OneSignalDeferred = window.OneSignalDeferred || []
      window.OneSignalDeferred.push(async function (OS) {
        if (cancelled) return
        try {
          await OS.login(userId)
          console.log('[OneSignal] User registered:', userId)
        } catch (err) {
          console.error('[OneSignal] login failed:', err)
        }
      })
    }

    registerUserWithOneSignal()
    return () => { cancelled = true }
  }, [user?._id, user?.isVerified])

  const login = useCallback(async (credentials) => {
    const response = await loginUser(credentials)
    const { token: newToken, ...userData } = response.data
    localStorage.setItem('token', newToken)
    setToken(newToken)
    setUser(userData)
    return response
  }, [])

  const register = useCallback(async (data) => {
    const response = await registerUser(data)
    return response
  }, [])

  const logout = useCallback(() => {
    window.OneSignalDeferred = window.OneSignalDeferred || []

    window.OneSignalDeferred.push(async function (OneSignal) {
      try {
        await OneSignal.logout()
      } catch (err) {
        console.error('[OneSignal] logout failed:', err)
      }
    })

    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }, [])

  const updateUser = useCallback((updater) => {
    setUser(updater)
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      setToken,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      updateUser,
    }),
    [user, token, isLoading, login, register, logout, updateUser, setToken]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
