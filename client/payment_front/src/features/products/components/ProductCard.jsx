import { memo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Star, ShoppingCart, Eye, Heart } from 'lucide-react'
import Badge from '../../../shared/components/ui/Badge.jsx'
import Button from '../../../shared/components/ui/Button.jsx'
import { useCart } from '../../../shared/context/CartContext.jsx'
import { useAuth } from '../../../shared/context'
import { useWishlist } from '../../../features/wishlist/context/WishlistContext.jsx'
import noImage from '../../../assets/no-image.svg'

function ProductCard({ product }) {
  const { addItem } = useCart()
  const { isAuthenticated } = useAuth()
  const { toggleWishlist, isInWishlist } = useWishlist()
  const navigate = useNavigate()
  const inWishlist = isInWishlist(product._id)

  const handleWishlistClick = () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    toggleWishlist(product)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all duration-300 group">
      <div className="relative overflow-hidden bg-slate-100 aspect-4/3">
        <img
          src={product.image || noImage}
          alt={product.title}
          width={400}
          height={300}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.currentTarget.onerror = null
            e.currentTarget.src = noImage
          }}
        />
        <div className="absolute top-2 left-2">
          <Badge variant="primary">{product.category}</Badge>
        </div>
        {isAuthenticated && (
          <button
            onClick={handleWishlistClick}
            className="absolute top-2 right-2 p-2 bg-white/90 hover:bg-white rounded-full shadow-sm border border-slate-200 text-slate-500 hover:text-danger transition-colors z-10"
            aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart className={`w-4 h-4 ${inWishlist ? 'fill-danger text-danger' : ''}`} />
          </button>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-lg text-slate-900 mb-1 line-clamp-1">
          {product.title}
        </h3>
        <p className="text-slate-500 text-sm mb-3 line-clamp-2">
          {product.description}
        </p>

        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span className="text-sm font-medium text-slate-700">{product.rating}</span>
          </div>
          <span className="text-slate-300">|</span>
          <span className="text-sm text-slate-500">{product.reviews} reviews</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-primary">
            ${product.price.toFixed(2)}
          </span>
          <div className="flex gap-2">
            <Link to={`/product/${product._id}`}>
              <Button variant="outline" size="sm" aria-label="View details">
                <Eye className="w-4 h-4" />
              </Button>
            </Link>
            <Button
              variant="primary"
              size="sm"
              onClick={() => addItem(product)}
              aria-label="Add to cart"
            >
              <ShoppingCart className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default memo(ProductCard)
