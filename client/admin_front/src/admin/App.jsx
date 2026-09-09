import { lazy, Suspense, useLayoutEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AdminLayout from './components/layout/AdminLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoadingSpinner from './components/ui/LoadingSpinner';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProductListPage = lazy(() => import('./pages/products/ProductListPage'));
const ProductFormPage = lazy(() => import('./pages/products/ProductFormPage'));
const ProductDetailPage = lazy(() => import('./pages/products/ProductDetailPage'));
const CategoryListPage = lazy(() => import('./pages/products/CategoryListPage'));
const OrderListPage = lazy(() => import('./pages/orders/OrderListPage'));
const OrderDetailPage = lazy(() => import('./pages/orders/OrderDetailPage'));
const UserListPage = lazy(() => import('./pages/users/UserListPage'));
const UserDetailPage = lazy(() => import('./pages/users/UserDetailPage'));
const ReturnListPage = lazy(() => import('./pages/returns/ReturnListPage'));
const ReturnDetailPage = lazy(() => import('./pages/returns/ReturnDetailPage'));
const PaymentListPage = lazy(() => import('./pages/payments/PaymentListPage'));
const AnalyticsPage = lazy(() => import('./pages/analytics/AnalyticsPage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));
const NotificationListPage = lazy(() => import('./pages/notifications/NotificationListPage'));
const TemplateListPage = lazy(() => import('./pages/notifications/TemplateListPage'));
const AuditLogPage = lazy(() => import('./pages/audit/AuditLogPage'));
const AdminReviewsPage = lazy(() => import('./pages/reviews/AdminReviewsPage'));

function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ScrollToTop />
      <Routes>
        <Route path="/admin/login" element={<LoginPage />} />

        <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />

          <Route path="products" element={<ProductListPage />} />
          <Route path="products/new" element={<ProductFormPage />} />
          <Route path="products/:id" element={<ProductDetailPage />} />
          <Route path="products/:id/edit" element={<ProductFormPage />} />
          <Route path="categories" element={<CategoryListPage />} />

          <Route path="orders" element={<OrderListPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />

          <Route path="users" element={<UserListPage />} />
          <Route path="users/:id" element={<UserDetailPage />} />

          <Route path="returns" element={<ReturnListPage />} />
          <Route path="returns/:id" element={<ReturnDetailPage />} />

          <Route path="reviews" element={<AdminReviewsPage />} />

          <Route path="payments" element={<PaymentListPage />} />

          <Route path="analytics" element={<AnalyticsPage />} />

          <Route path="notifications" element={<NotificationListPage />} />
          <Route path="notifications/templates" element={<TemplateListPage />} />

          <Route path="settings" element={<SettingsPage />} />

          <Route path="audit-logs" element={<AuditLogPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
