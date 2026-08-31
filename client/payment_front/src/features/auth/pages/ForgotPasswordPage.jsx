import { useState } from 'react'
import { Link } from 'react-router-dom'
import Input from '../../../shared/components/ui/Input.jsx'
import Button from '../../../shared/components/ui/Button.jsx'
import { forgotPassword } from '../../../shared/utils/authApi.js'
import Card from '../../../shared/components/ui/Card.jsx'

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const newErrors = {}
    if (!email) newErrors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email is invalid'
    return newErrors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setApiError('')
    const validationErrors = validate()
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setLoading(true)
    try {
      await forgotPassword(email)
      setSuccess(true)
    } catch (err) {
      setApiError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-secondary mb-2">Check your email</h1>
          <p className="text-slate-600 mb-6">
            If an account with that email exists, we have sent a password reset OTP.
          </p>
          <Link to="/reset-password">
            <Button className="w-full">Enter OTP</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-secondary">Forgot password?</h1>
          <p className="text-slate-600 mt-1">Enter your email and we'll send you an OTP to reset your password.</p>
        </div>

        {apiError && (
          <div className="mb-4 p-3 bg-red-50 text-danger text-sm rounded-lg">{apiError}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            required
          />
          <Button type="submit" className="w-full" loading={loading}>
            Send OTP
          </Button>
        </form>

        <p className="text-center text-sm text-slate-600 mt-4">
          Remember your password?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  )
}

export default ForgotPasswordPage
