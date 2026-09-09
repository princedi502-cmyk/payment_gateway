import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { CartProvider } from './shared/context/CartContext.jsx'
import { AuthProvider } from './shared/context'
import { WishlistProvider } from './features/wishlist/context/WishlistContext.jsx'
import { OrdersProvider } from './features/dashboard/context/OrdersContext.jsx'
import { CacheProvider } from './shared/context/CacheContext.jsx'
import { ToastProvider } from './shared/components/ui/Toast.jsx'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <CacheProvider>
          <AuthProvider>
            <ToastProvider>
              <CartProvider>
                <WishlistProvider>
                  <OrdersProvider>
                    <App />
                  </OrdersProvider>
                </WishlistProvider>
              </CartProvider>
            </ToastProvider>
          </AuthProvider>
        </CacheProvider>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
)
