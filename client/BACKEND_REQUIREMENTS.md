# Backend Requirements — Payment Client

## Current State

The frontend is functional for **product browsing** and **cart management**, but the checkout and payment flows are mocked in the browser. This document specifies what the backend must provide to make those flows real.

---

## Already Working (No Changes Needed)

| Feature | Frontend | Backend | Status |
|---|---|---|---|
| Product listing | `GET /api/products` → `Home.jsx` | `product.controller.ts:4` + `product.routes.ts:6` | Done |
| Product detail | `GET /api/products/:id` → `ProductDetailsPage.jsx` | *Missing route* | TODO |
| Cart CRUD | `CartContext.jsx` (localStorage) | N/A | Client-only, OK for now |
| Cart totals | Client-side math | N/A | OK for now |

---

## Critical Missing Pieces

### 1. Orders (Highest Priority)

The checkout page (`CheckoutPage.jsx:13-32`) calls `onPay()` → `clearCart()` → navigates to a success page. No order is ever created on the server.

**What the frontend sends to create an order:**

```json
POST /api/orders
Content-Type: application/json

{
  "items": [
    {
      "productId": "MongoDB ObjectId",
      "title": "Wireless Headphones",
      "price": 149.99,
      "quantity": 2,
      "image": "https://..."
    }
  ],
  "shippingAddress": {
    "fullName": "John Doe",
    "email": "john@example.com",
    "address": "123 Main Street",
    "city": "New York",
    "zipCode": "10001"
  },
  "paymentMethod": "card",
  "subtotal": 299.98,
  "tax": 23.99,
  "total": 323.97,
  "status": "paid"
}
```

**Required `POST /api/orders` response:**

```json
{
  "success": true,
  "data": {
    "id": "order_mongo_id",
    "items": [...],
    "shippingAddress": {...},
    "subtotal": 299.98,
    "tax": 23.99,
    "total": 323.97,
    "status": "paid",
    "createdAt": "2026-07-22T..."
  }
}
```

**Required `GET /api/orders/:orderId` response** (used by PaymentSuccessPage to show real order data):

```json
{
  "success": true,
  "data": {
    "id": "order_mongo_id",
    "items": [...],
    "shippingAddress": {...},
    "subtotal": 299.98,
    "tax": 23.99,
    "total": 323.97,
    "status": "paid",
    "orderNumber": "ORD-10042",
    "paidAt": "2026-07-22T11:00:00Z",
    "createdAt": "2026-07-22T11:00:00Z"
  }
}
```

**Required `GET /api/orders?userId=<id>&page=1&limit=10` response:**

```json
{
  "success": true,
  "data": [...],
  "pagination": { "page": 1, "limit": 10, "total": 42 }
}
```

**Order Model fields:**
- `_id` — ObjectId
- `orderNumber` — unique human-readable string (e.g. `ORD-10001`)
- `userId` — ObjectId (user who placed it; nullable if no auth yet)
- `items` — array of `{ productId, title, price, quantity, image }`
- `shippingAddress` — embedded doc with `fullName`, `email`, `address`, `city`, `zipCode`
- `subtotal`, `tax`, `total` — Number
- `status` — enum: `pending | paid | failed | refunded`
- `paymentIntentId` — String (reference to payment intent)
- `createdAt`, `updatedAt` — timestamps

**Routes to add:**

| Method | Path | Controller | Auth |
|---|---|---|---|
| POST | `/api/orders` | `createOrder` | optional for now |
| GET | `/api/orders/:orderId` | `getOrderById` | optional for now |
| GET | `/api/orders` | `getUserOrders` | optional for now |

---

### 2. Single Product Endpoint

The frontend's `ProductDetailsPage.jsx` calls `fetchProductById(id)` but the backend **only has `GET /api/products`** — no `/api/products/:id` route.

**Required `GET /api/products/:id` response:**

```json
{
  "success": true,
  "count": 1,
  "data": {
    "_id": "...",
    "title": "Wireless Headphones",
    "description": "Premium noise-cancelling...",
    "price": 149.99,
    "image": "https://example.com/...",
    "category": "Electronics",
    "rating": 4.5,
    "reviews": 120,
    "createdAt": "..."
  }
}
```

---

### 3. Real Payment Processing (Phase 2)

**Current frontend behavior** (`CheckoutPage.jsx:18`):
```js
await new Promise((resolve) => setTimeout(resolve, 2000))
```

**What it should become:**
```js
// 1. Create a payment intent
const intent = await api.post('/payments/intent', { amount, currency: 'USD' })

// 2. Confirm payment on the frontend (with card details handled by Stripe/etc.)
const result = await stripe.confirmCardPayment(intent.data.clientSecret, { ... })

// 3. If success, create the order with the payment result
await api.post('/orders', { ..., paymentIntentId: result.paymentIntent.id })
```

**Backend already has** (in `payment.routes.ts` and `payment.controller.ts`):
- `POST /api/payments/intent` — creates a mock payment intent
- `GET /api/payments/status/:paymentId` — returns mock status
- `POST /api/payments/refund/:paymentId` — mock refund
- `GET /api/payments/history/:userId` — mock history

**Problems with current payment code:**
1. Payment routes are **not mounted** in `app.ts` — they exist but are unreachable
2. `authenticateUser` middleware **blocks all requests** without a `Bearer` token — the frontend never sends one, so every call gets 401
3. All responses are hardcoded with `Date.now()` — no database persistence

**To make payments real, you need to:**
- Decide on a payment provider (Stripe is the default choice)
- Wire up payment routes in `app.ts`
- Fix or bypass auth middleware (frontend has no auth yet)
- Replace mock responses with real provider SDK calls
- Store payment intent IDs linked to orders

---

### 4. Authentication (Phase 3)

The auth middleware exists (`authenticateUser`) but there are no login/register endpoints or JWT generation. Frontend has no auth flow at all.

**Minimum required endpoints:**

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create user, return JWT |
| POST | `/api/auth/login` | Validate credentials, return JWT |
| GET | `/api/auth/me` | Get current user from token |

Once auth exists, the `authenticateUser` middleware on payment/order routes will start working.

---

## Summary — Build Order

| Priority | What | Backend File(s) to Modify/Create |
|---|---|---|
| **1** | Single product endpoint | Add `GET /:id` to `product.routes.ts` + controller |
| **2** | Order model | Create `models/order.model.ts` |
| **3** | Order routes + controller | Create `routes/order.routes.ts`, `controllers/order.controller.ts` |
| **4** | Mount order routes | Update `app.ts` |
| **5** | Mount payment routes | Update `app.ts` |
| **6** | Fix auth middleware or bypass it | `auth.middleware.ts` + env vars |
| **7** | Wire real payment provider | `payment.service.ts` + provider SDK |
| **8** | Auth endpoints | `routes/auth.routes.ts` + controller + JWT utils |

Items 1-4 are all that's needed to make the full checkout flow functional end-to-end (with a mocked payment delay). Items 5-8 upgrade it to production-grade.
