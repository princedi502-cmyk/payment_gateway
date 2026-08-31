import { Link } from 'react-router-dom'
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react'
import Button from '../../../shared/components/ui/Button.jsx'
import { useCart } from '../../../shared/context/CartContext.jsx'
import noImage from '../../../assets/no-image.svg'

function CartPage() {
  const { items, removeItem, updateQuantity, totalPrice, totalItems } = useCart()

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <ShoppingBag className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Your cart is empty</h2>
        <p className="text-slate-500 mb-8">Looks like you haven't added any products yet.</p>
        <Link to="/">
          <Button variant="primary" size="lg">
            Continue Shopping
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item._id}
              className="bg-white rounded-xl border border-slate-200 p-4 flex gap-4"
            >
              <img
                src={item.image || noImage}
                alt={item.title}
                className="w-24 h-24 object-cover rounded-lg bg-slate-100"
                onError={(e) => {
                  e.currentTarget.onerror = null
                  e.currentTarget.src = noImage
                }}
              />
              <div className="flex-1 min-w-0">
                <Link to={`/product/${item._id}`}>
                  <h3 className="font-semibold text-slate-900 hover:text-primary transition-colors line-clamp-1">
                    {item.title}
                  </h3>
                </Link>
                <p className="text-sm text-slate-500 mt-1">{item.category}</p>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item._id, item.quantity - 1)}
                      className="p-1 rounded-md hover:bg-slate-100 transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-4 h-4 text-slate-600" />
                    </button>
                    <span className="w-8 text-center font-medium text-slate-900">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item._id, item.quantity + 1)}
                      className="p-1 rounded-md hover:bg-slate-100 transition-colors"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                  <span className="font-semibold text-primary">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => removeItem(item._id)}
                className="p-2 text-slate-400 hover:text-danger transition-colors self-start"
                aria-label="Remove item"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 p-6 sticky top-24">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Order Summary</h3>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-slate-600">
                <span>Items ({totalItems})</span>
                <span>${totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Shipping</span>
                <span className="text-success">Free</span>
              </div>
              <div className="border-t border-slate-200 pt-3 flex justify-between text-lg font-bold text-slate-900">
                <span>Total</span>
                <span>${totalPrice.toFixed(2)}</span>
              </div>
            </div>
            <Link to="/checkout">
              <Button variant="primary" size="lg" className="w-full">
                Proceed to Checkout
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link
              to="/"
              className="block text-center text-sm text-slate-500 hover:text-primary mt-4 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CartPage
