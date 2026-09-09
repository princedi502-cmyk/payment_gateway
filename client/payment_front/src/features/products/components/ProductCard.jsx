import { memo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Star, ShoppingCart, Eye, Heart, Check } from 'lucide-react'
import Badge from '../../../shared/components/ui/Badge.jsx'
import Button from '../../../shared/components/ui/Button.jsx'
import { useCart } from '../../../shared/context/CartContext.jsx'
import { useAuth } from '../../../shared/context'
import { useWishlist } from '../../../features/wishlist/context/WishlistContext.jsx'
import noImage from '../../../assets/no-image.svg'

function getStarElement(star, rating) {
  const isFull = star <= rating
  const isHalf = star === Math.ceil(rating) && rating % 1 === 0.5

  if (isFull) {
    return <Star key={star} className="w-3.5 h-3.5 fill-accent text-accent" />
  }
  if (isHalf) {
    return (
      <div key={star} className="relative w-3.5 h-3.5">
        <Star className="w-3.5 h-3.5 fill-slate-200 text-slate-200" />
        <Star
          className="absolute inset-0 w-3.5 h-3.5 fill-accent text-accent"
          style={{ clipPath: 'inset(0 50% 0 0)' }}
        />
      </div>
    )
  }
  return <Star key={star} className="w-3.5 h-3.5 fill-slate-200 text-slate-200" />
}

function ProductCard({ product, showWishlistButton = true }) {
  const { addItem } = useCart()
  const { isAuthenticated } = useAuth()
  const { toggleWishlist, isInWishlist } = useWishlist()
  const navigate = useNavigate()
  const inWishlist = isInWishlist(product._id)
  const [isAdding, setIsAdding] = useState(false)

  const handleWishlistClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    toggleWishlist(product)
  }

  const handleAddToCart = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsAdding(true)
    addItem(product)
    setTimeout(() => setIsAdding(false), 1000)
  }

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null

  return (
    <Link
      to={`/product/${product._id}`}
      className="group block bg-surface rounded-2xl border border-border overflow-hidden hover:shadow-xl hover:border-primary/20 transition-all duration-300 hover:-translate-y-1"
    >
      {/* Image Container */}
      <div className="relative overflow-hidden bg-background-alt aspect-4/3">
        <img
          src={product.image || noImage}
          alt={product.title}
          width={400}
          height={300}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          onError={(e) => {
            e.currentTarget.onerror = null
            e.currentTarget.src = noImage
          }}
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          <Badge variant="primary" size="sm">
            {product.category}
          </Badge>
          {discount && (
            <Badge variant="danger" size="sm">
              -{discount}%
            </Badge>
          )}
        </div>

        {/* Wishlist Button */}
        {showWishlistButton && (
          <button
            onClick={handleWishlistClick}
            className={`
              absolute top-3 right-3 p-2.5 rounded-xl shadow-sm border transition-all duration-300
              ${inWishlist
                ? 'bg-danger text-white border-danger'
                : 'bg-white/90 backdrop-blur-sm text-text-muted hover:text-danger border-border hover:border-danger/30'
              }
            `}
            aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart className={`w-4 h-4 ${inWishlist ? 'fill-current' : ''}`} />
          </button>
        )}

        {/* Quick Actions Overlay */}
        <div className="absolute inset-x-0 bottom-0 p-4 bg-linear-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              onClick={handleAddToCart}
              disabled={isAdding}
            >
              {isAdding ? (
                <>
                  <Check className="w-4 h-4" />
                  Added!
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  Add to Cart
                </>
              )}
            </Button>
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                navigate(`/product/${product._id}`)
              }}
              className="p-2.5 bg-white rounded-xl text-text-secondary hover:text-primary hover:bg-primary-50 transition-colors"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Rating */}
        <div className="flex items-center gap-1.5 mb-2">
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((star) => getStarElement(star, product.rating || 0))}
          </div>
          <span className="text-xs font-medium text-text-secondary">
            {(product.rating || 0).toFixed(1)}
          </span>
          <span className="text-xs text-text-muted">
            ({product.reviews || 0})
          </span>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-text-primary mb-1.5 line-clamp-1 group-hover:text-primary transition-colors">
          {product.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-text-muted mb-3 line-clamp-2 leading-relaxed">
          {product.description}
        </p>

        {/* Price */}
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary">
            ${product.price.toFixed(2)}
          </span>
          {product.originalPrice && (
            <span className="text-sm text-text-muted line-through">
              ${product.originalPrice.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

export default memo(ProductCard)
