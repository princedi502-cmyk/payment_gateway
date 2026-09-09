const ADMIN_API_BASE = import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:5000/api/admin';

export function getUploadUrl(uploadPath) {
  if (!uploadPath) return '';
  if (/^https?:\/\//i.test(uploadPath)) return uploadPath;

  const apiOrigin = ADMIN_API_BASE.replace(/\/api\/admin\/?$/, '');
  return `${apiOrigin}/uploads/${String(uploadPath).replace(/^\/+/, '')}`;
}

class ApiService {
  constructor() {
    this.baseUrl = ADMIN_API_BASE;
  }

  getAuthHeaders() {
    const token = localStorage.getItem('adminToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async request(endpoint, options = {}) {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options.headers,
      },
      ...options,
    });

    if (res.status === 401) {
      localStorage.removeItem('adminToken');
      window.location.href = '/admin/login';
      throw new Error('Unauthorized');
    }

    const json = await res.json().catch(() => ({ message: 'Request failed' }));

    if (!res.ok) {
      throw new Error(json.message || 'Something went wrong');
    }

    return json;
  }

  login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  getMe() {
    return this.request('/auth/me');
  }

  getStats() {
    return this.request('/dashboard/stats');
  }

  getRecentOrders() {
    return this.request('/dashboard/recent-orders');
  }

  getRecentUsers() {
    return this.request('/dashboard/recent-users');
  }

  getSalesChart(params) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/dashboard/sales-chart?${query}`);
  }

  getAlerts() {
    return this.request('/dashboard/alerts');
  }

  getProducts(params) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/products?${query}`);
  }

  getProduct(id) {
    return this.request(`/products/${id}`);
  }

  createProduct(data) {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateProduct(id, data) {
    return this.request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  deleteProduct(id) {
    return this.request(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  bulkDeleteProducts(ids) {
    return this.request('/products/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  }

  uploadProductImage(id, file) {
    const formData = new FormData();
    formData.append('image', file);
    return this.request(`/products/${id}/image`, {
      method: 'POST',
      body: formData,
      headers: {},
    });
  }

  getCategories() {
    return this.request('/categories');
  }

  createCategory(data) {
    return this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateCategory(id, data) {
    return this.request(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  deleteCategory(id) {
    return this.request(`/categories/${id}`, {
      method: 'DELETE',
    });
  }

  getOrders(params) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/orders?${query}`);
  }

  getOrder(id) {
    return this.request(`/orders/${id}`);
  }

  updateOrderStatus(id, status, note) {
    return this.request(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note }),
    });
  }

  cancelOrder(id) {
    return this.request(`/orders/${id}/cancel`, {
      method: 'POST',
    });
  }

  addOrderNote(id, note) {
    return this.request(`/orders/${id}/note`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  }

  getOrderHistory(id) {
    return this.request(`/orders/${id}/history`);
  }

  exportOrders(params) {
    const query = new URLSearchParams(params).toString();
    return fetch(`${this.baseUrl}/orders/export?${query}`, {
      headers: this.getAuthHeaders(),
    });
  }

  getUsers(params) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/users?${query}`);
  }

  getUser(id) {
    return this.request(`/users/${id}`);
  }

  getUserOrders(id) {
    return this.request(`/users/${id}/orders`);
  }

  updateUserStatus(id, isActive) {
    return this.request(`/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  }

  updateUserRole(id, role) {
    return this.request(`/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  }

  deleteUser(id) {
    return this.request(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  exportUsers(params) {
    const query = new URLSearchParams(params).toString();
    return fetch(`${this.baseUrl}/users/export?${query}`, {
      headers: this.getAuthHeaders(),
    });
  }

  getReturns(params) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/returns?${query}`);
  }

  getReturn(id) {
    return this.request(`/returns/${id}`);
  }

  approveReturn(id) {
    return this.request(`/returns/${id}/approve`, { method: 'PATCH' });
  }

  rejectReturn(id, adminNotes) {
    return this.request(`/returns/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ adminNotes }),
    });
  }

  markReturnInitiated(id) {
    return this.request(`/returns/${id}/return-initiated`, { method: 'PATCH' });
  }

  markReturnReceived(id) {
    return this.request(`/returns/${id}/returned`, { method: 'PATCH' });
  }

  processReturnRefund(id, amount) {
    return this.request(`/returns/${id}/refund`, {
      method: 'PATCH',
      body: JSON.stringify({ amount }),
    });
  }

  getPayments(params) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/payments?${query}`);
  }

  getPayment(id) {
    return this.request(`/payments/${id}`);
  }

  processRefund(id, amount) {
    return this.request(`/payments/${id}/refund`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  getPaymentStats() {
    return this.request('/payments/stats');
  }

  getAnalytics(type, params) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/analytics/${type}?${query}`);
  }

  getSettings(category) {
    return category
      ? this.request(`/settings/${category}`)
      : this.request('/settings');
  }

  updateSettings(settings) {
    return this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings }),
    });
  }

  getNotificationTemplates() {
    return this.request('/notifications/templates');
  }

  createNotificationTemplate(data) {
    return this.request('/notifications/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateNotificationTemplate(id, data) {
    return this.request(`/notifications/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  deleteNotificationTemplate(id) {
    return this.request(`/notifications/templates/${id}`, {
      method: 'DELETE',
    });
  }

  getAuditLogs(params) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/audit-logs?${query}`);
  }

  exportAuditLogs(params) {
    const query = new URLSearchParams(params).toString();
    return fetch(`${this.baseUrl}/audit-logs/export?${query}`, {
      headers: this.getAuthHeaders(),
    });
  }

  getPendingReviews(params) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/reviews/pending?${query}`);
  }

  getAllReviews(params) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/reviews?${query}`);
  }

  getReview(id) {
    return this.request(`/reviews/${id}`);
  }

  approveReview(id) {
    return this.request(`/reviews/${id}/approve`, { method: 'PATCH' });
  }

  rejectReview(id) {
    return this.request(`/reviews/${id}/reject`, { method: 'PATCH' });
  }

  deleteReview(id) {
    return this.request(`/reviews/${id}`, { method: 'DELETE' });
  }

  getReviewStats() {
    return this.request('/reviews/stats');
  }
}

export const api = new ApiService();
export default api;
