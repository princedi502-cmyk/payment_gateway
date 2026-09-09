import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { ArrowLeft, ShieldCheck, Lock, CreditCard, Check } from 'lucide-react'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { useCart } from '../../../shared/context/CartContext.jsx'
import { createCheckoutSession } from '../../../shared/utils/api.js'
import CheckoutForm from '../components/CheckoutForm.jsx'
import CheckoutDetailsForm from '../components/CheckoutDetailsForm.jsx'
import Button from '../../../shared/components/ui/Button.jsx'
import noImage from '../../../assets/no-image.svg'

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY)
const STRIPE_MISSING = !STRIPE_PUBLISHABLE_KEY || STRIPE_PUBLISHABLE_KEY === 'pk_test_placeholder'

const steps = [
  { id: 1, label: 'Shipping', icon: CreditCard },
  { id: 2, label: 'Payment', icon: Lock },
  { id: 3, label: 'Confirm', icon: Check },
]

function CheckoutPage() {
  const { items, totalPrice, totalItems } = useCart()
  const [clientSecret, setClientSecret] = useState('')
  const [orderId, setOrderId] = useState('')
  const [currentStep, setCurrentStep] = useState(1)

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

    if (!response?.clientSecret) {
      throw new Error('Payment initialization failed. Please try again.')
    }

    setClientSecret(response.clientSecret)
    setOrderId(response.orderId)
    setCurrentStep(2)
    return response
  }

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-md mx-auto">
          <div className="w-24 h-24 bg-background-alt rounded-full flex items-center justify-center mx-auto mb-6">
            <CreditCard className="w-12 h-12 text-text-muted" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-3">Your cart is empty</h2>
          <p className="text-text-muted mb-8">
            Add some products before proceeding to checkout.
          </p>
          <RouterLink to="/">
            <Button variant="primary" size="lg">
              Browse Products
            </Button>
          </RouterLink>
        </div>
      </div>
    )
  }

  if (STRIPE_MISSING) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-md mx-auto">
          <div className="w-24 h-24 bg-danger/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-12 h-12 text-danger" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-3">Payment Not Configured</h2>
          <p className="text-text-muted mb-4">
            Stripe is not configured for this environment.
          </p>
          <p className="text-sm text-text-muted mb-8">
            Set VITE_STRIPE_PUBLISHABLE_KEY in your .env file.
          </p>
          <RouterLink to="/cart">
            <Button variant="outline" size="lg">
              Back to Cart
            </Button>
          </RouterLink>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <RouterLink
          to="/cart"
          className="inline-flex items-center text-text-muted hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Cart
        </RouterLink>
        <h1 className="text-3xl font-bold text-text-primary">Checkout</h1>
      </div>

      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-center">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all
                    ${currentStep > step.id
                      ? 'bg-success text-white'
                      : currentStep === step.id
                        ? 'bg-primary text-white ring-4 ring-primary/20'
                        : 'bg-background-alt text-text-muted'
                    }
                  `}
                >
                  {currentStep > step.id ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    step.id
                  )}
                </div>
                <span
                  className={`ml-2 font-medium hidden sm:block ${
                    currentStep >= step.id ? 'text-text-primary' : 'text-text-muted'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-12 sm:w-20 h-1 mx-2 sm:mx-4 rounded-full transition-colors ${
                    currentStep > step.id ? 'bg-success' : 'bg-border'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-surface rounded-2xl border border-border p-6">
            {!clientSecret ? (
              <CheckoutDetailsForm onCreateSession={handleCreateSession} />
            ) : (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm total={totalPrice} clientSecret={clientSecret} orderId={orderId} />
              </Elements>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-surface rounded-2xl border border-border p-6 sticky top-24">
            <h3 className="text-lg font-semibold text-text-primary mb-6">Order Summary</h3>

            <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
              {items.map((item) => (
                <div key={item._id} className="flex items-center gap-3">
                  <img
                    src={item.image || noImage}
                    alt={item.title}
                    className="w-14 h-14 rounded-xl object-cover bg-background-alt"
                    onError={(e) => {
                      e.currentTarget.onerror = null
                      e.currentTarget.src = noImage
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary line-clamp-1">
                      {item.title}
                    </p>
                    <p className="text-xs text-text-muted">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-medium text-text-primary">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-3 mb-6 pt-4 border-t border-border">
              <div className="flex justify-between text-text-secondary">
                <span>Subtotal ({totalItems} items)</span>
                <span className="font-medium text-text-primary">${totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Shipping</span>
                <span className="font-medium text-success">Free</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Tax (estimated)</span>
                <span className="font-medium text-text-primary">${(totalPrice * 0.08).toFixed(2)}</span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between">
                <span className="text-lg font-semibold text-text-primary">Total</span>
                <span className="text-xl font-bold text-primary">
                  ${(totalPrice * 1.08).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center gap-3 text-sm text-text-secondary">
                <ShieldCheck className="w-5 h-5 text-success flex-shrink-0" />
                <span>Secure 256-bit SSL encryption</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-text-secondary">
                <Lock className="w-5 h-5 text-success flex-shrink-0" />
                <span>Powered by Stripe</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CheckoutPage
