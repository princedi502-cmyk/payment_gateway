import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { useCart } from '../../../shared/context/CartContext.jsx'
import { createCheckoutSession } from '../../../shared/utils/api.js'
import CheckoutForm from '../components/CheckoutForm.jsx'
import CheckoutDetailsForm from '../components/CheckoutDetailsForm.jsx'

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY)

function CheckoutPage() {
  const { items, totalPrice } = useCart()
  const [clientSecret, setClientSecret] = useState('')
  const [orderId, setOrderId] = useState('')

  const handleCreateSession = async (formData) => {
    const address = formData.shippingAddress || {}
    const response = await createCheckoutSession({
      items: items.map((item) => ({
        productId: item._id,
        quantity: item.quantity,
      })),
      shippingAddress: {
        fullName: address.fullName || '',
        email: address.email || '',
        phone: address.phone || '',
        address: address.address || '',
        city: address.city || '',
        state: address.state || '',
        zipCode: address.zipCode || '',
      },
      selectedAddressId: formData.selectedAddressId,
    })

    setClientSecret(response.clientSecret)
    setOrderId(response.orderId)
    return response
  }

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-slate-500">Your cart is empty.</p>
      </div>
    )
  }

  if (!clientSecret) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <RouterLink to="/cart" className="inline-flex items-center text-slate-600 hover:text-primary transition-colors mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Cart
        </RouterLink>
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Checkout</h1>
        <CheckoutDetailsForm onCreateSession={handleCreateSession} />
      </div>
    )
  }

  const options = { clientSecret }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <RouterLink to="/cart" className="inline-flex items-center text-slate-600 hover:text-primary transition-colors mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Cart
      </RouterLink>
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Checkout</h1>

      <Elements stripe={stripePromise} options={options}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <CheckoutForm total={totalPrice} clientSecret={clientSecret} orderId={orderId} />
            </div>
          </div>
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-slate-200 p-6 sticky top-24">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Order Summary</h3>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Shipping</span>
                  <span className="text-success">Free</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tax (estimated)</span>
                  <span>${(totalPrice * 0.08).toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-200 pt-3 flex justify-between text-lg font-bold text-slate-900">
                  <span>Total</span>
                  <span>${(totalPrice * 1.08).toFixed(2)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-success" />
                <p className="text-sm text-slate-600">Secured by Stripe.</p>
              </div>
            </div>
          </div>
        </div>
      </Elements>
    </div>
  )
}

export default CheckoutPage
