import { Link } from 'react-router-dom'
import { ShoppingCart, Menu, X, User, LogOut, ChevronDown, Heart, Package } from 'lucide-react'
import { useCart } from '../../context/CartContext.jsx'
import { useWishlist } from '../../../features/wishlist/context/WishlistContext.jsx'
import { useAuth } from '../../context'
import { useState, useRef, useEffect } from 'react'
import Button from '../ui/Button.jsx'
import Avatar from '../ui/Avatar.jsx'
import Modal from '../ui/Modal.jsx'

function Header() {
  const { totalItems } = useCart()
  const { totalItems: totalWishlistItems } = useWishlist()
  const { user, isAuthenticated, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const profileRef = useRef(null)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [mobileOpen])

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
    <>
      <header
        className={`
          fixed top-0 left-0 right-0 z-50 transition-all duration-300
          ${scrolled
            ? 'bg-white/80 backdrop-blur-lg shadow-sm border-b border-border-light'
            : 'bg-white border-b border-border'
          }
        `}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center text-white font-bold shadow-sm group-hover:shadow-md transition-shadow">
                <Package className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-secondary hidden sm:block">
                Payment<span className="text-primary">Hub</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                to="/"
                className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-primary hover:bg-primary-50 rounded-xl transition-all"
              >
                Products
              </Link>
              {isAuthenticated && (
                <Link
                  to="/wishlist"
                  className="relative px-4 py-2 text-sm font-medium text-text-secondary hover:text-primary hover:bg-primary-50 rounded-xl transition-all"
                >
                  <Heart className="w-5 h-5" />
                  {totalWishlistItems > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-danger text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium animate-bounce-in">
                      {totalWishlistItems}
                    </span>
                  )}
                </Link>
              )}
              <Link
                to="/cart"
                className="relative px-4 py-2 text-sm font-medium text-text-secondary hover:text-primary hover:bg-primary-50 rounded-xl transition-all"
              >
                <ShoppingCart className="w-5 h-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium animate-bounce-in">
                    {totalItems}
                  </span>
                )}
              </Link>
            </nav>

            {/* Desktop Auth */}
            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated ? (
                <div className="flex items-center gap-3" ref={profileRef}>
                  <Link to="/dashboard">
                    <Button variant="ghost" size="sm">
                      Dashboard
                    </Button>
                  </Link>
                  <div className="relative">
                    <button
                      onClick={() => setProfileOpen(!profileOpen)}
                      className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-background-alt transition-colors"
                    >
                      <Avatar name={user?.name} size="sm" />
                      <ChevronDown
                        className={`w-4 h-4 text-text-muted transition-transform ${
                          profileOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {profileOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-surface border border-border rounded-xl shadow-lg py-1 animate-scale-in origin-top-right">
                        <div className="px-4 py-3 border-b border-border">
                          <p className="text-sm font-medium text-text-primary">{user?.name}</p>
                          <p className="text-xs text-text-muted truncate">{user?.email}</p>
                        </div>
                        <Link
                          to="/dashboard/profile"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-background-alt hover:text-primary transition-colors"
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
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-danger/5 hover:text-danger transition-colors w-full text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login">
                    <Button variant="ghost" size="sm">
                      Sign in
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button variant="primary" size="sm">
                      Get Started
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Actions */}
            <div className="md:hidden flex items-center gap-1">
              <Link
                to="/cart"
                className="relative p-2 text-text-secondary hover:text-primary hover:bg-primary-50 rounded-xl transition-all"
              >
                <ShoppingCart className="w-5 h-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                    {totalItems}
                  </span>
                )}
              </Link>
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="p-2 text-text-secondary hover:text-primary hover:bg-primary-50 rounded-xl transition-all"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 w-full max-w-sm bg-surface shadow-xl animate-slide-left">
            <div className="flex flex-col h-full">
              {/* Mobile Menu Header */}
              <div className="flex items-center justify-between px-4 py-4 border-b border-border">
                <span className="text-lg font-semibold text-text-primary">Menu</span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-2 text-text-muted hover:text-text-primary hover:bg-background-alt rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Menu Content */}
              <div className="flex-1 overflow-y-auto py-4">
                {isAuthenticated && (
                  <div className="px-4 pb-4 mb-4 border-b border-border">
                    <div className="flex items-center gap-3">
                      <Avatar name={user?.name} size="lg" />
                      <div>
                        <p className="font-medium text-text-primary">{user?.name}</p>
                        <p className="text-sm text-text-muted">{user?.email}</p>
                      </div>
                    </div>
                  </div>
                )}

                <nav className="space-y-1 px-2">
                  <Link
                    to="/"
                    className="flex items-center gap-3 px-4 py-3 text-text-secondary hover:text-primary hover:bg-primary-50 rounded-xl transition-all"
                    onClick={() => setMobileOpen(false)}
                  >
                    Products
                  </Link>
                  {isAuthenticated && (
                    <>
                      <Link
                        to="/dashboard"
                        className="flex items-center gap-3 px-4 py-3 text-text-secondary hover:text-primary hover:bg-primary-50 rounded-xl transition-all"
                        onClick={() => setMobileOpen(false)}
                      >
                        Dashboard
                      </Link>
                      <Link
                        to="/wishlist"
                        className="flex items-center gap-3 px-4 py-3 text-text-secondary hover:text-primary hover:bg-primary-50 rounded-xl transition-all"
                        onClick={() => setMobileOpen(false)}
                      >
                        Wishlist
                        {totalWishlistItems > 0 && (
                          <span className="ml-auto bg-primary text-white text-xs rounded-full px-2 py-0.5">
                            {totalWishlistItems}
                          </span>
                        )}
                      </Link>
                      <Link
                        to="/dashboard/profile"
                        className="flex items-center gap-3 px-4 py-3 text-text-secondary hover:text-primary hover:bg-primary-50 rounded-xl transition-all"
                        onClick={() => setMobileOpen(false)}
                      >
                        <User className="w-5 h-5" />
                        My Profile
                      </Link>
                    </>
                  )}
                </nav>
              </div>

              {/* Mobile Menu Footer */}
              <div className="px-4 py-4 border-t border-border">
                {isAuthenticated ? (
                  <Button
                    variant="danger"
                    fullWidth
                    onClick={() => {
                      setMobileOpen(false)
                      setConfirmOpen(true)
                    }}
                    icon={LogOut}
                  >
                    Logout
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Link to="/login" onClick={() => setMobileOpen(false)}>
                      <Button variant="outline" fullWidth>
                        Sign in
                      </Button>
                    </Link>
                    <Link to="/register" onClick={() => setMobileOpen(false)}>
                      <Button variant="primary" fullWidth>
                        Get Started
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm Logout"
        size="sm"
      >
        <p className="text-text-secondary mb-6">
          Are you sure you want to log out? You'll need to sign in again to access your account.
        </p>
        <div className="flex gap-3 justify-end">
          <Button
            variant="secondary"
            onClick={() => setConfirmOpen(false)}
            disabled={loggingOut}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleLogout}
            loading={loggingOut}
            icon={LogOut}
          >
            Logout
          </Button>
        </div>
      </Modal>

      {/* Spacer for fixed header */}
      <div className="h-16" />
    </>
  )
}

export default Header
