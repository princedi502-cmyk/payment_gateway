import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Package } from 'lucide-react'
import Button from '../../../shared/components/ui/Button.jsx'
import Card from '../../../shared/components/ui/Card.jsx'
import { getOrderById } from '../../../shared/utils/api.js'

function OrderDetailPage() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await getOrderById(id)
        setOrder(data)
      } catch {
        setOrder(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const statusColorMap = {
    paid: 'text-success',
    pending: 'text-amber-600',
    failed: 'text-red-600',
    refunded: 'text-slate-600',
    canceled: 'text-slate-600',
  }

  const statusLabelMap = {
    paid: 'Paid',
    pending: 'Pending Payment',
    failed: 'Payment Failed',
    refunded: 'Refunded',
    canceled: 'Canceled',
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="text-slate-600">Loading order...</div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <Card>
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-secondary mb-2">Order Not Found</h1>
          <p className="text-slate-500 mb-6">We could not find this order.</p>
          <Link to="/dashboard/orders">
            <Button>Back to Orders</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-6">
        <Link to="/dashboard/orders" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-primary">
          <ArrowLeft className="w-4 h-4" />
          Back to Orders
        </Link>
      </div>

      <Card className="p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-secondary">Order #{order.orderNumber}</h1>
            <p className="text-sm text-slate-500">
              {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
          <span className={`text-sm font-medium ${statusColorMap[order.status] || 'text-slate-600'}`}>
            {statusLabelMap[order.status] || order.status}
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-secondary mb-2">Items</h3>
            {order.items?.length > 0 ? (
              <ul className="space-y-2">
                {order.items.map((item, idx) => (
                  <li key={idx} className="flex justify-between text-sm text-slate-700 border-b border-slate-100 pb-2 last:border-0">
                    <span>{item.title} × {item.quantity}</span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No items</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Subtotal</p>
              <p className="font-medium text-secondary">${order.subtotal?.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-slate-500">Tax</p>
              <p className="font-medium text-secondary">${order.tax?.toFixed(2)}</p>
            </div>
            <div className="col-span-2">
              <p className="text-slate-500">Total</p>
              <p className="font-semibold text-secondary text-lg">${order.total?.toFixed(2)}</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-secondary mb-2">Shipping Address</h3>
            {order.shippingAddress ? (
              <p className="text-sm text-slate-700">
                {order.shippingAddress.fullName}<br />
                {order.shippingAddress.address}<br />
                {order.shippingAddress.city}, {order.shippingAddress.zipCode}
              </p>
            ) : (
              <p className="text-sm text-slate-500">No shipping address</p>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

export default OrderDetailPage
