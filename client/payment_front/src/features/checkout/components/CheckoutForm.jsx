import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../../shared/components/ui/Button.jsx'
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Lock } from 'lucide-react'
import { verifyPayment } from '../../../shared/utils/api.js'
import { useCart } from '../../../shared/context/CartContext.jsx'

function CheckoutForm({ total, clientSecret, orderId }) {
  const stripe = useStripe()
  const elements = useElements()
  const navigate = useNavigate()
  const { clearCart } = useCart()
  const [processing, setProcessing] = useState(false)
  const [stripeError, setStripeError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!stripe || !elements) return

    setProcessing(true)
    setStripeError('')

    try {
      const { error: submitError } = await elements.submit()
      if (submitError) {
        setStripeError(submitError.message || 'Please check your payment details.')
        setProcessing(false)
        return
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        redirect: 'if_required',
      })

      if (error) {
        setStripeError(error.message || 'Payment failed. Please try again.')
        setProcessing(false)
        return
      }

      if (paymentIntent && paymentIntent.id) {
        await verifyPayment(paymentIntent.id)
        clearCart()
        navigate(`/payment-success?orderId=${orderId}`)
      }
    } catch (err) {
      setStripeError(err.message || 'Payment failed. Please try again.')
      setProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Payment Details</h3>
        <div className="p-4 border border-slate-200 rounded-lg">
          <PaymentElement />
        </div>
        <p className="text-xs text-slate-400 flex items-center gap-1">
          <Lock className="w-3 h-3" />
          Payment information is encrypted and secure.
        </p>
      </div>

      {stripeError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {stripeError}
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        loading={processing}
        disabled={!stripe}
      >
        Pay ${total.toFixed(2)}
      </Button>
    </form>
  )
}

export default CheckoutForm
