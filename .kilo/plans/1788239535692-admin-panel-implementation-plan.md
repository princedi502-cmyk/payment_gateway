# Admin Panel Implementation Plan

## Executive Summary

This plan outlines the complete implementation of a full-featured admin panel for the MERN payment application. The admin panel will be deployed on a separate subdomain (`admin.yourdomain.com`) with a separate API namespace (`/admin/*`), built with Tailwind CSS + custom components to match the existing frontend, and include comprehensive analytics with Recharts.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DEPLOYMENT ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────────────┐         ┌──────────────────────────────────────┐ │
│   │   Frontend (Vite)    │         │        Admin Frontend (Vite)         │ │
│   │   yourdomain.com     │         │        admin.yourdomain.com          │ │
│   │                      │         │                                      │ │
│   │   - React + Tailwind │         │   - React + Tailwind + Recharts      │ │
│   │   - Port 5173        │         │   - Port 5174                        │ │
│   └──────────┬───────────┘         └──────────┬───────────────────────────┘ │
│              │                                │                             │
│              │         ┌──────────────────────┴───────────────────────┐     │
│              │         │              NGINX / Reverse Proxy           │     │
│              │         │                                              │     │
│              │         │   /api/*    → Backend (Port 5000)            │     │
│              │         │   /admin/*  → Backend (Port 5000)            │     │
│              │         │   /         → Frontend (Port 5173)           │     │
│              │         │   /admin    → Admin Frontend (Port 5174)      │     │
│              │         └──────────────────────┬───────────────────────┘     │
│              │                                │                             │
│              └────────────────────────────────┘                             │
│                                               │                             │
│                    ┌──────────────────────────┴──────────────────────────┐  │
│                    │              Backend (Express + TypeScript)          │  │
│                    │                                                     │  │
│                    │   /api/*      → Public API Routes                   │  │
│                    │   /admin/*    → Admin API Routes (separate router)  │  │
│                    │   /internal/* → Internal API Routes                 │  │
│                    └──────────────────────────┬──────────────────────────┘  │
│                                               │                             │
│                    ┌──────────────────────────┴──────────────────────────┐  │
│                    │              Data Layer                              │  │
│                    │                                                     │  │
│                    │   ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │  │
│                    │   │   MongoDB   │  │    Redis    │  │  Local FS │ │  │
│                    │   │  (Primary)  │  │   (Cache)   │  │ (Uploads) │ │  │
│                    │   └─────────────┘  └─────────────┘  └───────────┘ │  │
│                    └────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Database Schema Design

### 1.1 New Collections

#### **admin_logs** (Audit Trail)
```typescript
interface IAdminLog extends Document {
  adminId: Types.ObjectId;           // Reference to User (admin)
  action: string;                     // e.g., "order.update_status", "product.create"
  entityType: 'order' | 'product' | 'user' | 'return' | 'payment' | 'setting';
  entityId?: Types.ObjectId;          // Affected entity ID
  previousState?: Record<string, any>; // Before change
  newState?: Record<string, any>;     // After change
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
}

// Indexes
// - adminId: 1, createdAt: -1 (query by admin, sorted by date)
// - entityType: 1, entityId: 1 (query by entity)
// - createdAt: 1 with TTL 365 days (auto-cleanup)
```

#### **settings** (System Configuration)
```typescript
interface ISetting extends Document {
  key: string;                        // Unique key e.g., "return_window_days"
  value: any;                         // Value (can be string, number, object)
  type: 'string' | 'number' | 'boolean' | 'json';
  category: 'general' | 'email' | 'payment' | 'notification' | 'return' | 'security';
  description: string;
  isPublic: boolean;                  // Expose to frontend?
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Indexes
// - key: 1 (unique)
// - category: 1
```

#### **categories** (Product Categories)
```typescript
interface ICategory extends Document {
  name: string;
  slug: string;                       // URL-friendly name
  description?: string;
  image?: string;
  parentId?: Types.ObjectId;          // For subcategories
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// Indexes
// - slug: 1 (unique)
// - parentId: 1
// - isActive: 1
```

#### **notification_templates** (Email/Push Templates)
```typescript
interface INotificationTemplate extends Document {
  name: string;                       // e.g., "order_confirmation"
  type: 'email' | 'push';
  subject?: string;                   // Email subject
  content: string;                    // Template content with variables
  variables: string[];                // Available variables
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Indexes
// - name: 1 (unique)
// - type: 1
```

### 1.2 Modified Collections

#### **products** (Add category reference)
```typescript
// Add to existing IProduct:
categoryId?: Types.ObjectId;
sku?: string;
stock?: number;
isActive: boolean;
```

#### **orders** (Add admin tracking)
```typescript
// Add to existing IOrder:
statusHistory: Array<{
  status: string;
  changedBy: Types.ObjectId;
  changedAt: Date;
  note?: string;
}>;
adminNotes?: string;
```

---

## 2. Backend Implementation

### 2.1 Directory Structure

```
server/src/
├── admin/                              # Admin module
│   ├── controllers/
│   │   ├── admin-auth.controller.ts
│   │   ├── admin-dashboard.controller.ts
│   │   ├── admin-product.controller.ts
│   │   ├── admin-order.controller.ts
│   │   ├── admin-user.controller.ts
│   │   ├── admin-return.controller.ts
│   │   ├── admin-payment.controller.ts
│   │   ├── admin-analytics.controller.ts
│   │   ├── admin-settings.controller.ts
│   │   ├── admin-notification.controller.ts
│   │   └── admin-audit.controller.ts
│   ├── routes/
│   │   ├── admin-auth.routes.ts
│   │   ├── admin-dashboard.routes.ts
│   │   ├── admin-product.routes.ts
│   │   ├── admin-order.routes.ts
│   │   ├── admin-user.routes.ts
│   │   ├── admin-return.routes.ts
│   │   ├── admin-payment.routes.ts
│   │   ├── admin-analytics.routes.ts
│   │   ├── admin-settings.routes.ts
│   │   ├── admin-notification.routes.ts
│   │   └── admin-audit.routes.ts
│   ├── services/
│   │   ├── admin-log.service.ts
│   │   ├── admin-analytics.service.ts
│   │   └── admin-settings.service.ts
│   └── validators/
│       ├── admin-product.validator.ts
│       ├── admin-order.validator.ts
│       ├── admin-user.validator.ts
│       └── admin-settings.validator.ts
├── models/
│   ├── admin-log.model.ts
│   ├── setting.model.ts
│   ├── category.model.ts
│   └── notification-template.model.ts
└── middleware/
    └── admin-auth.middleware.ts       # Enhanced admin auth
```

### 2.2 Admin Authentication Middleware

```typescript
// server/src/middleware/admin-auth.middleware.ts

import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/jwt.ts";
import User from "../models/user.model.ts";

export interface AdminRequest extends Request {
  adminId: string;
  adminRole: string;
}

export const authenticateAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "Authorization token is required",
    });
    return;
  }

  const token = authHeader.split(" ")[1] as string;
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await User.findById(decoded.userId).select("role isVerified");

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Admin not found",
      });
      return;
    }

    if (user.role !== "admin") {
      res.status(403).json({
        success: false,
        message: "Admin access required",
      });
      return;
    }

    if (!user.isVerified) {
      res.status(403).json({
        success: false,
        message: "Email verification required for admin access",
      });
      return;
    }

    (req as AdminRequest).adminId = decoded.userId;
    (req as AdminRequest).adminRole = user.role;
    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

// Rate limiter for admin routes
export const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,                           // Higher limit than public API
  message: { success: false, message: "Too many admin requests" },
  standardHeaders: true,
  legacyHeaders: false,
});
```

### 2.3 Admin Audit Log Service

```typescript
// server/src/admin/services/admin-log.service.ts

import AdminLog from "../../models/admin-log.model.ts";
import type { AdminRequest } from "../../middleware/admin-auth.middleware.ts";

interface LogActionParams {
  req: AdminRequest;
  action: string;
  entityType: 'order' | 'product' | 'user' | 'return' | 'payment' | 'setting';
  entityId?: string;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
}

export async function logAdminAction(params: LogActionParams): Promise<void> {
  const { req, action, entityType, entityId, previousState, newState } = params;
  
  await AdminLog.create({
    adminId: req.adminId,
    action,
    entityType,
    entityId,
    previousState,
    newState,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
}
```

### 2.4 Admin Routes Setup

```typescript
// server/src/admin/routes/index.ts

import { Router } from "express";
import { authenticateAdmin, adminRateLimiter } from "../../middleware/admin-auth.middleware.ts";
import adminAuthRoutes from "./admin-auth.routes.ts";
import adminDashboardRoutes from "./admin-dashboard.routes.ts";
import adminProductRoutes from "./admin-product.routes.ts";
import adminOrderRoutes from "./admin-order.routes.ts";
import adminUserRoutes from "./admin-user.routes.ts";
import adminReturnRoutes from "./admin-return.routes.ts";
import adminPaymentRoutes from "./admin-payment.routes.ts";
import adminAnalyticsRoutes from "./admin-analytics.routes.ts";
import adminSettingsRoutes from "./admin-settings.routes.ts";
import adminNotificationRoutes from "./admin-notification.routes.ts";
import adminAuditRoutes from "./admin-audit.routes.ts";

const router = Router();

// Public admin routes (login)
router.use("/auth", adminAuthRoutes);

// Protected admin routes
router.use("/dashboard", authenticateAdmin, adminRateLimiter, adminDashboardRoutes);
router.use("/products", authenticateAdmin, adminRateLimiter, adminProductRoutes);
router.use("/orders", authenticateAdmin, adminRateLimiter, adminOrderRoutes);
router.use("/users", authenticateAdmin, adminRateLimiter, adminUserRoutes);
router.use("/returns", authenticateAdmin, adminRateLimiter, adminReturnRoutes);
router.use("/payments", authenticateAdmin, adminRateLimiter, adminPaymentRoutes);
router.use("/analytics", authenticateAdmin, adminRateLimiter, adminAnalyticsRoutes);
router.use("/settings", authenticateAdmin, adminRateLimiter, adminSettingsRoutes);
router.use("/notifications", authenticateAdmin, adminRateLimiter, adminNotificationRoutes);
router.use("/audit-logs", authenticateAdmin, adminRateLimiter, adminAuditRoutes);

export default router;
```

### 2.5 Main App Integration

```typescript
// server/src/app.ts (additions)

import adminRoutes from "./admin/routes/index.js";

// Add after existing routes
app.use("/admin", adminRoutes);
```

### 2.6 API Endpoints Summary

| Module | Endpoints | Description |
|--------|-----------|-------------|
| **Auth** | `POST /admin/auth/login` | Admin login (returns admin token) |
| | `POST /admin/auth/logout` | Admin logout |
| | `GET /admin/auth/me` | Get current admin info |
| **Dashboard** | `GET /admin/dashboard/stats` | Overview statistics |
| | `GET /admin/dashboard/recent-orders` | Recent orders list |
| | `GET /admin/dashboard/recent-users` | Recent registrations |
| | `GET /admin/dashboard/sales-chart` | Sales chart data |
| | `GET /admin/dashboard/alerts` | System alerts |
| **Products** | `GET /admin/products` | List all products (paginated, filterable) |
| | `POST /admin/products` | Create product |
| | `GET /admin/products/:id` | Get product details |
| | `PUT /admin/products/:id` | Update product |
| | `DELETE /admin/products/:id` | Delete product |
| | `POST /admin/products/bulk-delete` | Bulk delete |
| | `POST /admin/products/:id/image` | Upload product image |
| | `GET /admin/categories` | List categories |
| | `POST /admin/categories` | Create category |
| | `PUT /admin/categories/:id` | Update category |
| | `DELETE /admin/categories/:id` | Delete category |
| **Orders** | `GET /admin/orders` | List all orders (paginated, filterable) |
| | `GET /admin/orders/:id` | Get order details |
| | `PATCH /admin/orders/:id/status` | Update order status |
| | `POST /admin/orders/:id/note` | Add admin note |
| | `GET /admin/orders/:id/history` | Get order status history |
| | `POST /admin/orders/:id/cancel` | Cancel order |
| | `GET /admin/orders/export` | Export orders (CSV) |
| **Users** | `GET /admin/users` | List all users (paginated, filterable) |
| | `GET /admin/users/:id` | Get user details |
| | `GET /admin/users/:id/orders` | Get user orders |
| | `PATCH /admin/users/:id/status` | Suspend/activate user |
| | `PATCH /admin/users/:id/role` | Change user role |
| | `DELETE /admin/users/:id` | Delete user |
| | `GET /admin/users/export` | Export users (CSV) |
| **Returns** | `GET /admin/returns` | List all returns |
| | `GET /admin/returns/:id` | Get return details |
| | `PATCH /admin/returns/:id/approve` | Approve return |
| | `PATCH /admin/returns/:id/reject` | Reject return |
| | `PATCH /admin/returns/:id/initiated` | Mark return initiated |
| | `PATCH /admin/returns/:id/received` | Mark item received |
| | `POST /admin/returns/:id/refund` | Process refund |
| **Payments** | `GET /admin/payments` | List all payments |
| | `GET /admin/payments/:id` | Get payment details |
| | `POST /admin/payments/:id/refund` | Process refund |
| | `GET /admin/payments/stats` | Payment statistics |
| **Analytics** | `GET /admin/analytics/revenue` | Revenue analytics |
| | `GET /admin/analytics/orders` | Order analytics |
| | `GET /admin/analytics/users` | User analytics |
| | `GET /admin/analytics/products` | Product analytics |
| | `GET /admin/analytics/exports` | Export analytics |
| **Settings** | `GET /admin/settings` | Get all settings |
| | `GET /admin/settings/:category` | Get settings by category |
| | `PUT /admin/settings` | Update settings |
| | `GET /admin/settings/public/:key` | Get public setting |
| **Notifications** | `GET /admin/notifications/templates` | List templates |
| | `POST /admin/notifications/templates` | Create template |
| | `PUT /admin/notifications/templates/:id` | Update template |
| | `POST /admin/notifications/send` | Send notification |
| | `GET /admin/notifications/history` | Notification history |
| **Audit Logs** | `GET /admin/audit-logs` | List audit logs |
| | `GET /admin/audit-logs/:id` | Get log details |
| | `GET /admin/audit-logs/export` | Export logs |

---

## 3. Frontend Implementation

### 3.1 Directory Structure

```
client/admin_front/                       # Separate admin frontend
├── public/
│   └── favicon.ico
├── src/
│   ├── admin/                            # Admin-specific modules
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── AdminLayout.jsx
│   │   │   │   ├── AdminHeader.jsx
│   │   │   │   ├── AdminSidebar.jsx
│   │   │   │   └── AdminBreadcrumb.jsx
│   │   │   ├── ui/
│   │   │   │   ├── StatCard.jsx
│   │   │   │   ├── ChartCard.jsx
│   │   │   │   ├── DataTable.jsx
│   │   │   │   ├── FilterPanel.jsx
│   │   │   │   ├── SearchInput.jsx
│   │   │   │   ├── DateRangePicker.jsx
│   │   │   │   ├── StatusBadge.jsx
│   │   │   │   ├── UserAvatar.jsx
│   │   │   │   ├── ImageUpload.jsx
│   │   │   │   ├── ConfirmDialog.jsx
│   │   │   │   ├── Toast.jsx
│   │   │   │   └── LoadingSpinner.jsx
│   │   │   ├── charts/
│   │   │   │   ├── RevenueChart.jsx
│   │   │   │   ├── OrdersChart.jsx
│   │   │   │   ├── UsersChart.jsx
│   │   │   │   ├── ProductPerformanceChart.jsx
│   │   │   │   └── CategoryDistributionChart.jsx
│   │   │   └── forms/
│   │   │       ├── ProductForm.jsx
│   │   │       ├── CategoryForm.jsx
│   │   │       ├── SettingsForm.jsx
│   │   │       └── NotificationTemplateForm.jsx
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   ├── useApi.js
│   │   │   ├── usePagination.js
│   │   │   ├── useFilters.js
│   │   │   ├── useExport.js
│   │   │   └── useToast.js
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── products/
│   │   │   │   ├── ProductListPage.jsx
│   │   │   │   ├── ProductFormPage.jsx
│   │   │   │   ├── ProductDetailPage.jsx
│   │   │   │   └── CategoryListPage.jsx
│   │   │   ├── orders/
│   │   │   │   ├── OrderListPage.jsx
│   │   │   │   └── OrderDetailPage.jsx
│   │   │   ├── users/
│   │   │   │   ├── UserListPage.jsx
│   │   │   │   └── UserDetailPage.jsx
│   │   │   ├── returns/
│   │   │   │   ├── ReturnListPage.jsx
│   │   │   │   └── ReturnDetailPage.jsx
│   │   │   ├── payments/
│   │   │   │   └── PaymentListPage.jsx
│   │   │   ├── analytics/
│   │   │   │   └── AnalyticsPage.jsx
│   │   │   ├── settings/
│   │   │   │   └── SettingsPage.jsx
│   │   │   ├── notifications/
│   │   │   │   ├── NotificationListPage.jsx
│   │   │   │   └── TemplateListPage.jsx
│   │   │   └── audit/
│   │   │       └── AuditLogPage.jsx
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   ├── auth.service.js
│   │   │   ├── product.service.js
│   │   │   ├── order.service.js
│   │   │   ├── user.service.js
│   │   │   ├── analytics.service.js
│   │   │   └── settings.service.js
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── ToastContext.jsx
│   │   ├── utils/
│   │   │   ├── formatters.js
│   │   │   ├── validators.js
│   │   │   └── exportHelpers.js
│   │   └── App.jsx
│   ├── shared/                           # Shared with main frontend
│   │   └── components/
│   │       └── ui/
│   │           ├── Button.jsx
│   │           ├── Card.jsx
│   │           ├── Input.jsx
│   │           └── Modal.jsx
│   ├── styles/
│   │   └── index.css
│   ├── main.jsx
│   └── index.html
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── vite.config.js
└── .env
```

### 3.2 Admin Layout Component

```jsx
// client/admin_front/src/admin/components/layout/AdminLayout.jsx

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex">
        <AdminSidebar isOpen={sidebarOpen} />
        
        <main className={`flex-1 p-6 transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-16'
        }`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

### 3.3 Admin Sidebar Navigation

```jsx
// client/admin_front/src/admin/components/layout/AdminSidebar.jsx

import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  RotateCcw, 
  CreditCard,
  BarChart3,
  Settings,
  Bell,
  FileText,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const navItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { path: '/admin/products', icon: Package, label: 'Products' },
  { path: '/admin/orders', icon: ShoppingCart, label: 'Orders' },
  { path: '/admin/users', icon: Users, label: 'Users' },
  { path: '/admin/returns', icon: RotateCcw, label: 'Returns' },
  { path: '/admin/payments', icon: CreditCard, label: 'Payments' },
  { path: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/admin/notifications', icon: Bell, label: 'Notifications' },
  { path: '/admin/settings', icon: Settings, label: 'Settings' },
  { path: '/admin/audit-logs', icon: FileText, label: 'Audit Logs' },
];

export default function AdminSidebar({ isOpen }) {
  return (
    <aside className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r border-slate-200 transition-all duration-300 z-40 ${
      isOpen ? 'w-64' : 'w-16'
    }`}>
      <nav className="p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {isOpen && <span className="text-sm">{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
```

### 3.4 Data Table Component

```jsx
// client/admin_front/src/admin/components/ui/DataTable.jsx

import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown } from 'lucide-react';

export default function DataTable({ 
  columns, 
  data, 
  pagination,
  onPageChange,
  onSort,
  onRowClick,
  loading 
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const handleSort = (key) => {
    const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction });
    onSort?.(key, direction);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-8">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
                  style={{ width: col.width }}
                >
                  {col.sortable ? (
                    <button
                      onClick={() => handleSort(col.key)}
                      className="flex items-center gap-1 hover:text-slate-900"
                    >
                      {col.header}
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.map((row, idx) => (
              <tr
                key={row._id || idx}
                onClick={() => onRowClick?.(row)}
                className="hover:bg-slate-50 cursor-pointer transition-colors"
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-sm text-slate-700">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
          <div className="text-sm text-slate-600">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} results
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(1)}
              disabled={pagination.page === 1}
              className="p-1 rounded hover:bg-slate-200 disabled:opacity-50"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="p-1 rounded hover:bg-slate-200 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-sm text-slate-600">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
              className="p-1 rounded hover:bg-slate-200 disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(pagination.pages)}
              disabled={pagination.page === pagination.pages}
              className="p-1 rounded hover:bg-slate-200 disabled:opacity-50"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 3.5 Chart Components

```jsx
// client/admin_front/src/admin/components/charts/RevenueChart.jsx

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function RevenueChart({ data, dateRange }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-800">Revenue Overview</h3>
        <span className="text-sm text-slate-500">{dateRange}</span>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="date" 
              stroke="#64748b"
              fontSize={12}
            />
            <YAxis 
              stroke="#64748b"
              fontSize={12}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
              formatter={(value) => [`$${value}`, 'Revenue']}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
            <Line 
              type="monotone" 
              dataKey="refunds" 
              stroke="#ef4444" 
              strokeWidth={2}
              dot={{ fill: '#ef4444', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

### 3.6 API Service

```javascript
// client/admin_front/src/admin/services/api.js

const ADMIN_API_BASE = import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:5000/admin';

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

  // Auth
  login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  getMe() {
    return this.request('/auth/me');
  }

  // Dashboard
  getStats() {
    return this.request('/dashboard/stats');
  }

  getSalesChart(params) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/dashboard/sales-chart?${query}`);
  }

  // Products
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

  uploadProductImage(id, file) {
    const formData = new FormData();
    formData.append('image', file);
    return this.request(`/products/${id}/image`, {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set content-type
    });
  }

  // Orders
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

  exportOrders(params) {
    const query = new URLSearchParams(params).toString();
    return fetch(`${this.baseUrl}/orders/export?${query}`, {
      headers: this.getAuthHeaders(),
    });
  }

  // Users
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

  updateUserStatus(id, status) {
    return this.request(`/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // Analytics
  getAnalytics(type, params) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/analytics/${type}?${query}`);
  }

  // Settings
  getSettings(category) {
    return category 
      ? this.request(`/settings/${category}`)
      : this.request('/settings');
  }

  updateSettings(data) {
    return this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Audit Logs
  getAuditLogs(params) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/audit-logs?${query}`);
  }
}

export const api = new ApiService();
export default api;
```

### 3.7 Routes Configuration

```jsx
// client/admin_front/src/admin/App.jsx

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/layout/AdminLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Lazy load pages
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

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Public routes */}
        <Route path="/admin/login" element={<LoginPage />} />
        
        {/* Protected admin routes */}
        <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
          
          {/* Products */}
          <Route path="products" element={<ProductListPage />} />
          <Route path="products/new" element={<ProductFormPage />} />
          <Route path="products/:id" element={<ProductDetailPage />} />
          <Route path="products/:id/edit" element={<ProductFormPage />} />
          <Route path="categories" element={<CategoryListPage />} />
          
          {/* Orders */}
          <Route path="orders" element={<OrderListPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          
          {/* Users */}
          <Route path="users" element={<UserListPage />} />
          <Route path="users/:id" element={<UserDetailPage />} />
          
          {/* Returns */}
          <Route path="returns" element={<ReturnListPage />} />
          <Route path="returns/:id" element={<ReturnDetailPage />} />
          
          {/* Payments */}
          <Route path="payments" element={<PaymentListPage />} />
          
          {/* Analytics */}
          <Route path="analytics" element={<AnalyticsPage />} />
          
          {/* Notifications */}
          <Route path="notifications" element={<NotificationListPage />} />
          <Route path="notifications/templates" element={<TemplateListPage />} />
          
          {/* Settings */}
          <Route path="settings" element={<SettingsPage />} />
          
          {/* Audit Logs */}
          <Route path="audit-logs" element={<AuditLogPage />} />
        </Route>
        
        {/* Redirect */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
```

---

## 4. Testing Strategy

### 4.1 Test Structure

```
server/src/
├── __tests__/
│   ├── unit/
│   │   ├── admin/
│   │   │   ├── services/
│   │   │   │   ├── admin-log.service.test.ts
│   │   │   │   ├── admin-analytics.service.test.ts
│   │   │   │   └── admin-settings.service.test.ts
│   │   │   └── controllers/
│   │   │       ├── admin-product.controller.test.ts
│   │   │       ├── admin-order.controller.test.ts
│   │   │       └── admin-user.controller.test.ts
│   │   └── middleware/
│   │       └── admin-auth.middleware.test.ts
│   ├── integration/
│   │   ├── admin/
│   │   │   ├── admin-auth.integration.test.ts
│   │   │   ├── admin-products.integration.test.ts
│   │   │   ├── admin-orders.integration.test.ts
│   │   │   ├── admin-users.integration.test.ts
│   │   │   ├── admin-returns.integration.test.ts
│   │   │   └── admin-analytics.integration.test.ts
│   │   └── helpers/
│   │       ├── test-db.ts
│   │       ├── test-server.ts
│   │       └── seed-data.ts
│   └── e2e/
│       └── admin/
│           ├── admin-login.e2e.test.ts
│           ├── admin-order-workflow.e2e.test.ts
│           └── admin-product-workflow.e2e.test.ts
└── admin_front/src/__tests__/
    ├── unit/
    │   ├── components/
    │   │   ├── DataTable.test.jsx
    │   │   ├── StatCard.test.jsx
    │   │   └── RevenueChart.test.jsx
    │   └── hooks/
    │       ├── useAuth.test.js
    │       ├── usePagination.test.js
    │       └── useFilters.test.js
    ├── integration/
    │   ├── products/
    │   │   └── ProductListPage.test.jsx
    │   └── orders/
    │       └── OrderListPage.test.jsx
    └── e2e/
        ├── admin-login.spec.js
        ├── product-crud.spec.js
        └── order-management.spec.js
```

### 4.2 Unit Test Examples

```typescript
// server/src/__tests__/unit/admin/services/admin-log.service.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import AdminLog from '../../../../models/admin-log.model.ts';
import { logAdminAction } from '../../../../admin/services/admin-log.service.ts';

// Mock AdminLog model
vi.mock('../../../../models/admin-log.model.ts');

describe('AdminLogService', () => {
  const mockReq = {
    adminId: 'admin123',
    ip: '127.0.0.1',
    get: vi.fn().mockReturnValue('test-user-agent'),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create admin log entry', async () => {
    const logData = {
      req: mockReq,
      action: 'order.update_status',
      entityType: 'order' as const,
      entityId: 'order123',
      previousState: { status: 'pending' },
      newState: { status: 'paid' },
    };

    await logAdminAction(logData);

    expect(AdminLog.create).toHaveBeenCalledWith({
      adminId: 'admin123',
      action: 'order.update_status',
      entityType: 'order',
      entityId: 'order123',
      previousState: { status: 'pending' },
      newState: { status: 'paid' },
      ipAddress: '127.0.0.1',
      userAgent: 'test-user-agent',
    });
  });
});
```

```typescript
// server/src/__tests__/unit/middleware/admin-auth.middleware.test.ts

import { describe, it, expect, vi } from 'vitest';
import { authenticateAdmin } from '../../../middleware/admin-auth.middleware.ts';
import User from '../../../models/user.model.ts';

vi.mock('jsonwebtoken');
vi.mock('../../../models/user.model.ts');
vi.mock('../../../config/jwt.ts', () => ({
  JWT_SECRET: 'test-secret',
}));

describe('authenticateAdmin middleware', () => {
  it('should return 401 if no authorization header', async () => {
    const req = { headers: {} } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    await authenticateAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 403 if user is not admin', async () => {
    const req = {
      headers: { authorization: 'Bearer validtoken' },
    } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    vi.mocked(User.findById).mockReturnValue({
      select: vi.fn().mockResolvedValue({ role: 'user', isVerified: true }),
    } as any);

    await authenticateAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
```

### 4.3 Integration Test Example

```typescript
// server/src/__tests__/integration/admin/admin-products.integration.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { setupTestDb, teardownTestDb, createTestAdmin } from '../helpers/index.ts';
import app from '../../../app.ts';

describe('Admin Products API', () => {
  let adminToken: string;

  beforeAll(async () => {
    await setupTestDb();
    adminToken = await createTestAdmin();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  describe('POST /admin/products', () => {
    it('should create a new product', async () => {
      const productData = {
        title: 'Test Product',
        description: 'Test description',
        price: 99.99,
        categoryId: 'cat123',
        stock: 100,
      };

      const response = await request(app)
        .post('/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(productData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(productData.title);
    });

    it('should return 401 without admin token', async () => {
      await request(app)
        .post('/admin/products')
        .send({ title: 'Test' })
        .expect(401);
    });
  });

  describe('GET /admin/products', () => {
    it('should return paginated products list', async () => {
      const response = await request(app)
        .get('/admin/products?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });
  });
});
```

### 4.4 E2E Test Example (Playwright)

```javascript
// client/admin_front/src/__tests__/e2e/admin-login.spec.js

import { test, expect } from '@playwright/test';

test.describe('Admin Login', () => {
  test('should login with valid admin credentials', async ({ page }) => {
    await page.goto('http://localhost:5174/admin/login');
    
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'adminpassword');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('http://localhost:5174/admin');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('http://localhost:5174/admin/login');
    
    await page.fill('input[name="email"]', 'wrong@email.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.error-message')).toBeVisible();
  });

  test('should redirect to login when accessing protected route', async ({ page }) => {
    await page.goto('http://localhost:5174/admin/orders');
    await expect(page).toHaveURL('http://localhost:5174/admin/login');
  });
});
```

---

## 5. Deployment Configuration

### 5.1 NGINX Configuration

```nginx
# /etc/nginx/sites-available/admin.yourdomain.com

server {
    listen 80;
    server_name admin.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name admin.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/admin.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.yourdomain.com/privkey.pem;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Admin Frontend
    root /var/www/admin_front/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /admin/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 5.2 Docker Configuration

```yaml
# docker-compose.admin.yml

version: '3.8'

services:
  admin_front:
    build:
      context: ./client/admin_front
      dockerfile: Dockerfile
    container_name: admin_frontend
    restart: unless-stopped
    environment:
      - VITE_ADMIN_API_URL=${ADMIN_API_URL}
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    container_name: admin_nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/admin.conf:/etc/nginx/conf.d/default.conf
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    depends_on:
      - admin_front
    networks:
      - app-network

networks:
  app-network:
    external: true
```

### 5.3 Environment Variables

```env
# client/admin_front/.env

VITE_ADMIN_API_URL=http://localhost:5000/admin
```

---

## 6. Implementation Task List

### Phase 1: Foundation (Database & Backend Core)

- [ ] Create database models:
  - [ ] `admin-log.model.ts`
  - [ ] `setting.model.ts`
  - [ ] `category.model.ts`
  - [ ] `notification-template.model.ts`
- [ ] Modify existing models:
  - [ ] Add fields to `product.model.ts` (categoryId, sku, stock, isActive)
  - [ ] Add fields to `order.model.ts` (statusHistory, adminNotes)
- [ ] Create admin authentication middleware (`admin-auth.middleware.ts`)
- [ ] Create admin audit log service (`admin-log.service.ts`)
- [ ] Create admin routes index (`admin/routes/index.ts`)
- [ ] Integrate admin routes in main app.ts

### Phase 2: Admin Auth & Dashboard

- [ ] Implement admin auth controller (login, me)
- [ ] Implement admin dashboard controller (stats, recent-orders, recent-users, sales-chart)
- [ ] Create admin login frontend page
- [ ] Create admin layout (header, sidebar)
- [ ] Create dashboard page with stat cards
- [ ] Create Recharts integration for sales chart

### Phase 3: Product Management

- [ ] Implement admin product CRUD controller
- [ ] Implement admin category CRUD controller
- [ ] Create image upload service for products
- [ ] Create product list page with DataTable
- [ ] Create product form page (create/edit)
- [ ] Create product detail page
- [ ] Create category list page
- [ ] Add bulk delete functionality

### Phase 4: Order Management

- [ ] Implement admin order controller (list, detail, status update, cancel, note)
- [ ] Implement order status history tracking
- [ ] Create order list page with filters
- [ ] Create order detail page
- [ ] Add order export functionality (CSV)
- [ ] Add admin notes functionality

### Phase 5: User Management

- [ ] Implement admin user controller (list, detail, status, role)
- [ ] Create user list page with filters
- [ ] Create user detail page with order history
- [ ] Add user export functionality
- [ ] Implement suspend/activate user
- [ ] Implement change user role

### Phase 6: Returns & Payments

- [ ] Enhance existing returns with admin features
- [ ] Create admin return list page
- [ ] Create return detail page with action buttons
- [ ] Implement payment history controller
- [ ] Create payment list page
- [ ] Implement refund processing from admin

### Phase 7: Analytics

- [ ] Implement analytics service (revenue, orders, users, products)
- [ ] Create analytics controller with aggregation pipelines
- [ ] Create analytics page with multiple charts
- [ ] Implement date range filtering
- [ ] Add export functionality for reports

### Phase 8: Settings & Audit

- [ ] Implement settings controller (CRUD)
- [ ] Create settings page with categorized sections
- [ ] Implement audit log viewer
- [ ] Create audit log page with filters
- [ ] Add audit log export

### Phase 9: Notifications

- [ ] Implement notification template controller
- [ ] Implement manual notification sender
- [ ] Create notification history page
- [ ] Create template management page

### Phase 10: Testing & Deployment

- [ ] Write unit tests for all services
- [ ] Write integration tests for all controllers
- [ ] Write E2E tests for critical flows
- [ ] Configure admin subdomain deployment
- [ ] Set up SSL certificates
- [ ] Configure NGINX for admin
- [ ] Set up CI/CD pipeline for admin frontend

---

## 7. Key Technical Decisions & Rationale

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Chart Library** | Recharts | React-native, composable, Tailwind-friendly, lightweight |
| **Admin Auth** | JWT with role claim | Consistent with existing auth, stateless |
| **API Namespace** | Separate `/admin/*` | Clean separation, easier to apply different middleware |
| **Frontend** | Separate Vite app | Independent deployment, smaller bundle, security isolation |
| **Database** | Same MongoDB, new collections | Simpler infrastructure, cross-collection queries |
| **Real-time** | Polling/Manual refresh | Simpler architecture, admin doesn't need real-time |
| **File Storage** | Local filesystem | Consistency with existing, simpler for single store |
| **Audit Log** | Separate collection with TTL | Auto-cleanup, no impact on main collections |
| **Testing** | Vitest + Playwright | Fast unit tests, reliable E2E |

---

## 8. Security Considerations

1. **Admin-only routes**: All `/admin/*` endpoints protected by `authenticateAdmin` middleware
2. **Audit trail**: All admin actions logged with IP and user agent
3. **Rate limiting**: Higher limits than public API but still protected
4. **Token storage**: Admin tokens stored in localStorage (separate from user token)
5. **CORS**: Configure strict CORS for admin subdomain only
6. **Input validation**: All admin inputs validated with Zod schemas
7. **SQL/NoSQL injection**: Mongoose schemas provide type safety
8. **XSS protection**: React's built-in XSS protection + output encoding

---

## 9. Performance Optimizations

1. **Pagination**: All list endpoints use cursor-based pagination
2. **Indexing**: Proper MongoDB indexes for admin queries
3. **Caching**: Redis caching for analytics data (5-min TTL)
4. **Lazy loading**: Admin frontend uses React.lazy for code splitting
5. **Aggregation pipelines**: Analytics use MongoDB aggregations for efficiency
6. **Selective fields**: Admin endpoints return only necessary fields

---

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Large dataset performance | Slow admin queries | Proper indexing, pagination, aggregation |
| Admin token theft | Unauthorized access | Short token expiry, HTTPS, audit logging |
| Concurrent edits | Data conflicts | Optimistic locking, status history |
| File upload abuse | Storage exhaustion | File size limits, type validation, rate limiting |
| Analytics query timeout | Poor UX | Pre-aggregated data, caching, query optimization |

---

## 11. Success Metrics

- All admin endpoints respond in < 200ms (p95)
- Admin frontend loads in < 3 seconds
- 100% test coverage for critical paths
- Zero security vulnerabilities in admin routes
- Audit log captures 100% of admin actions

---

## Appendix: Package Dependencies

### Backend (server/package.json additions)
```json
{
  "dependencies": {
    "json2csv": "^6.0.0"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "supertest": "^6.3.0",
    "@types/supertest": "^2.0.0"
  }
}
```

### Frontend (client/admin_front/package.json)
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "recharts": "^2.10.0",
    "lucide-react": "^0.294.0",
    "date-fns": "^2.30.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.3.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "@playwright/test": "^1.40.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "vitest": "^1.0.0",
    "jsdom": "^23.0.0"
  }
}
```