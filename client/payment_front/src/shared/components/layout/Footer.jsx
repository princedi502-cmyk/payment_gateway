import { Link } from 'react-router-dom'

function Footer() {
  return (
    <footer className="bg-secondary text-slate-300 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
                P
              </div>
              <span className="text-xl font-bold text-white">PaymentHub</span>
            </div>
            <p className="text-sm text-slate-400">
              Practice payment gateway integration with our demo storefront.
            </p>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-3">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-white transition-colors">Products</Link></li>
              <li><Link to="/cart" className="hover:text-white transition-colors">Cart</Link></li>
              <li><Link to="/checkout" className="hover:text-white transition-colors">Checkout</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-3">Practice Area</h3>
            <p className="text-sm text-slate-400">
              Use this project to practice integrating payment gateways like Stripe, Razorpay, or PayPal.
            </p>
          </div>
        </div>
        <div className="border-t border-slate-700 mt-8 pt-6 text-center text-sm text-slate-500">
          Payment Gateway Practice Project. Built with React + Vite.
        </div>
      </div>
    </footer>
  )
}

export default Footer
