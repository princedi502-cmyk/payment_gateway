import { useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, X } from 'lucide-react'
import Button from '../../../shared/components/ui/Button.jsx'
import Card from '../../../shared/components/ui/Card.jsx'
import { getOrderById, createReturnRequest } from '../../../shared/utils/api.js'
import { useCachedFetch } from '../../../shared/hooks/useCachedFetch.js'
import { useInvalidateCache } from '../../../shared/hooks/useInvalidateCache.js'
import { useOrders } from '../../dashboard/context/OrdersContext.jsx'

const RETURN_REASONS = [
  { value: 'defective', label: 'Item is defective' },
  { value: 'damaged_in_shipping', label: 'Damaged in shipping' },
  { value: 'wrong_item', label: 'Wrong item received' },
  { value: 'not_as_described', label: 'Not as described' },
  { value: 'no_longer_needed', label: 'No longer needed' },
  { value: 'size_issue', label: 'Size issue' },
  { value: 'other', label: 'Other' },
]

const MAX_DESC_LENGTH = 1000
const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function ReturnRequestPage() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { invalidatePrefix, invalidateKeys } = useInvalidateCache()
  const orders = useOrders()

  const [submitting, setSubmitting] = useState(false)
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [errors, setErrors] = useState({})

  const fetchOrder = useCallback(() => getOrderById(orderId), [orderId])
  const { data: order, loading, error } = useCachedFetch(
    `order:${orderId}`,
    fetchOrder,
    { enabled: !!orderId }
  )

  const validate = () => {
    const newErrors = {}

    if (!reason) {
      newErrors.reason = 'Please select a reason'
    }

    if (!imageFile) {
      newErrors.image = 'An image is required'
    } else if (!ALLOWED_TYPES.includes(imageFile.type)) {
      newErrors.image = 'Only JPG, PNG, and WebP images are allowed'
    } else if (imageFile.size > MAX_FILE_SIZE) {
      newErrors.image = 'Image must be 5MB or smaller'
    }

    if (description.length > MAX_DESC_LENGTH) {
      newErrors.description = `Description must be ${MAX_DESC_LENGTH} characters or less`
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrors((prev) => ({ ...prev, image: 'Only JPG, PNG, and WebP images are allowed' }))
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrors((prev) => ({ ...prev, image: 'Image must be 5MB or smaller' }))
      return
    }

    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setImagePreview(ev.target.result)
    reader.readAsDataURL(file)
    setErrors((prev) => ({ ...prev, image: undefined }))
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview('')
    setErrors((prev) => ({ ...prev, image: undefined }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validate()) return

    setSubmitting(true)
    setErrors({})

    try {
      const formData = new FormData()
      formData.append('orderId', orderId)
      formData.append('reason', reason)
      if (description) formData.append('description', description)
      formData.append('image', imageFile)

      await createReturnRequest(orderId, formData)

      invalidateKeys(`order:${orderId}`)
      orders.invalidate()
      invalidatePrefix('returns')

      navigate(`/dashboard/orders/${orderId}`, {
        state: { returnSuccess: true },
      })
    } catch (err) {
      setErrors({ submit: err.message || 'Failed to submit return request' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="text-slate-600">Loading order...</div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <Card>
          <h1 className="text-2xl font-bold text-secondary mb-2">Order Not Found</h1>
          <p className="text-slate-500 mb-6">We could not find this order.</p>
          <Link to="/dashboard/orders">
            <Button>Back to Orders</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-6">
        <Link
          to={`/dashboard/orders/${orderId}`}
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-primary"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Order
        </Link>
      </div>

      <Card className="p-6">
        <h1 className="text-2xl font-bold text-secondary mb-2">Request Return</h1>
        <p className="text-sm text-slate-500 mb-6">
          Order #{order.orderNumber} — You have 15 days from purchase to return items in
          original condition with all tags attached.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Reason for return <span className="text-red-600">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                setErrors((prev) => ({ ...prev, reason: undefined }))
              }}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                errors.reason ? 'border-red-500' : 'border-slate-300'
              }`}
              required
            >
              <option value="">Select a reason</option>
              {RETURN_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            {errors.reason && <p className="text-sm text-red-600 mt-1">{errors.reason}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Upload photo <span className="text-red-600">*</span>
            </label>
            <div
              className={`border-2 border-dashed rounded-md p-4 text-center cursor-pointer transition-colors ${
                errors.image
                  ? 'border-red-500 bg-red-50'
                  : imagePreview
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-300 hover:border-primary'
              }`}
              onClick={() => !imagePreview && document.getElementById('image-input').click()}
            >
              {imagePreview ? (
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-w-full max-h-48 rounded"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeImage()
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">Click to upload an image</p>
                  <p className="text-xs text-slate-400 mt-1">
                    JPG, PNG, or WebP — max 5MB
                  </p>
                </>
              )}
            </div>
            <input
              id="image-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              className="hidden"
            />
            {errors.image && <p className="text-sm text-red-600 mt-1">{errors.image}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={MAX_DESC_LENGTH}
              rows={4}
              placeholder="Please describe the issue with your item..."
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none ${
                errors.description ? 'border-red-500' : 'border-slate-300'
              }`}
            />
            <div className="flex justify-between">
              {errors.description && (
                <p className="text-sm text-red-600 mt-1">{errors.description}</p>
              )}
              <span className="text-xs text-slate-400">
                {description.length}/{MAX_DESC_LENGTH}
              </span>
            </div>
          </div>

          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <Link to={`/dashboard/orders/${orderId}`} className="flex-1">
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              loading={submitting}
              disabled={submitting}
              className="flex-1"
            >
              Submit Return Request
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

export default ReturnRequestPage
