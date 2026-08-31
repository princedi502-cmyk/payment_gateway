import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getCurrentUser } from '../../../shared/utils/authApi.js'
import { useAuth } from '../../../shared/context'

function OAuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState('')
  const timeoutRef = useRef(null)
  const { updateUser, setToken } = useAuth()

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token')
      const errorParam = searchParams.get('error')

      if (errorParam) {
        setError('Google authentication failed. Please try again.')
        timeoutRef.current = setTimeout(() => navigate('/login'), 3000)
        return
      }

      if (token) {
        localStorage.setItem('token', token)
        try {
          const response = await getCurrentUser()
          setToken(token)
          updateUser(response.data)
          navigate('/', { replace: true })
        } catch {
          setError('Failed to load user data. Please try logging in again.')
          timeoutRef.current = setTimeout(() => navigate('/login'), 3000)
        }
      } else {
        navigate('/login')
      }
    }

    handleCallback()
  }, [searchParams, navigate])

  if (error) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">{error}</div>
          <p className="text-slate-600">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-slate-600">Completing authentication...</p>
      </div>
    </div>
  )
}

export default OAuthCallbackPage
