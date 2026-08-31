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
    const error = new Error(json.message || 'Something went wrong')
    error.status = res.status
    throw error
  }

  return json
}

export async function fetchWishlist() {
  const json = await request('/wishlist')
  return json.data
}

export async function addToWishlist(productId) {
  const json = await request(`/wishlist/${productId}`, {
    method: 'POST',
  })
  return json.data
}

export async function removeFromWishlist(productId) {
  await request(`/wishlist/${productId}`, {
    method: 'DELETE',
  })
}

export async function checkWishlist(productId) {
  const json = await request(`/wishlist/check/${productId}`)
  return json.inWishlist
}
