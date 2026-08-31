import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, User, ArrowRight } from 'lucide-react'
import Button from '../../../shared/components/ui/Button.jsx'
import Card from '../../../shared/components/ui/Card.jsx'
import { useAuth } from '../../../shared/context'
import { getOrders } from '../../../shared/utils/authApi.js'

function DashboardPage() {
  const { user } = useAuth()
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const response = await getOrders(1, 5)
        setRecentOrders(response.data || [])
      } catch {
        setRecentOrders([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const statusColorMap = {
    paid: 'bg-green-100 text-green-700',
    pending: 'bg-amber-100 text-amber-700',
    failed: 'bg-red-100 text-red-700',
    refunded: 'bg-slate-100 text-slate-700',
    canceled: 'bg-slate-100 text-slate-700',
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary">Dashboard</h1>
        <p className="text-slate-600 mt-1">Welcome back, {user?.name || 'User'}!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
            <User className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Profile</p>
            <p className="font-semibold text-secondary">{user?.name || 'User'}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Recent Orders</p>
            <p className="font-semibold text-secondary">{recentOrders.length} shown</p>
          </div>
        </Card>

        <Link to="/checkout">
          <Card className="flex items-center justify-between cursor-pointer hover:border-primary transition-colors">
            <div>
              <p className="text-sm text-slate-500">New Order</p>
              <p className="font-semibold text-secondary">Start checkout</p>
            </div>
            <ArrowRight className="w-5 h-5 text-primary" />
          </Card>
        </Link>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-secondary">Recent Orders</h2>
        <Link to="/dashboard/orders">
          <Button variant="outline" size="sm">View All</Button>
        </Link>
      </div>

      {loading ? (
        <Card>
          <p className="text-slate-600">Loading orders...</p>
        </Card>
      ) : recentOrders.length === 0 ? (
        <Card>
          <p className="text-slate-600 mb-4">No orders yet.</p>
          <Link to="/">
            <Button>Start Shopping</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {recentOrders.map((order) => (
            <Card key={order._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-secondary">Order #{order.orderNumber}</p>
                <p className="text-sm text-slate-500">
                  {new Date(order.createdAt).toLocaleDateString()} · ${order.total?.toFixed(2)}
                </p>
                <p className="text-sm text-slate-500">
                  {order.items?.length || 0} item(s)
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColorMap[order.status] || 'bg-slate-100 text-slate-700'}`}>
                  {order.status?.toUpperCase()}
                </span>
                <Link to={`/dashboard/orders/${order._id}`}>
                  <Button variant="outline" size="sm">Details</Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default DashboardPage
