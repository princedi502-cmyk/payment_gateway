import { Link } from 'react-router-dom'
import { Heart, Trash2 } from 'lucide-react'
import ProductCard from '../../../features/products/components/ProductCard.jsx'
import { useWishlist } from '../context/WishlistContext.jsx'
import Button from '../../../shared/components/ui/Button.jsx'

function WishlistPage() {
  const { items, loading, removeItem } = useWishlist()

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-secondary mb-8">My Wishlist</h1>

      {items.length === 0 ? (
        <div className="text-center py-20">
          <Heart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-700 mb-2">
            Your wishlist is empty
          </h2>
          <p className="text-slate-500 mb-6">
            Save items you love by clicking the heart icon on products.
          </p>
          <Link to="/">
            <Button variant="primary">Browse Products</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((item) => (
            <div key={item._id} className="relative group">
              <ProductCard product={item.product} />
              <button
                onClick={() => removeItem(item.product._id)}
                className="absolute top-2 right-2 p-2 bg-white/90 hover:bg-white rounded-full shadow-sm border border-slate-200 text-slate-500 hover:text-danger transition-colors z-10"
                aria-label="Remove from wishlist"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default WishlistPage
