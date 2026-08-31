import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle, Loader2 } from 'lucide-react'
import Button from '../../../shared/components/ui/Button.jsx'
import { getOrderById } from '../../../shared/utils/api.js'

function PaymentSuccessPage() {
  const [searchParams] = useSearchParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const fetchedRef = useRef(false)

  const orderId = searchParams.get('orderId')

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    async function load() {
      try {
        if (orderId) {
          const data = await getOrderById(orderId)
          setOrder(data)
        } else {
          setOrder(null)
        }
      } catch {
        setOrder(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [orderId])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Loading Order...</h2>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <CheckCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Order Not Found</h1>
          <p className="text-slate-500 mb-8">
            We could not find your order. Please contact support if you believe this is an error.
          </p>
          <Link to="/">
            <Button variant="primary" size="lg">
              Continue Shopping
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const statusColorMap = {
    paid: 'text-success',
    pending: 'text-amber-600',
    failed: 'text-red-600',
  }

  const statusLabelMap = {
    paid: 'Paid',
    pending: 'Pending Payment',
    failed: 'Payment Failed',
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
      <div className="receipt-print-area bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <CheckCircle className={`w-16 h-16 mx-auto mb-4 ${order.status === 'failed' ? 'text-red-500' : 'text-primary'}`} />
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Order Confirmed</h1>
        <p className="text-slate-500 mb-8">
          Your order has been placed. Payment status will update automatically.
        </p>

        <div className="bg-slate-50 rounded-lg p-6 mb-8 text-left">
          <h3 className="font-semibold text-slate-900 mb-2">Order Details</h3>
          <p className="text-sm text-slate-500 mb-1">Order #: {order.orderNumber}</p>
          <p className="text-sm text-slate-500 mb-1">
            Status: <span className={`${statusColorMap[order.status] || 'text-slate-600 font-medium'}`}>
              {statusLabelMap[order.status] || order.status}
            </span>
          </p>
          {order.paidAt && (
            <p className="text-sm text-slate-500 mb-1">Date: {new Date(order.paidAt).toLocaleString()}</p>
          )}
          {order.total && (
            <p className="text-sm text-slate-500">Total: ${order.total.toFixed(2)}</p>
          )}
          {order.items && order.items.length > 0 && (
            <div className="mt-4 space-y-2">
              {order.items.map((item, idx) => (
                <div key={idx} className="text-sm text-slate-600">
                  {item.title} × {item.quantity} — ${(item.price * item.quantity).toFixed(2)}
                </div>
              ))}
            </div>
          )}
          {order.shippingAddress && (
            <div className="mt-4 text-sm text-slate-500">
              Ship to: {order.shippingAddress.fullName}, {order.shippingAddress.address}, {order.shippingAddress.city}, {order.shippingAddress.zipCode}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link to="/">
          <Button variant="primary" size="lg">
            Continue Shopping
          </Button>
        </Link>
        <Button variant="outline" size="lg" onClick={() => window.print()}>
          Print Receipt
        </Button>
      </div>
    </div>
  )
}

export default PaymentSuccessPage
