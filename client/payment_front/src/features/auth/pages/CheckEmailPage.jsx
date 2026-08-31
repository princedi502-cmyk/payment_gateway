import { Link } from 'react-router-dom'
import Button from '../../../shared/components/ui/Button.jsx'
import Card from '../../../shared/components/ui/Card.jsx'

function CheckEmailPage() {
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
          We sent a verification link to your email. Please check your inbox and click the link to activate your account.
        </p>
        <div className="flex flex-col gap-3">
          <Link to="/login">
            <Button variant="outline" className="w-full">Go to Login</Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}

export default CheckEmailPage
