import { useRef, useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Package } from 'lucide-react'
import Button from '../../../shared/components/ui/Button.jsx'
import Card from '../../../shared/components/ui/Card.jsx'
import { getOrders } from '../../../shared/utils/authApi.js'
import { useOrders } from '../context/OrdersContext.jsx'

const LIMIT = 10

function OrdersPage() {
  const { orders, pagination: ctxPagination, loading: ctxLoading, appendPage } = useOrders()

  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)
  const sentinelRef = useRef(null)

  const total = ctxPagination?.total ?? 0
  const hasMore = total > (orders?.length ?? 0)
  const nextPage = Math.floor((orders?.length ?? 0) / LIMIT) + 1

  const loadMore = useCallback(async () => {
    if (nextPage <= 1 || ctxLoading) return
    setLoadingMore(true)
    setError(false)
    try {
      const response = await getOrders(nextPage, LIMIT)
      const data = response?.data || []
      appendPage(data)
    } catch {
      setError(true)
    } finally {
      setLoadingMore(false)
    }
  }, [nextPage, ctxLoading, appendPage])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || ctxLoading || loadingMore || !hasMore || error) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore()
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [ctxLoading, loadingMore, hasMore, error, loadMore])

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
        <h1 className="text-3xl font-bold text-secondary">Orders</h1>
        <p className="text-slate-600 mt-1">View your order history and status.</p>
      </div>

      {ctxLoading ? (
        <Card>
          <p className="text-slate-600">Loading orders...</p>
        </Card>
      ) : orders.length === 0 ? (
        <Card>
          <div className="text-center py-10">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 mb-4">No orders yet.</p>
            <Link to="/">
              <Button>Start Shopping</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
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

      {loadingMore && (
        <p className="text-center text-slate-500 text-sm mt-6">Loading more orders...</p>
      )}

      {!hasMore && orders.length > 0 && (
        <p className="text-center text-slate-400 text-sm mt-6">No more orders</p>
      )}

      {error && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <p className="text-red-600 text-sm">Failed to load more orders.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadMore()}
          >
            Retry
          </Button>
        </div>
      )}

      {hasMore && !error && <div ref={sentinelRef} className="h-px w-full" />}
    </div>
  )
}

export default OrdersPage
