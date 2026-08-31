import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Header from './shared/components/layout/Header.jsx'
import Footer from './shared/components/layout/Footer.jsx'
import ProtectedRoute from './shared/components/auth/ProtectedRoute.jsx'
import ErrorBoundary from './shared/components/ui/ErrorBoundary.jsx'

const Home = lazy(() => import('./features/products/pages/Home.jsx'))
const ProductDetailsPage = lazy(() => import('./features/products/pages/ProductDetailsPage.jsx'))
const CartPage = lazy(() => import('./features/cart/pages/CartPage.jsx'))
const CheckoutPage = lazy(() => import('./features/checkout/pages/CheckoutPage.jsx'))
const PaymentSuccessPage = lazy(() => import('./features/checkout/pages/PaymentSuccessPage.jsx'))
const LoginPage = lazy(() => import('./features/auth/pages/LoginPage.jsx'))
const RegisterPage = lazy(() => import('./features/auth/pages/RegisterPage.jsx'))
const CheckEmailPage = lazy(() => import('./features/auth/pages/CheckEmailPage.jsx'))
const VerifyEmailPage = lazy(() => import('./features/auth/pages/VerifyEmailPage.jsx'))
const ForgotPasswordPage = lazy(() => import('./features/auth/pages/ForgotPasswordPage.jsx'))
const ResetPasswordPage = lazy(() => import('./features/auth/pages/ResetPasswordPage.jsx'))
const OAuthCallbackPage = lazy(() => import('./features/auth/pages/OAuthCallbackPage.jsx'))
const DashboardPage = lazy(() => import('./features/dashboard/pages/DashboardPage.jsx'))
const OrdersPage = lazy(() => import('./features/dashboard/pages/OrdersPage.jsx'))
const OrderDetailPage = lazy(() => import('./features/dashboard/pages/OrderDetailPage.jsx'))
const ProfilePage = lazy(() => import('./features/dashboard/pages/ProfilePage.jsx'))
const WishlistPage = lazy(() => import('./features/wishlist/pages/WishlistPage.jsx'))

function LoadingSpinner() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
    </div>
  )
}

function NotFoundPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-slate-300 mb-4">404</h1>
        <p className="text-slate-600 mb-6">Page not found</p>
        <a href="/" className="text-primary hover:underline">Go home</a>
      </div>
    </div>
  )
}

function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <ErrorBoundary>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/product/:id" element={<ProductDetailsPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
              <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccessPage /></ProtectedRoute>} />

              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/check-email" element={<CheckEmailPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/auth/callback" element={<OAuthCallbackPage />} />

              <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/dashboard/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
              <Route path="/dashboard/orders/:id" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
              <Route path="/dashboard/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/wishlist" element={<ProtectedRoute><WishlistPage /></ProtectedRoute>} />

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  )
}

export default App
