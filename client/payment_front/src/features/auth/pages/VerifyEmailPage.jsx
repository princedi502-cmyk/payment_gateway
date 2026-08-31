import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import Button from '../../../shared/components/ui/Button.jsx'
import Card from '../../../shared/components/ui/Card.jsx'
import { verifyEmail } from '../../../shared/utils/authApi.js'

function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState(() =>
    token ? 'loading' : 'error'
  )

  const [message, setMessage] = useState(() =>
    token
      ? ''
      : 'Missing verification token. Please use the link from your email.'
  )

  useEffect(() => {
    if (!token) return

    let cancelled = false

    const verifyToken = async () => {
      try {
        const response = await verifyEmail(token)

        if (cancelled) return

        const isVerified = response?.data?.isVerified === true

        setStatus(isVerified ? 'success' : 'error')
        setMessage(response?.message || 'Email verified successfully!')
      } catch (err) {
        if (cancelled) return

        setStatus('error')
        setMessage(err.message || 'Verification failed')
      }
    }

    verifyToken()

    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md text-center">
        {status === 'loading' && (
          <div>
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600">Verifying your email...</p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-secondary mb-2">Email verified!</h1>
            <p className="text-slate-600 mb-6">{message}</p>
            <Link to="/login">
              <Button className="w-full">Continue to Login</Button>
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-secondary mb-2">Verification failed</h1>
            <p className="text-slate-600 mb-6">{message}</p>
            <div className="flex flex-col gap-3">
              <Link to="/register">
                <Button variant="outline" className="w-full">Create new account</Button>
              </Link>
              <p className="text-sm text-slate-500">
                Tip: If you clicked the button in the email and ended up here, try opening the link in a new tab or copy-pasting the URL from the email into your browser.
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

export default VerifyEmailPage
