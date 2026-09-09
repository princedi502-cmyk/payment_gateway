import { useState, useEffect, useCallback } from 'react'
import { Star } from 'lucide-react'
import { getProductReviews } from '../../../shared/utils/api.js'

function getStarElement(star, rating, size = "w-5 h-5") {
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

function ReviewSummary({ productId, className = '' }) {
  const [stats, setStats] = useState({ averageRating: 0, totalReviews: 0 })
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      const result = await getProductReviews(productId, 1, 1)
      setStats({
        averageRating: result.stats?.averageRating || 0,
        totalReviews: result.stats?.totalReviews || 0,
      })
    } catch (err) {
      console.error('Failed to fetch review stats:', err)
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  if (loading) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="animate-pulse flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="w-5 h-5 bg-slate-200 rounded" />
          ))}
        </div>
        <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
      </div>
    )
  }

  if (stats.totalReviews === 0) {
    return null
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => getStarElement(star, stats.averageRating, "w-5 h-5"))}
      </div>
      <span className="font-semibold text-slate-700">{stats.averageRating.toFixed(1)}</span>
      <span className="text-slate-500">({stats.totalReviews} {stats.totalReviews === 1 ? 'review' : 'reviews'})</span>
    </div>
  )
}

export default ReviewSummary
