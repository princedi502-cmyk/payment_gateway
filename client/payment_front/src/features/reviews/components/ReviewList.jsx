import { useState, useEffect, useCallback, useRef } from 'react'
import { Star, ChevronLeft, ChevronRight, Check, Pencil, Trash2 } from 'lucide-react'
import { getProductReviews, getUploadUrl } from '../../../shared/utils/api.js'
import { useAuth } from '../../../shared/context'
import noImage from '../../../assets/no-image.svg'

function getStarElement(star, rating, size = "w-4 h-4") {
  const isFull = star <= rating
  const isHalf = star === Math.ceil(rating) && rating % 1 === 0.5

  if (isFull) {
    return <Star key={star} className={`${size} fill-amber-400 text-amber-400`} />
  }
  if (isHalf) {
    return (
      <div key={star} className={`relative ${size}`}>
        <Star className={`${size} fill-slate-200 text-slate-200`} />
        <Star
          className={`absolute inset-0 ${size} fill-amber-400 text-amber-400`}
          style={{ clipPath: 'inset(0 50% 0 0)' }}
        />
      </div>
    )
  }
  return <Star key={star} className={`${size} fill-slate-200 text-slate-200`} />
}

function ReviewList({ productId, onEdit, onDelete, onPendingReviewFound }) {
  const [reviews, setReviews] = useState([])
  const [stats, setStats] = useState({ averageRating: 0, totalReviews: 0 })
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [expandedImage, setExpandedImage] = useState(null)
  const [userPendingReview, setUserPendingReview] = useState(null)
  const { user } = useAuth()
  const pendingReviewCallbackRef = useRef(onPendingReviewFound)

  useEffect(() => {
    pendingReviewCallbackRef.current = onPendingReviewFound
  }, [onPendingReviewFound])

  const fetchReviews = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const result = await getProductReviews(productId, page, 5)
      setReviews(result.data || [])
      const pending = result.userPendingReview || null
      setUserPendingReview(pending)
      if (pending && pendingReviewCallbackRef.current) {
        pendingReviewCallbackRef.current(pending)
      }
      setStats({
        averageRating: result.stats?.averageRating || 0,
        totalReviews: result.stats?.totalReviews || 0,
      })
      setPagination({
        page: result.pagination?.page || 1,
        pages: result.pagination?.pages || 1,
        total: result.pagination?.total || 0,
      })
    } catch (err) {
      console.error('Failed to fetch reviews:', err)
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReviews()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  const handlePageChange = (newPage) => {
    fetchReviews(newPage)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const renderReviewCard = (review, isPending = false) => (
    <div
      key={review._id}
      className={`bg-white rounded-xl border p-6 ${isPending ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">
              {review.userId?.name || 'Anonymous'}
            </span>
            {isPending && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                Pending Approval
              </span>
            )}
            {review.isVerifiedPurchase && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                <Check className="w-3 h-3" />
                Verified Purchase
              </span>
            )}
          </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => getStarElement(star, review.rating, "w-4 h-4"))}
              </div>
            <span className="text-sm text-slate-500">{formatDate(review.createdAt)}</span>
          </div>
        </div>
        {user?._id && review.userId?._id === user._id && (
          <div className="flex gap-2">
            <button
              onClick={() => onEdit && onEdit(review)}
              className="p-2 text-slate-400 hover:text-primary transition-colors"
              title="Edit review"
            >
              <Pencil className="w-4 h-4" />
            </button>
            {!isPending && (
              <button
                onClick={() => onDelete && onDelete(review._id)}
                className="p-2 text-slate-400 hover:text-danger transition-colors"
                title="Delete review"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {review.comment && (
        <p className="text-slate-600 leading-relaxed mb-4">{review.comment}</p>
      )}

      {review.images && review.images.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {review.images.map((image, idx) => (
            <button
              key={idx}
              onClick={() => setExpandedImage(image)}
              className="w-20 h-20 rounded-lg overflow-hidden border border-slate-200 hover:border-primary transition-colors"
            >
              <img
                src={getUploadUrl(image)}
                alt={`Review image ${idx + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.onerror = null
                  e.currentTarget.src = noImage
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-200 rounded w-48 animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="h-4 bg-slate-200 rounded w-32 mb-3 animate-pulse" />
              <div className="h-20 bg-slate-100 rounded w-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (stats.totalReviews === 0 && !userPendingReview) {
    return (
      <div className="py-12 text-center">
        <p className="text-slate-500 text-lg">No reviews yet</p>
        <p className="text-slate-400 mt-1">Be the first to review this product</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-6 pb-4 border-b border-slate-200">
        <div className="text-center">
          <div className="text-5xl font-bold text-slate-900">{stats.averageRating.toFixed(1)}</div>
          <div className="flex items-center justify-center gap-1 mt-2">
            {[1, 2, 3, 4, 5].map((star) => getStarElement(star, stats.averageRating, "w-4 h-4"))}
          </div>
          <p className="text-sm text-slate-500 mt-1">{stats.totalReviews} reviews</p>
        </div>
      </div>

      <div className="space-y-4">
        {userPendingReview && renderReviewCard(userPendingReview, true)}
        {reviews.map((review) => renderReviewCard(review, false))}
      </div>

      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="p-2 rounded-lg border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="px-4 text-sm text-slate-600">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.pages}
            className="p-2 rounded-lg border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {expandedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setExpandedImage(null)}
        >
          <img
            src={getUploadUrl(expandedImage)}
            alt="Review image"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
          <button
            onClick={() => setExpandedImage(null)}
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  )
}

export default ReviewList
