# Project Architecture & Stripe Integration Guide

## Overview

This is a **full-stack e-commerce payment practice app** built as a side-project learning environment. The frontend is a React + Vite + Tailwind single-page app. The backend is an Express + TypeScript + MongoDB API. Everything is wired for real orders except the final payment authorization, which is currently mocked.

Stomething to keep in mind while integrating: **I don't have prior Stripe integration experience** — I built this to practice payment flows. I need concrete guidance on exactly what Stripe SDK calls to make, where to put them, and what the expected request/response shapes are.

---

## 1. Frontend — What's Built

### Tech Stack
- React 19, React Router 7, Vite 6, Tailwind CSS 4, Lucide icons
- State: React Context (`CartContext`) + `localStorage` for cart persistence
- No external state library (Redux/Zustand)

### Routes & Pages

| Route | File | Status |
|---|---|---|
| `/` | `features/products/pages/Home.jsx` | Fetches `GET /api/products`, renders `ProductGrid` |
| `/product/:id` | `features/products/pages/ProductDetailsPage.jsx` | Fetches `GET /api/products/:id`, Add to Cart + Buy Now |
| `/cart` | `features/cart/pages/CartPage.jsx` | Quantity controls, totals, remove items, navigate to checkout |
| `/checkout` | `features/checkout/pages/CheckoutPage.jsx` | Checkout form + order summary; currently creates order immediately |
| `/payment-success` | `features/checkout/pages/PaymentSuccessPage.jsx` | Fetches order by ID from backend, shows order details |

### Components

- **Header** (`shared/components/layout/Header.jsx`) — nav, cart icon with badge, mobile menu
- **Footer** (`shared/components/layout/Footer.jsx`) — static footer
- **ProductCard** (`features/products/components/ProductCard.jsx`) — product card with quick add-to-cart
- **ProductGrid** (`features/products/components/ProductGrid.jsx`) — responsive grid, loading skeleton, empty state
- **CheckoutForm** (`features/checkout/components/CheckoutForm.jsx`) — validated form: fullName, email, address, city, zipCode, cardNumber (auto-spaces), expiryDate (MM/YY auto-format), CVC
- **Button, Badge, Input** (`shared/components/ui/`) — reusable primitives

### Cart Context (`shared/context/CartContext.jsx`)

```
State:
  items[] — array of { _id, title, price, image, category, quantity }
  isOpen  — cart drawer visibility (exposed but no drawer UI exists)

Methods:
  addItem(product)      — adds or increments quantity by _id
  removeItem(_id)       — removes item
  updateQuantity(_id, qty) — sets quantity, removes if <= 0
  clearCart()           — resets to []
  (computed) totalItems
  (computed) totalPrice

Persistence: localStorage key = 'cart', syncs on every items change
```

### API Utilities (`shared/utils/api.js`)

```
fetchProducts()        → GET  /api/products
fetchProductById(id)   → GET  /api/products/:id
createOrder(data)      → POST /api/orders
getOrderById(orderId)  → GET  /api/orders/:orderId
```

`API_BASE = 'http://localhost:5000/api'`

---

## 2. Backend — What's Built

### Tech Stack
- Express 5, TypeScript, Mongoose 9, JWT auth, bcrypt
- Server runs on port 5000, TS via `tsx watch`

### Middleware

| Middleware | File | Purpose |
|---|---|---|
| `authenticateUser` | `middlewares/auth.middleware.ts` | Verifies JWT Bearer token; sets `req.userId` or falls back to a dummy ID if no token. **Does NOT reject requests** — used where auth is required eventually |
| `optionalAuth` | `middlewares/auth.middleware.ts` | Same but silent; used on order list where guest orders are allowed |
| Error handler | `middlewares/error.middleware.ts` | Centralized error response |

### Routes

```
GET    /health
GET    /api/products           — list all
GET    /api/products/:id       — single product
POST   /api/orders             — create order
GET    /api/orders/:orderId    — get order
GET    /api/orders?userId=&page=&limit= — user order history
POST   /api/auth/register      — register, returns JWT
POST   /api/auth/login         — login, returns JWT
GET    /api/auth/me            — get current user
POST   /api/payments/intent    — create payment intent (MOCKED)
GET    /api/payments/status/:paymentId — check status (MOCKED)
POST   /api/payments/refund/:paymentId — refund (MOCKED)
GET    /api/payments/history/:userId   — payment history (MOCKED)
```

### Controllers

| Controller | Key behavior |
|---|---|
| `product.controller.ts` | `getProducts` — `Product.find({}).sort({createdAt:-1})`; `getProductById` — validates ObjectId, `Product.findById` |
| `order.controller.ts` | `createOrder` — `new Order(req.body).save()`; `getOrderById` — `Order.findById`; `getUserOrders` — paginated query by `userId` |
| `auth.controller.ts` | `register` — bcrypt hash, `User.create`, JWT; `login` — bcrypt compare, JWT; `getMe` — returns user without password |
| `payment.controller.ts` | **All mocked.** `createPaymentIntent` returns `pi_${Date.now()}`; `getPaymentStatus` hardcodes `succeeded`; `refundPayment` returns `re_${Date.now()}`; `getPaymentHistory` returns hardcoded array |

### Services

- `payment.service.ts` — purely mock, generates fake IDs with `Date.now()`

---

## 3. Database — What's Built

### MongoDB (Mongoose)

**Connection:** `database.ts` connects via `process.env.DATABASE_URL`

**Collections:**

#### `products` (seeded on startup if empty)

```
title         String  (required)
description   String  (required)
price         Number  (required)
image         String  (required)
category      String  (required)
rating        Number  (0-5, required)
reviews       Number  (default: 0)
createdAt     Date    (timestamps)
updatedAt     Date    (timestamps)
```

Seed data: 6 products (Wireless Headphones, Smart Watch, Laptop Stand, Mechanical Keyboard, USB-C Hub, Noise Cancelling Earbuds)

#### `orders`

```
orderNumber       String   (unique, auto: ORD-{last5digitsOfTimestamp})
userId            ObjectId (ref: User, optional)
items[]           Embedded: [{ productId(ObjectId ref Product), title, price, quantity, image }]
shippingAddress   Embedded: { fullName, email, address, city, zipCode }
subtotal          Number   (required)
tax               Number   (required)
total             Number   (required)
status            String   enum: [pending, paid, failed, refunded], default: pending
paymentIntentId   String   (optional)
paidAt            Date     (optional)
createdAt         Date     (timestamps)
updatedAt         Date     (timestamps)
```

#### `users`

```
email     String  (unique, required)
password  String  (required, bcrypt hashed)
name      String  (required)
createdAt Date    (timestamps)
updatedAt Date    (timestamps)
```

**No other collections exist. There are no payment intent records, no invoices, no webhooks table.**

---

## 4. Current Checkout Flow (How It Works Today)

```
1. User clicks "Pay $X" on /checkout
2. CheckoutPage.handlePay() is called with formData
3. Frontend builds orderData = { items, shippingAddress, subtotal, tax, total, status: 'paid' }
4. Frontend calls POST /api/orders with orderData
5. Backend creates and saves Order to MongoDB → returns order with orderNumber
6. Frontend clears cart, navigates to /payment-success with orderNumber + orderId + total
7. /payment-success fetches GET /api/orders/:orderId to show real order details
```

**What's fake:** The payment step. There's no actual card processing, no Stripe, no validation that funds exist. The order is created with `status: 'paid'` on trust.

---

## 5. What Needs to Change for Stripe Integration

### What to tell the guide/expert:

I want to integrate **Stripe** as the payment provider. Currently the checkout creates an order with `status: 'paid'` immediately after form validation, with no real payment processing. The payment endpoints exist but return hardcoded mock data.

**I need help with:**

### 5a. Packages to install

Please tell me exactly what to add to:
- **Frontend** (`client/payment_front/package.json`) — I assume `@stripe/stripe-js` and `@stripe/react-stripe-js`, but confirm if there are alternatives that fit this stack better
- **Backend** (`server/package.json`) — I assume `stripe` (the official Node SDK), confirm

### 5b. Backend changes needed

The payment code in `server/src/controllers/payment.controller.ts` and `server/src/services/payment.service.ts` is all mocked. I need you to guide me to:

1. **Replace `createPaymentIntent`** with a real `stripe.paymentIntents.create()` call. I understand Stripe uses "Payment Intents" — should this endpoint create one with the order's `amount` and `currency`, and return the `client_secret` to the frontend?

2. **Replace `createOrder` flow** — currently it creates the order immediately. For Stripe, I think the flow is: first create the PaymentIntent on backend → confirm it on frontend with card details → if succeeded, create the order. Or alternatively: create order with `status: 'pending'` first, then mark as paid when payment succeeds. Which pattern do you recommend for this project?

3. **Webhook endpoint** — Should I add `POST /api/webhooks/stripe` to handle `payment_intent.succeeded` so the order status gets updated even if the user closes the tab before the success page loads? If yes, what events do I need to listen for?

4. **What to do with existing mock responses** in `getPaymentStatus`, `refundPayment`, `getPaymentHistory` — replace them all with real Stripe SDK calls?

5. **Where to store Stripe credentials** — `server/.env` currently has `PORT`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`. What env vars does Stripe need? (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`?)

6. **The auth middleware** — `authenticateUser` is applied to payment routes. The frontend currently has no auth (no login page being used). Should I remove auth from payment routes for now, or create a minimal auth flow first?

### 5c. Frontend changes needed

1. **Where does card input go?** The `CheckoutForm` currently has raw `<Input>` fields for card number, expiry, and CVC. Should I replace these with Stripe's `<CardElement>` or `<PaymentElement>`? Or keep my existing fields and use Stripe's `confirmCardPayment` with the raw values? (I've heard Stripe recommends their UI elements for PCI compliance.)

2. **What does the checkout page flow look like in Stripe terms?**
   - On mount → backend creates PaymentIntent → returns `client_secret`
   - User fills shipping info + clicks Pay
   - Frontend calls `stripe.confirmCardPayment(clientSecret, { payment_method: { card: cardElement, billing_details } })`
   - If succeeded → create order on backend → redirect to success
   - If failed → show error

   Is this the right flow? Are there edge cases I'm missing?

3. **Does "Buy Now" on the product detail page** (`ProductDetailsPage.jsx`) need to change? Currently it adds to cart and navigates to `/checkout`. Should it preserve which product triggered the buy-now, or is going through the cart the standard flow?

### 5d. Environment checklist

| Var | Purpose | Currently set? |
|---|---|---|
| `PORT` | Server port | ✅ `5000` |
| `DATABASE_URL` | MongoDB URI | ✅ `mongodb://localhost:27017/digital_product` |
| `JWT_SECRET` | JWT signing | ✅ |
| `JWT_EXPIRES_IN` | Token lifetime | ✅ |
| `STRIPE_SECRET_KEY` | Backend Stripe (sk_test_...) | ❌ |
| `STRIPE_PUBLISHABLE_KEY` | Frontend Stripe (pk_test_...) | ❌ |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification | ❌ |
| `NODE_ENV` | Environment flag | ❌ (only in `.env.example`) |

### 5e. What I explicitly DON'T need yet

- Subscription / recurring billing — this is a one-time-purchase store
- Saved cards / customer management
- Multiple currencies
- Refunds UI (the endpoint exists but no frontend page for it)
- Admin dashboard
- SCA / 3D Secure handling — if Stripe Elements handles this automatically, great; if I need to handle it explicitly, please explain

---

## 6. File Structure Reference

```
payment/
├── client/
│   ├── package.json                          (root scripts)
│   └── payment_front/
│       ├── package.json                      (deps, scripts)
│       ├── src/
│       │   ├── main.jsx
│       │   ├── App.jsx                       (routes)
│       │   ├── features/
│       │   │   ├── products/
│       │   │   │   ├── pages/Home.jsx
│       │   │   │   ├── pages/ProductDetailsPage.jsx
│       │   │   │   └── components/ProductCard.jsx, ProductGrid.jsx
│       │   │   ├── cart/
│       │   │   │   └── pages/CartPage.jsx
│       │   │   └── checkout/
│       │   │       ├── pages/CheckoutPage.jsx
│       │   │       ├── pages/PaymentSuccessPage.jsx
│       │   │       └── components/CheckoutForm.jsx
│       │   ├── shared/
│       │   │   ├── context/CartContext.jsx
│       │   │   ├── utils/api.js              ← add Stripe calls here
│       │   │   └── components/
│       │   │       ├── layout/Header.jsx, Footer.jsx
│       │   │       └── ui/Button.jsx, Badge.jsx, Input.jsx, Card.jsx
│       │   └── index.css
│       └── vite.config.js
└── server/
    ├── .env                                   ← add Stripe keys here
    ├── .env.example
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── app.ts                             ← mount new routes here
        ├── config/
        │   ├── database.ts
        │   ├── env.ts
        │   └── jwt.ts
        ├── middlewares/
        │   ├── auth.middleware.ts
        │   └── error.middleware.ts
        ├── models/
        │   ├── product.model.ts
        │   ├── order.model.ts
        │   └── user.model.ts
        ├── controllers/
        │   ├── product.controller.ts
        │   ├── order.controller.ts
        │   ├── payment.controller.ts          ← replace mock with Stripe
        │   └── auth.controller.ts
        ├── services/
        │   └── payment.service.ts             ← replace mock with Stripe
        ├── routes/
        │   ├── product.routes.ts
        │   ├── order.routes.ts
        │   ├── payment.routes.ts
        │   └── auth.routes.ts
        └── scripts/seed.ts
```

---

## 7. Current Git Status

No prior git commits in this repo. I'm tracking what I've changed so far:
- `client/` — added `createOrder`, `getOrderById` to `api.js`; rewired `CheckoutPage` from mock timeout to real `POST /api/orders`; rewired `PaymentSuccessPage` to fetch order from backend; removed dead `setIsOpen` references from Header and ProductDetailsPage

Everything else (backend models, routes, controllers, seed script) was already in place before I started. The Stripe integration is entirely unstarted — the payment controller and service are 100% mock data.

---

## Bottom Line

**I know:**
- Full-stack React + Express + MongoDB structure
- How the order data flows from cart → checkout form → backend → MongoDB → success page
- The existing API contract (request/response shapes)
- Where every file lives and what it does

**I don't know:**
- Stripe SDK specifics (which functions to call, in what order, what `client_secret` flow looks like)
- Whether to use `confirmCardPayment` or `confirmCardSetup` or something else
- Webhook setup (how to test locally, what endpoint path, what events)
- Where exactly to create the PaymentIntent relative to creating the Order

What I need from the guide is a **Stripe-specific implementation plan** with code shapes and file locations, not just high-level concepts.
