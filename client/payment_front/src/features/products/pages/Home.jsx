import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { fetchProducts } from '../../../shared/utils/api.js'
import { useCachedFetch } from '../../../shared/hooks/useCachedFetch.js'
import { useAuth } from '../../../shared/context'
import ProductGrid from '../components/ProductGrid.jsx'
import Button from '../../../shared/components/ui/Button.jsx'
import SEO from '../../../shared/components/seo/SEO.jsx'
import { ArrowRight, Shield, Truck, Clock, CreditCard, Sparkles, Star, ShoppingBag } from 'lucide-react'

function Home() {
  const fetchAllProducts = useCallback(() => fetchProducts(), [])
  const { data: products = [], loading, error } = useCachedFetch(
    'products',
    fetchAllProducts
  )
  const { isAuthenticated } = useAuth()

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    )
  }

  const featuredProducts = Array.isArray(products) ? products.slice(0, 8) : []

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="bg-danger/10 rounded-2xl p-8 max-w-md mx-auto">
          <p className="text-danger text-lg font-medium mb-2">Unable to load products</p>
          <p className="text-text-muted">Make sure the backend server is running on localhost:5000</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <SEO
        title="Home"
        description="Discover our curated collection of products with secure Stripe-powered checkout. Built with React, Node.js, and modern web technologies."
        url="/"
      />
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary-dark to-slate-900">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-light/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-white/90">Practice Payment Integration</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Seamless Payments,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent-light">
                Beautiful Experience
              </span>
            </h1>

            <p className="text-lg text-white/80 mb-8 max-w-xl leading-relaxed">
              Discover our curated collection of products with secure Stripe-powered checkout. 
              Built with React, Node.js, and modern web technologies.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link to={isAuthenticated ? '/dashboard' : '/register'}>
                <Button
                  variant="accent"
                  size="lg"
                  icon={ArrowRight}
                  iconPosition="right"
                  className="w-full sm:w-auto"
                >
                  {isAuthenticated ? 'Go to Dashboard' : 'Get Started Free'}
                </Button>
              </Link>
              <Link to="/">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto border-white/30 text-white hover:bg-white/10 hover:text-white"
                >
                  Browse Products
                </Button>
              </Link>
            </div>

            {/* Social Proof */}
            <div className="flex items-center gap-6 mt-10 pt-10 border-t border-white/20">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-light to-primary border-2 border-white/20 flex items-center justify-center text-xs font-medium text-white"
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-sm text-white/70">
                  Trusted by <span className="text-white font-medium">2,000+</span> developers
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="bg-surface border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-text-primary text-sm">Secure Checkout</p>
                <p className="text-xs text-text-muted">256-bit SSL</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center">
                <Truck className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="font-semibold text-text-primary text-sm">Free Shipping</p>
                <p className="text-xs text-text-muted">Orders $50+</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="font-semibold text-text-primary text-sm">24/7 Support</p>
                <p className="text-xs text-text-muted">Always available</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-info/10 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-info" />
              </div>
              <div>
                <p className="font-semibold text-text-primary text-sm">Easy Returns</p>
                <p className="text-xs text-text-muted">30-day policy</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-text-primary mb-2">
              Featured Products
            </h2>
            <p className="text-text-muted">
              Explore our handpicked selection of top-rated items
            </p>
          </div>
          <Link to="/" className="hidden md:block">
            <Button variant="outline" icon={ArrowRight} iconPosition="right">
              View All
            </Button>
          </Link>
        </div>

        <ProductGrid products={featuredProducts} loading={loading} />

        <div className="mt-8 text-center md:hidden">
          <Link to="/">
            <Button variant="outline" icon={ArrowRight} iconPosition="right">
              View All Products
            </Button>
          </Link>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 md:p-12">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />

          <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingBag className="w-6 h-6 text-accent" />
                <span className="text-accent font-medium">
                  {isAuthenticated ? 'Continue Shopping' : 'Start Shopping'}
                </span>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold !text-white mb-3">
                {isAuthenticated
                  ? 'Welcome back! Ready to shop with us?'
                  : 'Ready to Experience Seamless Payments?'}
              </h3>
              <p className="text-slate-400 max-w-lg">
                {isAuthenticated
                  ? 'Browse our collection and checkout securely with Stripe.'
                  : 'Create your free account today and enjoy secure checkout with Stripe. Perfect for learning payment integration.'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              {isAuthenticated ? (
                <Link to="/products">
                  <Button variant="primary" size="lg" icon={ArrowRight} iconPosition="right">
                    Browse Products
                  </Button>
                </Link>
              ) : (
                <Link to="/register">
                  <Button variant="primary" size="lg" icon={ArrowRight} iconPosition="right">
                    Create Free Account
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home
