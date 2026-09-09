import { useState, useEffect, useRef, useCallback } from 'react'
import { Star, Upload, X, Loader2 } from 'lucide-react'
import { createReview, updateReview, deleteReview, getUploadUrl } from '../../../shared/utils/api.js'

function getStarElement(star, rating, size = "w-8 h-8") {
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

function ReviewForm({ productId, existingReview, onSuccess, onCancel }) {
  const [rating, setRating] = useState(existingReview?.rating || 0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState(existingReview?.comment || '')
  const [images, setImages] = useState([])
  const [previews, setPreviews] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef(null)
  const previewsRef = useRef([])
  const isEditMode = !!existingReview

  const handleImageSelect = useCallback((e) => {
    const files = Array.from(e.target.files || [])
    const remainingSlots = 3 - images.length

    if (remainingSlots <= 0) {
      setError('Maximum 3 images allowed')
      return
    }

    const filesToAdd = files.slice(0, remainingSlots)
    const invalidFile = filesToAdd.find(
      (file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024
    )
    if (invalidFile) {
      setError('Use a JPEG, PNG, or WebP image no larger than 5 MB')
      return
    }
    const newPreviews = filesToAdd.map((file) => URL.createObjectURL(file))

    setImages((prev) => [...prev, ...filesToAdd])
    setPreviews((prev) => [...prev, ...newPreviews])
    setError(null)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [images.length])

  const removeImage = (index) => {
    URL.revokeObjectURL(previews[index])
    setImages((prev) => prev.filter((_, i) => i !== index))
    setPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (rating === 0) {
      setError('Please select a rating')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = { rating, comment: comment.trim() || undefined }

      if (isEditMode) {
        await updateReview(existingReview._id, data, images.length > 0 ? images : null)
      } else {
        await createReview(productId, data, images.length > 0 ? images : null)
      }

      setSuccess(true)
      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      setError(err.message || 'Failed to submit review')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this review?')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      await deleteReview(existingReview._id)
      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      setError(err.message || 'Failed to delete review')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    return () => {
      previewsRef.current.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  useEffect(() => {
    previewsRef.current = previews
  }, [previews])

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        {isEditMode ? 'Edit Your Review' : 'Write a Review'}
      </h3>

      {success ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star className="w-8 h-8 fill-green-500 text-green-500" />
          </div>
          <p className="text-lg font-medium text-slate-900">
            {isEditMode ? 'Review updated!' : 'Review submitted!'}
          </p>
          <p className="text-slate-500 mt-1">
            {isEditMode
              ? 'Your changes have been saved.'
              : 'Thank you for your feedback. Your review will be visible after approval.'}
          </p>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Rating</label>
            <div className="flex gap-1" onMouseLeave={() => setHoverRating(0)}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={(e) => {
                    const { left, width } = e.currentTarget.getBoundingClientRect()
                    const half = e.clientX - left < width / 2 ? 0.5 : 0
                    setRating(star - half)
                  }}
                  onMouseMove={(e) => {
                    const { left, width } = e.currentTarget.getBoundingClientRect()
                    const half = e.clientX - left < width / 2 ? 0.5 : 0
                    setHoverRating(star - half)
                  }}
                  className="p-1 transition-transform hover:scale-110"
                >
                  {getStarElement(star, hoverRating || rating)}
                </button>
              ))}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {rating === 0.5 && 'Poor'}
              {rating === 1 && 'Poor'}
              {rating === 1.5 && 'Fair'}
              {rating === 2 && 'Fair'}
              {rating === 2.5 && 'Good'}
              {rating === 3 && 'Good'}
              {rating === 3.5 && 'Very Good'}
              {rating === 4 && 'Very Good'}
              {rating === 4.5 && 'Excellent'}
              {rating === 5 && 'Excellent'}
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Review (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={2000}
              rows={4}
              placeholder="Share your experience with this product..."
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
            />
            <p className="text-xs text-slate-400 mt-1 text-right">{comment.length}/2000</p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Photos (optional, max 3)
            </label>
            <div className="flex flex-wrap gap-3">
              {isEditMode && existingReview.images?.length > 0 && images.length === 0 && (
                <>
                  {existingReview.images.map((image, index) => (
                    <img
                      key={image}
                      src={getUploadUrl(image)}
                      alt={`Current review image ${index + 1}`}
                      className="w-20 h-20 object-cover rounded-lg border border-slate-200"
                    />
                  ))}
                </>
              )}
              {previews.map((preview, index) => (
                <div key={index} className="relative w-20 h-20">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 p-1 bg-danger text-white rounded-full shadow-sm hover:bg-danger/90 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {images.length < 3 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-primary hover:text-primary transition-colors"
                >
                  <Upload className="w-6 h-6" />
                </button>
              )}
            </div>
            {isEditMode && existingReview.images?.length > 0 && images.length === 0 && (
              <p className="text-xs text-slate-400 mt-2">Upload new photos to replace the current photos.</p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-danger/10 text-danger text-sm rounded-lg">{error}</div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || rating === 0}
              className="flex-1 px-4 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : isEditMode ? (
                'Update Review'
              ) : (
                'Submit Review'
              )}
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            )}
            {isEditMode && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2.5 border border-danger text-danger font-medium rounded-lg hover:bg-danger/5 transition-colors"
              >
                Delete
              </button>
            )}
          </div>

          {!isEditMode && (
            <p className="text-xs text-slate-400 mt-3 text-center">
              Your review will be visible after admin approval
            </p>
          )}
        </>
      )}
    </form>
  )
}

export default ReviewForm
