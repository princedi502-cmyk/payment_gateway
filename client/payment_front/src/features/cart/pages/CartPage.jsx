import { Link } from 'react-router-dom'
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Shield, Truck, Tag } from 'lucide-react'
import Button from '../../../shared/components/ui/Button.jsx'
import { useCart } from '../../../shared/context/CartContext.jsx'
import noImage from '../../../assets/no-image.svg'
import { useState } from 'react'

function CartPage() {
  const { items, removeItem, updateQuantity, totalPrice, totalItems } = useCart()
  const [promoCode, setPromoCode] = useState('')
  const [promoApplied, setPromoApplied] = useState(false)

  const handleApplyPromo = (e) => {
    e.preventDefault()
    if (promoCode) {
      setPromoApplied(true)
    }
  }

  const shipping = totalPrice >= 50 ? 0 : 9.99
  const discount = promoApplied ? totalPrice * 0.1 : 0
  const total = totalPrice + shipping - discount

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-md mx-auto">
          <div className="w-24 h-24 bg-background-alt rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-12 h-12 text-text-muted" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-3">Your cart is empty</h2>
          <p className="text-text-muted mb-8">
            Looks like you haven't added any products yet. Start exploring our collection!
          </p>
          <Link to="/">
            <Button variant="primary" size="lg" icon={ArrowRight} iconPosition="right">
              Start Shopping
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Shopping Cart</h1>
        <p className="text-text-muted">
          {totalItems} {totalItems === 1 ? 'item' : 'items'} in your cart
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item._id}
              className="bg-surface rounded-2xl border border-border p-4 sm:p-6 flex gap-4 sm:gap-6 hover:shadow-md transition-shadow"
            >
              {/* Product Image */}
              <Link to={`/product/${item._id}`} className="flex-shrink-0">
                <img
                  src={item.image || noImage}
                  alt={item.title}
                  className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-xl bg-background-alt"
                  onError={(e) => {
                    e.currentTarget.onerror = null
                    e.currentTarget.src = noImage
                  }}
                />
              </Link>

              {/* Product Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Link
                      to={`/product/${item._id}`}
                      className="font-semibold text-text-primary hover:text-primary transition-colors line-clamp-1 text-lg"
                    >
                      {item.title}
                    </Link>
                    <p className="text-sm text-text-muted mt-1">{item.category}</p>
                  </div>
                  <button
                    onClick={() => removeItem(item._id)}
                    className="p-2 text-text-muted hover:text-danger hover:bg-danger/10 rounded-xl transition-all flex-shrink-0"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-end justify-between mt-4">
                  {/* Quantity Controls */}
                  <div className="flex items-center gap-1 bg-background-alt rounded-xl p-1">
                    <button
                      onClick={() => updateQuantity(item._id, item.quantity - 1)}
                      className="p-2 rounded-lg hover:bg-surface text-text-secondary hover:text-primary transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center font-semibold text-text-primary">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item._id, item.quantity + 1)}
                      className="p-2 rounded-lg hover:bg-surface text-text-secondary hover:text-primary transition-colors"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                    {item.quantity > 1 && (
                      <p className="text-xs text-text-muted">
                        ${item.price.toFixed(2)} each
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-surface rounded-2xl border border-border p-6 sticky top-24">
            <h3 className="text-lg font-semibold text-text-primary mb-6">Order Summary</h3>

            {/* Promo Code */}
            <form onSubmit={handleApplyPromo} className="mb-6">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Promo code"
                    disabled={promoApplied}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-text-primary placeholder-text-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
                  />
                </div>
                {promoApplied ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPromoApplied(false)
                      setPromoCode('')
                    }}
                    className="px-4 py-2.5 rounded-xl bg-success/10 text-success text-sm font-medium"
                  >
                    Applied!
                  </button>
                ) : (
                  <Button type="submit" variant="secondary" size="md">
                    Apply
                  </Button>
                )}
              </div>
            </form>

            {/* Summary Details */}
            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-text-secondary">
                <span>Subtotal ({totalItems} items)</span>
                <span className="font-medium text-text-primary">${totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Shipping</span>
                <span className={`font-medium ${shipping === 0 ? 'text-success' : 'text-text-primary'}`}>
                  {shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}
                </span>
              </div>
              {promoApplied && (
                <div className="flex justify-between text-success">
                  <span>Discount (10%)</span>
                  <span className="font-medium">-${discount.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-border pt-4 flex justify-between">
                <span className="text-lg font-semibold text-text-primary">Total</span>
                <span className="text-xl font-bold text-primary">${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Free Shipping Progress */}
            {shipping > 0 && (
              <div className="mb-6 p-4 bg-accent/10 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="w-4 h-4 text-accent" />
                  <span className="text-sm font-medium text-text-secondary">
                    Add ${(50 - totalPrice).toFixed(2)} more for free shipping!
                  </span>
                </div>
                <div className="h-2 bg-accent/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${Math.min((totalPrice / 50) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Checkout Button */}
            <Link to="/checkout">
              <Button variant="primary" size="lg" fullWidth icon={ArrowRight} iconPosition="right">
                Proceed to Checkout
              </Button>
            </Link>

            <Link
              to="/"
              className="block text-center text-sm text-text-muted hover:text-primary mt-4 transition-colors"
            >
              Continue Shopping
            </Link>

            {/* Trust Badges */}
            <div className="mt-6 pt-6 border-t border-border">
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <Shield className="w-4 h-4 text-success" />
                <span>Secure checkout powered by Stripe</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CartPage
