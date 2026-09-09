import { Link } from 'react-router-dom'
import { Package, User, ArrowRight, ShoppingBag, Heart, Clock, CreditCard, TrendingUp, ChevronRight } from 'lucide-react'
import Button from '../../../shared/components/ui/Button.jsx'
import Avatar from '../../../shared/components/ui/Avatar.jsx'
import { useAuth } from '../../../shared/context'
import { useOrders } from '../context/OrdersContext.jsx'

function DashboardPage() {
  const { user } = useAuth()
  const { recentOrders, loading, userStats, statsLoading } = useOrders()
  const recentOrdersList = recentOrders || []

  const statusColorMap = {
    paid: 'bg-success/10 text-success',
    pending: 'bg-accent/10 text-accent-dark',
    failed: 'bg-danger/10 text-danger',
    refunded: 'bg-slate-100 text-slate-700',
    canceled: 'bg-slate-100 text-slate-700',
  }

  const quickActions = [
    {
      label: 'Continue Shopping',
      description: 'Browse our latest products',
      icon: ShoppingBag,
      href: '/',
      color: 'bg-primary/10 text-primary',
    },
    {
      label: 'My Orders',
      description: 'Track your purchases',
      icon: Package,
      href: '/dashboard/orders',
      color: 'bg-success/10 text-success',
    },
    {
      label: 'Wishlist',
      description: 'Your saved items',
      icon: Heart,
      href: '/wishlist',
      color: 'bg-danger/10 text-danger',
    },
    {
      label: 'Profile Settings',
      description: 'Manage your account',
      icon: User,
      href: '/dashboard/profile',
      color: 'bg-accent/10 text-accent-dark',
    },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary to-primary-dark rounded-2xl p-6 sm:p-8 mb-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Avatar name={user?.name} size="xl" className="bg-white/20" />
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">
              Welcome back, {user?.name?.split(' ')[0] || 'User'}!
            </h1>
            <p className="text-white/80">
              Manage your orders, track shipments, and update your profile.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            to={action.href}
            className="group bg-surface rounded-2xl border border-border p-4 sm:p-5 hover:shadow-lg hover:border-primary/20 transition-all duration-300 hover:-translate-y-1"
          >
            <div className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <action.icon className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-text-primary mb-1">{action.label}</h3>
            <p className="text-sm text-text-muted hidden sm:block">{action.description}</p>
          </Link>
        ))}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-surface rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-text-muted">Total Orders</span>
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
          </div>
          <p className="text-2xl font-bold text-text-primary">
            {statsLoading ? '...' : userStats.totalPaidOrders || 0}
          </p>
          <p className="text-xs text-text-muted mt-1">
            <TrendingUp className="w-3 h-3 inline text-success" /> Paid orders
          </p>
        </div>
        <div className="bg-surface rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-text-muted">Total Spent</span>
            <div className="w-10 h-10 bg-success/10 rounded-xl flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-success" />
            </div>
          </div>
          <p className="text-2xl font-bold text-text-primary">
            ${statsLoading ? '...' : (userStats.totalPaidSpent || 0).toFixed(2)}
          </p>
          <p className="text-xs text-text-muted mt-1">Lifetime purchases</p>
        </div>
        <div className="bg-surface rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-text-muted">Member Since</span>
            <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-accent" />
            </div>
          </div>
          <p className="text-2xl font-bold text-text-primary">
            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
          </p>
          <p className="text-xs text-text-muted mt-1">Account created</p>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-surface rounded-2xl border border-border">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-text-primary">Recent Orders</h2>
            <p className="text-sm text-text-muted mt-1">Your latest purchase activity</p>
          </div>
          <Link to="/dashboard/orders">
            <Button variant="ghost" size="sm" icon={ArrowRight} iconPosition="right">
              View All
            </Button>
          </Link>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-center gap-4">
                  <div className="w-12 h-12 bg-background-alt rounded-xl" />
                  <div className="flex-1">
                    <div className="h-4 bg-background-alt rounded w-32 mb-2" />
                    <div className="h-3 bg-background-alt rounded w-48" />
                  </div>
                  <div className="h-6 bg-background-alt rounded-full w-16" />
                </div>
              ))}
            </div>
          ) : recentOrdersList.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-background-alt rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-8 h-8 text-text-muted" />
              </div>
              <h3 className="font-semibold text-text-primary mb-2">No orders yet</h3>
              <p className="text-text-muted mb-4">Start shopping to see your orders here</p>
              <Link to="/">
                <Button variant="primary" size="sm">
                  Start Shopping
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrdersList.slice(0, 5).map((order) => (
                <Link
                  key={order._id}
                  to={`/dashboard/orders/${order._id}`}
                  className="flex items-center justify-between p-4 rounded-xl hover:bg-background-alt transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-text-primary group-hover:text-primary transition-colors">
                        Order #{order.orderNumber}
                      </p>
                      <p className="text-sm text-text-muted">
                        {new Date(order.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                        {' '}&middot;{' '}
                        {order.items?.length || 0} item(s)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="font-semibold text-text-primary">${order.total?.toFixed(2)}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColorMap[order.status] || 'bg-slate-100 text-slate-700'}`}>
                      {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                    </span>
                    <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
