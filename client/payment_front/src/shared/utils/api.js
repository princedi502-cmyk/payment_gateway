const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

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

  const json = await res.json().catch(() => ({ message: 'Request failed' }))

  if (!res.ok) {
    throw new Error(json.message || 'Something went wrong')
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
