const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export function getUploadUrl(uploadPath) {
  if (!uploadPath) return ''
  if (/^https?:\/\//i.test(uploadPath)) return uploadPath

  const apiOrigin = API_BASE.replace(/\/api\/?$/, '')
  const normalizedPath = String(uploadPath).replace(/^\/+/, '')
  return `${apiOrigin}/uploads/${normalizedPath}`
}

export class ApiError extends Error {
  constructor(message, { status, code, details, requestId } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
    this.requestId = requestId
  }
}

function getAuthHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers,
    },
    ...options,
  })

  if (res.status === 401) {
    localStorage.removeItem('token')
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login?error=session_expired'
    }
    throw new ApiError('Session expired. Please log in again.', { status: 401, code: 'UNAUTHORIZED' })
  }

  const json = await res.json().catch(() => ({ message: 'Request failed' }))

  if (!res.ok) {
    throw new ApiError(json.message || 'Something went wrong', {
      status: res.status,
      code: json.code,
      details: json.details,
      requestId: json.requestId,
    })
  }

  return json
}

async function formDataRequest(endpoint, formData, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: options.method || 'POST',
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
    body: formData,
  })

  if (res.status === 401) {
    localStorage.removeItem('token')
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login?error=session_expired'
    }
    throw new ApiError('Session expired. Please log in again.', { status: 401, code: 'UNAUTHORIZED' })
  }

  const json = await res.json().catch(() => ({ message: 'Request failed' }))

  if (!res.ok) {
    throw new ApiError(json.message || 'Something went wrong', {
      status: res.status,
      code: json.code,
      details: json.details,
      requestId: json.requestId,
    })
  }

  return json
}

export async function fetchProducts(page = 1, limit = 20) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  const json = await request(`/products?${params.toString()}`)
  return json.data
}

export async function fetchProductById(id) {
  const json = await request(`/products/${id}`)
  return json.data
}

export async function createCheckoutSession(checkoutData) {
  const json = await request('/checkout', {
    method: 'POST',
    body: JSON.stringify(checkoutData),
  })
  return json.data
}

export async function getOrderById(orderId) {
  const json = await request(`/orders/${orderId}`)
  return json.data
}

export async function verifyPayment(paymentIntentId) {
  const json = await request('/payments/verify', {
    method: 'POST',
    body: JSON.stringify({ paymentIntentId }),
  })
  return json.data
}

export async function registerUser(data) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function loginUser(data) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function verifyEmail(token) {
  return request(`/auth/verify-email?token=${encodeURIComponent(token)}`)
}

export async function forgotPassword(email) {
  return request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function resetPassword(token, newPassword) {
  return request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  })
}

export async function getCurrentUser() {
  return request('/auth/me')
}

export async function getOrders(page = 1, limit = 10) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  return request(`/orders?${params.toString()}`)
}

export async function getUserStats() {
  return request('/orders/stats')
}

export async function updateProfile(data) {
  return request('/profile/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function getAddresses() {
  return request('/addresses')
}

export async function addAddress(data) {
  return request('/addresses', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateAddress(addressId, data) {
  return request(`/addresses/${addressId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteAddress(addressId) {
  return request(`/addresses/${addressId}`, {
    method: 'DELETE',
  })
}

export async function createReturnRequest(orderId, formData) {
  return formDataRequest('/returns', formData)
}

export async function getReturns() {
  const json = await request('/returns')
  return json.data
}

export async function createReview(productId, data, images) {
  const formData = new FormData()
  formData.append('productId', productId)
  formData.append('rating', String(data.rating))
  if (data.comment) {
    formData.append('comment', data.comment)
  }
  if (images && images.length > 0) {
    images.forEach((image) => {
      formData.append('images', image)
    })
  }
  return formDataRequest('/reviews', formData)
}

export async function getProductReviews(productId, page = 1, limit = 10) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  const json = await request(`/reviews/products/${productId}/reviews?${params.toString()}`)
  return json
}

export async function getMyReviews(page = 1, limit = 10) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  return request(`/reviews/me?${params.toString()}`)
}

export async function updateReview(reviewId, data, images) {
  const formData = new FormData()
  if (data.rating !== undefined) {
    formData.append('rating', String(data.rating))
  }
  if (data.comment !== undefined) {
    formData.append('comment', data.comment || '')
  }
  if (images && images.length > 0) {
    images.forEach((image) => {
      formData.append('images', image)
    })
  }
  return formDataRequest(`/reviews/${reviewId}`, formData, { method: 'PATCH' })
}

export async function deleteReview(reviewId) {
  return request(`/reviews/${reviewId}`, { method: 'DELETE' })
}

export async function canUserReviewProduct(productId) {
  return request(`/reviews/product/${productId}/can-review`)
}

export async function hasUserReviewedProduct(productId) {
  return request(`/reviews/product/${productId}/exists`)
}