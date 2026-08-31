import { useState } from 'react'
import { Link } from 'react-router-dom'
import Input from '../../../shared/components/ui/Input.jsx'
import Button from '../../../shared/components/ui/Button.jsx'
import { resetPassword } from '../../../shared/utils/authApi.js'
import Card from '../../../shared/components/ui/Card.jsx'

function ResetPasswordPage() {
  const [formData, setFormData] = useState({
    token: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const newErrors = {}
    if (!formData.token) newErrors.token = 'OTP code is required'
    if (!formData.newPassword) newErrors.newPassword = 'New password is required'
    else if (formData.newPassword.length < 6) newErrors.newPassword = 'Password must be at least 6 characters'
    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }
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
      await resetPassword(formData.token, formData.newPassword)
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
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-secondary mb-2">Password reset!</h1>
          <p className="text-slate-600 mb-6">Your password has been reset successfully.</p>
          <Link to="/login">
            <Button className="w-full">Continue to Login</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-secondary">Reset password</h1>
          <p className="text-slate-600 mt-1">Enter the OTP sent to your email and your new password.</p>
        </div>

        {apiError && (
          <div className="mb-4 p-3 bg-red-50 text-danger text-sm rounded-lg">{apiError}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="OTP Code"
            name="token"
            type="text"
            placeholder="123456"
            value={formData.token}
            onChange={(e) => setFormData({ ...formData, token: e.target.value })}
            error={errors.token}
            required
          />
          <Input
            label="New Password"
            name="newPassword"
            type="password"
            placeholder="••••••••"
            value={formData.newPassword}
            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
            error={errors.newPassword}
            required
          />
          <Input
            label="Confirm New Password"
            name="confirmPassword"
            type="password"
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            error={errors.confirmPassword}
            required
          />
          <Button type="submit" className="w-full" loading={loading}>
            Reset Password
          </Button>
        </form>
      </Card>
    </div>
  )
}

export default ResetPasswordPage
