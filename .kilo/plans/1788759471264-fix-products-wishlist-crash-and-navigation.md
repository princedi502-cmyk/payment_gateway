# Plan: Fix products crash + data not rendering on SPA navigation

## Problems

1. **Home page crashes**: `TypeError: Cannot read properties of null (reading 'slice')` at `Home.jsx:19`
2. **Wishlist / Dashboard / Profile need refresh** after SPA navigation to show data

---

## Root Cause #1 — `null` data crash on Home page

### Exact sequence (all on the first synchronous render):

| Step | File | Line | Event |
|------|------|------|-------|
| 1 | `useCachedFetch.js` | 30-34 | `useState` initializer returns `null` when cache miss (`cached !== null ? cached : null`) |
| 2 | `Home.jsx` | 13 | `const { data: products = [], ... }` — JS destructuring default `= []` only catches `undefined`, NOT `null` → `products = null` |
| 3 | `Home.jsx` | 19 | `products.slice(0, 8)` → `null.slice()` → **TypeError** |
| 4 | `useCachedFetch.js` | 73-76 | `useEffect` runs `fetchData()` — but AFTER render, so it never saves the first render |

### Why `loading` doesn't prevent it

`Home.jsx` **never checks `loading`** before `products.slice(0, 8)`. On first render `loading = true` (no cache), but the component proceeds to slice null products. Other `useCachedFetch` consumers (`ProductDetailsPage:41`, `OrderDetailPage:48`, `ReturnRequestPage:126`) all have `if (loading) return …` guards — `Home` is the only one missing it.

### Fix #1a — `useCachedFetch.js` (root cause, fixes all consumers)

Change initial `data` from `null` to `undefined` so destructuring defaults work:

**Line 30-34** — replace `null` with `undefined`:
```js
const [data, setData] = useState(() => {
  if (!enabled) return undefined;
  const cached = get(key);
  return cached !== null ? cached : undefined;
});
```

**Line 46** — broaden cache check to also skip `undefined`:
```js
if (!force && cached != null) {
```

### Fix #1b — `Home.jsx` (defensive + match existing pattern)

1. Add loading guard before `products.slice()` (matches ProductDetailsPage pattern):
```jsx
if (loading) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
    </div>
  )
}
```

2. Guard the slice:
```jsx
const featuredProducts = Array.isArray(products) ? products.slice(0, 8) : []
```

### Fix #1c — `ProductGrid.jsx` (defensive)

```jsx
// Line 3
function ProductGrid({ products = [], loading, emptyMessage = 'No products found' }) {
// Line 25
if (!products || !products.length) {
```

---

## Root Cause #2 — "Needs refresh" after SPA navigation

### Wishlist — `WishlistContext.jsx` (primary)

The `WishlistProvider`'s `useEffect` depends only on `[fetchWishlistItems]` (a stable `useCallback` with `[]` deps), so it fetches **once** on mount and never re-fetches.

It does **not** depend on `user` or `token`. Scenario:

1. App loads without a valid token → `WishlistContext` fetch fails (401) → catch keeps `items = []`
2. User logs in (`login()` sets `token` in localStorage + `user` in AuthContext)
3. `WishlistContext` effect does NOT re-fire (no `user` dependency) → `items` stays `[]`
4. Navigate to `/wishlist` → empty list
5. Manual refresh → `WishlistProvider` remounts → fetch succeeds → items shown

Contrast with `OrdersContext.jsx` which correctly depends on `[user]`.

### Fix #2a — `WishlistContext.jsx`

1. Import and use auth:
```jsx
import { useAuth } from '../../../shared/context'
const { isAuthenticated } = useAuth()
```

2. Make `fetchWishlistItems` depend on `isAuthenticated`:
```jsx
const fetchWishlistItems = useCallback(async () => {
  if (!isAuthenticated) {
    setLoading(false)
    return
  }
  setLoading(true)
  try {
    const data = await fetchWishlist()
    setItems(Array.isArray(data) ? data : [])
  } catch {
    // Keep localStorage-backed items as fallback
  } finally {
    setLoading(false)
  }
}, [isAuthenticated])
```

When user logs in: `isAuthenticated` flips `false → true` → `fetchWishlistItems` is recreated (new identity) → `useEffect` re-fires → fetch succeeds.

### Fix #2b — `OrdersContext.jsx` (minor, optional)

Initialize `loading` to `true` instead of `false` to avoid a brief "No orders yet" flash when `user` changes from `null` → user object:

```js
const [loading, setLoading] = useState(true)
```

---

## Files to modify

| Priority | File | Change |
|---|---|---|
| 🔴 Critical | `client/payment_front/src/shared/hooks/useCachedFetch.js` | Init `data` to `undefined`; use `!= null` for cache check |
| 🔴 Critical | `client/payment_front/src/features/products/pages/Home.jsx` | Add `loading` guard; `Array.isArray` guard on `.slice()` |
| 🟡 Important | `client/payment_front/src/features/wishlist/context/WishlistContext.jsx` | Depend on `isAuthenticated`; re-fetch on auth change; `Array.isArray` guard on `setItems` |
| 🟢 Defensive | `client/payment_front/src/features/products/components/ProductGrid.jsx` | `products = []` default param + null guard |
| 🟢 Low | `client/payment_front/src/features/dashboard/context/OrdersContext.jsx` | Init `loading` to `true` |

## Validation

1. Clear localStorage, hard refresh `/` → Home renders spinner → then products (no crash)
2. Navigate to `/product/:id` → details load
3. Log in → navigate to `/wishlist` → items render without refresh
4. Log in → navigate to `/dashboard` → orders render without refresh
5. Navigate to `/dashboard/profile` → addresses render without refresh
6. SPA-navigate away from and back to Home → cached products show instantly (no refetch, no crash)
