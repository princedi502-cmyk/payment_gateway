import { Link } from 'react-router-dom'
import { ShoppingCart, Menu, X, User, LogOut, ChevronDown, Loader2, Heart } from 'lucide-react'
import { useCart } from '../../context/CartContext.jsx'
import { useWishlist } from '../../../features/wishlist/context/WishlistContext.jsx'
import { useAuth } from '../../context'
import { useState, useRef, useEffect } from 'react'
import Button from '../ui/Button.jsx'

function Header() {
  const { totalItems } = useCart()
  const { totalItems: totalWishlistItems } = useWishlist()
  const { user, isAuthenticated, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const profileRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const initial = user?.name?.charAt(0).toUpperCase() || '?'

  const handleLogout = async () => {
    setLoggingOut(true)
    await new Promise((resolve) => setTimeout(resolve, 500))
    logout()
    setLoggingOut(false)
    setConfirmOpen(false)
    setProfileOpen(false)
    setMobileOpen(false)
  }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
              P
            </div>
            <span className="text-xl font-bold text-secondary">PaymentHub</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-slate-600 hover:text-primary transition-colors">
              Products
            </Link>
            {isAuthenticated && (
              <Link to="/wishlist" className="relative text-slate-600 hover:text-primary transition-colors">
                <Heart className="w-5 h-5" />
                {totalWishlistItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {totalWishlistItems}
                  </span>
                )}
              </Link>
            )}
            <Link to="/cart" className="relative text-slate-600 hover:text-primary transition-colors">
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-4" ref={profileRef}>
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm" className="text-slate-600 hover:text-primary">
                    Dashboard
                  </Button>
                </Link>
                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-1 text-slate-600 hover:text-primary transition-colors"
                  >
                    <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {initial}
                    </div>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50">
                      <Link
                        to="/dashboard/profile"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 transition-colors"
                        onClick={() => setProfileOpen(false)}
                      >
                        <User className="w-4 h-4" />
                        My Profile
                      </Link>
                      <button
                        onClick={() => {
                          setProfileOpen(false)
                          setConfirmOpen(true)
                        }}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 transition-colors w-full text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" className="text-slate-600 hover:text-primary transition-colors">
                  Sign in
                </Link>
                <Link to="/register" className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors">
                  Get Started
                </Link>
              </div>
            )}
          </div>

          <div className="md:hidden flex items-center gap-4">
            <Link to="/cart" className="relative text-slate-600 hover:text-primary transition-colors">
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="text-slate-600 hover:text-primary transition-colors"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden py-4 border-t border-slate-200 space-y-3">
            <Link
              to="/"
              className="block py-2 text-slate-600 hover:text-primary transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              Products
            </Link>
            {isAuthenticated && (
              <Link
                to="/dashboard"
                className="block py-2 text-slate-600 hover:text-primary transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                Dashboard
              </Link>
            )}
            {isAuthenticated && (
              <Link
                to="/wishlist"
                className="block py-2 text-slate-600 hover:text-primary transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                Wishlist
              </Link>
            )}
            {isAuthenticated ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 py-2 text-sm text-slate-600">
                  <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {initial}
                  </div>
                  <span>{user?.name || 'User'}</span>
                </div>
                <Link
                  to="/dashboard/profile"
                  className="flex items-center gap-2 py-2 text-slate-600 hover:text-primary transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  <User className="w-4 h-4" />
                  My Profile
                </Link>
                <button
                  onClick={() => {
                    setMobileOpen(false)
                    setConfirmOpen(true)
                  }}
                  className="flex items-center gap-1 py-2 text-slate-600 hover:text-danger transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">Logout</span>
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block py-2 text-slate-600 hover:text-primary transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="block py-2 text-primary font-medium"
                  onClick={() => setMobileOpen(false)}
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-100">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-secondary mb-2">Confirm Logout</h3>
            <p className="text-sm text-slate-500 mb-6">Are you sure you want to log out?</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-primary transition-colors"
                disabled={loggingOut}
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="inline-flex items-center gap-2 px-4 py-2 bg-danger text-white text-sm font-medium rounded-lg hover:bg-danger-dark transition-colors disabled:opacity-50"
              >
                {loggingOut && <Loader2 className="w-4 h-4 animate-spin" />}
                {loggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

export default Header