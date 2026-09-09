import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Star, ShoppingCart, Truck, Shield } from 'lucide-react'
import Button from '../../../shared/components/ui/Button.jsx'
import Badge from '../../../shared/components/ui/Badge.jsx'
import { useCart } from '../../../shared/context/CartContext.jsx'
import { useAuth } from '../../../shared/context'
import { fetchProductById, canUserReviewProduct } from '../../../shared/utils/api.js'
import { useCachedFetch } from '../../../shared/hooks/useCachedFetch.js'
import ReviewSummary from '../../reviews/components/ReviewSummary.jsx'
import ReviewList from '../../reviews/components/ReviewList.jsx'
import ReviewForm from '../../reviews/components/ReviewForm.jsx'
import noImage from '../../../assets/no-image.svg'

function ProductDetailsPage() {
  const { id } = useParams()
  const [added, setAdded] = useState(false)
  const { addItem } = useCart()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [canReview, setCanReview] = useState(false)
  const [hasReviewed, setHasReviewed] = useState(false)
  const [existingReview, setExistingReview] = useState(null)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchProduct = useCallback(() => fetchProductById(id), [id])
  const { data: product, loading, error } = useCachedFetch(
    `product:${id}`,
    fetchProduct,
    { enabled: !!id }
  )

  const timeoutRef = useRef(null)

  const loadReviewEligibility = useCallback(async () => {
    if (!isAuthenticated || !user || !id) {
      setCanReview(false)
      setHasReviewed(false)
      setExistingReview(null)
      return
    }

    try {
      const result = await canUserReviewProduct(id)
      setCanReview(result.canReview)
      setHasReviewed(result.hasReviewed)
      setExistingReview(result.review || null)
    } catch (error) {
      console.error('Failed to load review eligibility:', error)
    }
  }, [id, isAuthenticated, user])

  const handleAddToCart = useCallback(() => {
    if (product) {
      addItem(product)
      setAdded(true)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setAdded(false), 2000)
    }
  }, [product, addItem])

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }, [])

  useEffect(() => {
    loadReviewEligibility()
  }, [loadReviewEligibility, refreshKey])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/4 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="aspect-square bg-slate-200 rounded-2xl" />
            <div className="space-y-4">
              <div className="h-10 bg-slate-200 rounded w-3/4" />
              <div className="h-6 bg-slate-200 rounded w-1/4" />
              <div className="h-24 bg-slate-200 rounded" />
              <div className="h-12 bg-slate-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-danger text-lg">Error: {error.message}</p>
        <Link to="/">
          <Button variant="primary" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Products
          </Button>
        </Link>
      </div>
    )
  }

  if (!product) return null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        to="/"
        className="inline-flex items-center text-slate-600 hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Products
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <img
            src={product.image || noImage}
            alt={product.title}
            className="w-full h-full object-cover aspect-square"
            onError={(e) => {
              e.currentTarget.onerror = null
              e.currentTarget.src = noImage
            }}
          />
        </div>

        <div className="flex flex-col">
          <div className="mb-4">
            <Badge variant="primary">{product.category}</Badge>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">{product.title}</h1>

          <div className="flex items-center gap-4 mb-6">
            <ReviewSummary productId={product._id} />
          </div>

          <p className="text-slate-600 text-lg mb-8 leading-relaxed">{product.description}</p>

          <div className="mb-8">
            <span className="text-4xl font-bold text-primary">${product.price.toFixed(2)}</span>
          </div>

          <div className="flex gap-4 mb-8">
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              onClick={handleAddToCart}
            >
              {added ? 'Added to Cart!' : <><ShoppingCart className="w-5 h-5 mr-2" /> Add to Cart</>}
            </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  addItem(product)
                  navigate('/checkout')
                }}
              >
                Buy Now
              </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
              <Truck className="w-6 h-6 text-primary" />
              <div>
                <p className="font-medium text-slate-900">Free Shipping</p>
                <p className="text-sm text-slate-500">On orders over $50</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
              <Shield className="w-6 h-6 text-primary" />
              <div>
                <p className="font-medium text-slate-900">Secure Payment</p>
                <p className="text-sm text-slate-500">SSL encrypted</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-16">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Customer Reviews</h2>

        {isAuthenticated && (canReview || hasReviewed || showReviewForm) && (
          <div className="mb-8">
            {!showReviewForm && !hasReviewed && canReview && (
              <button
                onClick={() => setShowReviewForm(true)}
                className="px-4 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors"
              >
                Write a Review
              </button>
            )}
            {showReviewForm && (
              <ReviewForm
                productId={product._id}
                existingReview={existingReview}
                onSuccess={() => {
                  setShowReviewForm(false)
                  setRefreshKey((k) => k + 1)
                }}
                onCancel={() => setShowReviewForm(false)}
              />
            )}
            {hasReviewed && !showReviewForm && (
              <div className="mb-4 p-4 bg-slate-50 rounded-lg">
                {existingReview?.status === 'pending' ? (
                  <p className="text-slate-600 mb-2">Your review is pending approval.</p>
                ) : (
                  <p className="text-slate-600 mb-2">You have already reviewed this product.</p>
                )}
                <button
                  onClick={() => setShowReviewForm(true)}
                  className="text-primary font-medium hover:underline"
                >
                  Edit your review
                </button>
              </div>
            )}
          </div>
        )}

        {!isAuthenticated && (
          <div className="mb-8 p-4 bg-slate-50 rounded-lg text-center">
            <p className="text-slate-600">
              <Link to="/login" className="text-primary font-medium hover:underline">Log in</Link>
              {' '}to leave a review
            </p>
          </div>
        )}

        {isAuthenticated && !canReview && !hasReviewed && (
          <div className="mb-8 p-4 bg-slate-50 rounded-lg text-center">
            <p className="text-slate-600">Purchase this product to leave a review</p>
          </div>
        )}

        <ReviewList
          key={refreshKey}
          productId={product._id}
          userId={user?._id}
          onEdit={(review) => {
            setExistingReview(review)
            setShowReviewForm(true)
          }}
          onDelete={() => {
            setRefreshKey((k) => k + 1)
          }}
          onPendingReviewFound={(review) => {
            setHasReviewed(true)
            setExistingReview(review)
          }}
        />
      </div>
    </div>
  )
}

export default ProductDetailsPage
