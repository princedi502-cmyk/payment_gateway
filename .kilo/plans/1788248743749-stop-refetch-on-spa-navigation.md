# Plan: Full-Stack QA Fixes — Reliability, Security & Correctness

## Goal
Eliminate the critical, high, and medium-severity defects found in the
full-stack code review of the MERN payment app. The previous chat response
listed ~52 issues spanning the server (`server/src/**`) and the React client
(`client/payment_front/src/**`); this plan organizes them into a single,
executable backlog grouped by severity, with concrete file:line references
and the exact code change required. After execution the app should:

- Have **no** secrets in source.
- Have **no** duplicate-payment / duplicate-notification races.
- Correctly share data across SPA navigation (no needless re-fetches).
- Survive logout-then-login-as-another-user without leaking previous state.
- Validate uploads by content (not just MIME), disallow XSS via uploaded images.
- Behave correctly when a request fails (loading state is reset, no silent 500s).

## Code paths the implementation agent must respect

- **Server entry:** `server/src/app.ts`
- **Auth:** `server/src/controllers/auth.controller.ts`, `server/src/middlewares/auth.middleware.ts`, `server/src/middleware/admin-auth.middleware.ts`, `client/payment_front/src/shared/context/AuthContext.jsx`, `client/payment_front/src/features/auth/pages/OAuthCallbackPage.jsx`
- **Orders / checkout / payments:** `server/src/controllers/{order,checkout,payment,webhook}.controller.ts`, `server/src/services/refund.service.ts`, `client/payment_front/src/features/checkout/{pages,components}/*`
- **Returns:** `server/src/controllers/return.controller.ts`, `server/src/services/refund.service.ts`, `client/payment_front/src/features/returns/pages/ReturnRequestPage.jsx`
- **Wishlist / addresses / products / profile:** `server/src/controllers/{wishlist,address,product,profile}.controller.ts`
- **Caching / state on client:** `client/payment_front/src/shared/context/{CacheContext,CartContext,AuthContext}.jsx`, `client/payment_front/src/features/dashboard/context/OrdersContext.jsx`, `client/payment_front/src/features/wishlist/context/WishlistContext.jsx`, `client/payment_front/src/shared/hooks/{useCachedFetch,useInvalidateCache}.js`
- **Models:** `server/src/models/{user,order,product,return,wishlist,webhookEvent,admin-log,setting,category,notification-template}.model.ts`
- **Validators:** `server/src/validators/*.ts`

## Out of scope (call out explicitly)
- Migrating JWT to httpOnly cookies (P1‑12). Patched by adding sameSite and a strict CSP, not by changing the auth flow.
- sessionStorage/localStorage persistence of the cache layer.
- Migrating to TanStack Query.
- The admin app audit (no time; only the main app).
- Pinning pre-release versions of ESLint v10 / TypeScript v7 (P2‑21). Document only.

---

## P0 — Blockers (do first, in this order)

### P0‑1. Strip hardcoded Upstash credentials
**File:** `server/src/config/redis.ts:3`
Drop the default URL. If `REDIS_URL` is missing, throw on construction.
Also: rotate the credential in Upstash (this is an external action, do it
before publishing the fix).

**Code shape:**
```ts
const url = process.env.REDIS_URL;
if (!url) throw new Error("REDIS_URL is not defined");
const redis = new Redis(url, { ... });
```

### P0‑2. CORS / session hardening
**File:** `server/src/app.ts:40-67`
- Add `sameSite: "lax"` to the session cookie.
- Add `app.set("trust proxy", 1)` only when behind a known proxy (gate on
  `process.env.TRUST_PROXY`).
- Drop `express-session` and `passport.initialize()` from `app.ts` if you
  are not actually using `req.session`. (The OAuth flow uses
  `session: false` — verified in `oauth.controller.ts:9,13`.) **Decision:
  remove the session middleware entirely** to reduce attack surface; the
  JWT path is the only auth used.

### P0‑3. Hard-require OAuth redirect URL
**File:** `server/src/controllers/oauth.controller.ts:5`, `server/src/config/google.ts:7`
- `FRONTEND_URL` and `BACKEND_URL`: throw at module load if missing (in
  production). Allow `localhost` defaults only when `NODE_ENV !== "production"`.

### P0‑4. Make checkout idempotent (Stripe + DB)
**File:** `server/src/providers/payment/stripe.provider.ts:11-18`,
`server/src/controllers/checkout.controller.ts:97-115`
- Pass `idempotencyKey: \`checkout-${orderId}\`` to `paymentIntents.create`.
- On Stripe failure, log the order as `failed` (do not delete it); keep
  the audit trail in `statusHistory`.
- Add `notificationScheduledAt` and `notificationSent` to the `pending`
  order so the worker can clean up abandoned orders.

### P0‑5. Fix `verifyPayment` / webhook double-pay race
**File:** `server/src/controllers/payment.controller.ts:269-295`,
`server/src/controllers/webhook.controller.ts:42-72`
- Replace `findByIdAndUpdate` with a conditional
  `findOneAndUpdate({ _id, status: { $ne: "paid" } }, { status: "paid", ... })`.
- Only schedule a notification if the document was actually updated.
- Wrap the notification + receipt in `Promise.all` after the conditional
  update succeeds.

### P0‑6. Validate upload by magic bytes, not MIME
**File:** `server/src/config/multer.ts:1-22`, `server/src/controllers/return.controller.ts:139-144`
- Replace the `fileFilter` with a custom check that reads the first
  ~12 bytes and compares to JPEG (`FF D8 FF`), PNG (`89 50 4E 47`), WEBP
  (`RIFF....WEBP`). Use the `file-type` package (or a small inline
  check).
- Rename the saved file to `<uuid>.<ext>` where ext is the verified type.
- Set `Content-Disposition: attachment` in the static handler for
  `/uploads/returns/*`.
- Reject any file whose extension is `.htm`, `.html`, `.svg`, `.js`, `.php`.

### P0‑7. Fix `getCurrentUser` ↔ `AuthContext` state mismatch
**Files:**
- `client/payment_front/src/features/auth/pages/OAuthCallbackPage.jsx:30-43`
- `client/payment_front/src/shared/context/AuthContext.jsx:5-25`
- `client/payment_front/src/features/auth/pages/LoginPage.jsx:36-45`

Add a `loginWithToken(token)` method to `AuthContext` that:
1. Writes token to localStorage.
2. Updates in-memory `token` state.
3. Calls `getCurrentUser()`, sets `user` state, sets `isLoading: false`.
4. Returns the user.

Use it from both `LoginPage` (after a successful password login) and
`OAuthCallbackPage`. Remove the current "setState after fetch" dance.

### P0‑8. Remove the misleading `items: []` from `CheckoutDetailsForm`
**File:** `client/payment_front/src/features/checkout/components/CheckoutDetailsForm.jsx:162-164`
Either delete the line, or pass the cart items in as a prop and include
them in `submitData`. Also update the JSDoc on `CheckoutPage.handleCreateSession`
to document the contract.

---

## P1 — Correctness / data integrity

### P1‑1. `OrdersContext` must reset on user change
**File:** `client/payment_front/src/features/dashboard/context/OrdersContext.jsx:15-33`
Replace the `useRef` guard with a `useEffect` that depends on `user` and
on every change: clears `orders` and `pagination` to initial values, then
re-fetches if `user` is truthy. Also wrap the fetch in try/catch/finally
and reset `loading: false` in `finally`.

### P1‑2. Coalesce `OrdersContext.invalidate()` calls
**File:** `OrdersContext.jsx:37-51`
Debounce `invalidate()` to 200 ms so multiple mutations in the same
tick trigger one refetch, not many.

### P1‑3. Drop dead cache invalidation in `ProfilePage`
**File:** `client/payment_front/src/features/dashboard/pages/ProfilePage.jsx:64-65`
- `invalidatePrefix('user')` and `invalidateKeys('auth/me')` refer to keys
  no call site uses. Remove them.
- After saving the profile, call `updateUser(...)` (already done) and
  also update `addresses` from the mutation response, not via a second
  `getAddresses()` (see P2‑12).

### P1‑4. `verifyPayment` must not overwrite existing `paidAt`
**File:** `server/src/controllers/payment.controller.ts:269-279`
See P0‑5. Same fix.

### P1‑5. `getOrderById` must scope guest orders
**File:** `server/src/controllers/order.controller.ts:77-111`
When `order.userId` is undefined, require a `guestToken` query param that
matches `order.guestToken`. Return the order id + guestToken from
`createCheckoutSession` when `userId` is missing. Store the token on the
order in `checkout.controller.ts`.

### P1‑6. `addAddress` should respect the requested `isDefault`
**File:** `server/src/controllers/address.controller.ts:30-68`
- Strip `isDefault` from the client payload, then apply the rule:
  - If the new address is the first one, set it as default.
  - Otherwise, honor `isDefault: true` from the client and unset other
    defaults.
- Document the rule on the validator.

### P1‑7. `addToWishlist` race → use unique-index catch
**File:** `server/src/controllers/wishlist.controller.ts:36-73`
Replace the `findOne` + `create` with a single `Wishlist.create` and a
try/catch on the E11000 error. Return 409 with a friendly message.

### P1‑8. `refund.service` must not double-refund
**File:** `server/src/services/refund.service.ts:1-33`
- Throw if `returnDoc.status === "refunded"`.
- Use Stripe `idempotencyKey: \`refund-${returnId}\``.

### P1‑9. Webhook side-effects must be idempotent
**File:** `server/src/controllers/webhook.controller.ts:30-117`
- Replace `findOne({ eventId })` + later `WebhookEvent.create(...)` with
  a single `findOneAndUpdate({ eventId }, { $setOnInsert: {...} }, { upsert: true })`.
- If `upserted` is null, this is a duplicate — return 200 immediately.
- Wrap the order update in the same conditional guard as P0‑5.

### P1‑10. Rate limiter must respect a trusted proxy
**File:** `server/src/app.ts:70-80`, `server/src/middleware/admin-auth.middleware.ts:70-80`
- If `process.env.TRUST_PROXY` is set, call
  `app.set("trust proxy", parseInt(process.env.TRUST_PROXY))`.
- Otherwise leave the default (no proxy). Document in README.

### P1‑11. `error.middleware.ts` must preserve `err.status`
**File:** `server/src/middlewares/error.middleware.ts:1-24`
Add a `HttpError` class (status + message) and update controllers to
`throw new HttpError(403, "...")`. The middleware reads `err.status ?? 500`.
For Zod validation errors thrown by middlewares, the existing
`validate()` middleware already short-circuits with 400 — that path is
correct, so leave it.

### P1‑12. Add `sameSite` to JWT session (no flow change)
**File:** not a cookie; this is localStorage JWT. Mitigation:
- Add a strict CSP header in `helmet()` (override defaults):
  `default-src 'self'; img-src 'self' data: https:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' ${STRIPE_JS_ORIGIN};`
- For uploaded images in `/uploads/returns/*`, serve with
  `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff`.
- Document the JWT-in-localStorage trade-off in README; full migration
  to httpOnly cookies is out of scope.

### P1‑13. `AuthContext.initAuth` must always set `isLoading: false`
**File:** `client/payment_front/src/shared/context/AuthContext.jsx:10-25`
Wrap the body in `try { ... } finally { setIsLoading(false) }`.

### P1‑14. `OrdersContext` must allow retry on failure
**File:** `client/payment_front/src/features/dashboard/context/OrdersContext.jsx:17-33`
On fetch error, reset the `fetchedRef` (or just remove the ref entirely
in P1‑1), so the next mount / user-change refetches. Also expose
`refetch()` from the context (currently named `invalidate` — keep the
name for API stability).

### P1‑15. `OrderDetailPage` and `ReturnRequestPage` need shared
post-mutation handling
**Files:**
- `client/payment_front/src/features/returns/pages/ReturnRequestPage.jsx:95-124`
- `client/payment_front/src/features/dashboard/pages/OrderDetailPage.jsx`

After a successful return submission, navigate to
`/dashboard/orders/${orderId}` and pass `state: { returnSuccess: true }`
(already done). The `OrderDetailPage` already reads `location.state?.returnSuccess`
and shows a banner. Verify the banner disappears on the next visit
(no state leak). Add an explicit "Dismiss" button on the banner.

---

## P2 — UX / maintainability

### P2‑1. `useCachedFetch` lazy initializer for `staleWhileRevalidate`
**File:** `client/payment_front/src/shared/hooks/useCachedFetch.js:26-90`
Replace the `// eslint-disable react-hooks/set-state-in-effect` disable
with a proper `useRef` for the "already fetched once" guard. Read the
docstring; the implementation is correct, but the lint suppression is a
smell.

### P2‑2. `ReturnRequestPage` stale `errors` in handlers
**File:** `client/payment_front/src/features/returns/pages/ReturnRequestPage.jsx:73,77`
Switch to `setErrors(prev => ({ ...prev, image: '...' }))` (the file
already does this on line 86; apply consistently on 73 and 77).

### P2‑3. Add `idempotencyKey` to `paymentIntents.create`
See P0‑4. Same change.

### P2‑4. Webhook order update idempotency
See P0‑5 / P1‑9.

### P2‑5. Remove `passport.initialize()` from `app.ts`
See P0‑2.

### P2‑6. Cap memory usage on return uploads
**File:** `server/src/config/multer.ts:1-22`
Switch to `multer.diskStorage` writing to `uploads/returns/tmp/`. After
magic-byte validation, move the file to its final name. Reject if the
file cannot be fully written.

### P2‑7. CORS preflight + helmet custom CSP
**File:** `server/src/app.ts:39-52`
Override helmet defaults (see P1‑12).

### P2‑8. `Header.jsx` `handleClickOutside` cleanup
**File:** `client/payment_front/src/shared/components/layout/Header.jsx:25`
Move the `addEventListener` into a `useEffect` with cleanup
`removeEventListener`. Verify in the existing code — the agent should
read the file in full before editing.

### P2‑9. Replace `seed.ts` placeholder image URLs
**File:** `server/src/scripts/seed.ts:8-62`
Use `https://picsum.photos/seed/<slug>/600/600` for each product so the
demo catalog shows actual images on first run.

### P2‑10. Verify-email cleanup
**File:** `server/src/controllers/auth.controller.ts:158-159`
After `user.isVerified = true`, also set
`user.verificationToken = undefined; user.verificationTokenExpires = undefined;`
Reject re-verification when `user.isVerified` is already true.

### P2‑11. Stripe publishable-key guard
**Files:**
- `client/payment_front/.env.example:1` — add the real key placeholder plus a comment.
- `client/payment_front/src/features/checkout/pages/CheckoutPage.jsx:11-12`

If `VITE_STRIPE_PUBLISHABLE_KEY` is missing or equals the placeholder,
show an inline error on the checkout page ("Stripe is not configured
for this environment") instead of mounting a broken `<PaymentElement />`.

### P2‑12. Stop double-fetching addresses after mutations
**File:** `client/payment_front/src/features/dashboard/pages/ProfilePage.jsx:105-147`
Use the response from `addAddress` / `updateAddress` / `deleteAddress`
directly to update local state. The mutations already return the full
updated `addresses` array. Also use the `CheckoutDetailsForm`
`addAddress` / `updateAddress` responses the same way
(`CheckoutDetailsForm.jsx:113-127`).

### P2‑13. `Header.jsx` search debounce
Inspect the current `Header.jsx`. If it fires API calls on input, add a
200 ms debounce via `useDebouncedValue` (small util in
`shared/hooks/useDebouncedValue.js`).

### P2‑14. Don't OneSignal-login unverified users
**File:** `client/payment_front/src/shared/context/AuthContext.jsx:27-70`
Gate the OneSignal login on `user.isVerified` being true (server returns
`isVerified` from `/auth/me`; see P0‑7 to make sure the client gets it).

### P2‑15. `OrderDetailPage` reset on id change
Already correct because React Router v7 mounts a new instance per `:id`.
Add an explicit `useEffect` that sets local state to initial values when
`id` changes, for safety.

### P2‑16. `CheckoutForm` must verify `paymentIntent.status === "succeeded"`
**File:** `client/payment_front/src/features/checkout/components/CheckoutForm.jsx:41-62`
If `paymentIntent.status !== "succeeded"`, show the Stripe error / status
text and **do not** call `verifyPayment` or `navigate('/payment-success')`.

### P2‑17. Barrel export for `useOrders`
**File:** `client/payment_front/src/features/dashboard/context/index.js` (new)
Re-export `useOrders` and `OrdersProvider` from a barrel so call sites
can `import { useOrders } from '@/features/dashboard/context'`.
Update the 4 importers (`DashboardPage`, `OrdersPage`,
`ReturnRequestPage`, `CheckoutForm`).

### P2‑18. `WishlistContext` must not wipe local items on fetch failure
**File:** `client/payment_front/src/features/wishlist/context/WishlistContext.jsx:22-32`
On error, do **not** call `setItems([])`. Keep the localStorage value as
the fallback. Only overwrite when the server returns successfully.

### P2‑19. Same for `CartContext`
**File:** `client/payment_front/src/shared/context/CartContext.jsx`
Cart is local-only, so this is mostly fine. But add a `useMemo` on the
context value to keep referential stability across renders.

### P2‑20. `lucide-react` version
**File:** `client/payment_front/package.json:17`
Pin to a current stable, e.g. `^0.460.0`. Verify icon imports still work
after upgrade.

### P2‑21. ESLint v10 / TypeScript v7 are pre-release
**Files:** `server/package.json:54`, `client/payment_front/package.json:30,33`
Document in README that these are pinned pre-release versions and need
to be downgraded to stable before the next minor release. **Do not
auto-downgrade in this PR** — that's a separate, breaking change.

### P2‑22. Drop unused session middleware
**File:** `server/src/app.ts:55-67`
See P0‑2.

### P2‑23. Clear `verificationToken` after use
See P2‑10.

### P2‑24. Reject already-verified users
See P2‑10.

### P2‑25. `/forgot-password` is the only "change password" path
**File:** `client/payment_front/src/features/dashboard/pages/ProfilePage.jsx:320`
Add a small note in the README that the change-password flow goes
through email OTP. (Already implied; this is documentation only.)

### P2‑26. Validate `addressId` ObjectId on update/delete
**File:** `server/src/controllers/address.controller.ts:70-148`
Add `if (!mongoose.Types.ObjectId.isValid(addressId)) return 400` at the
top of `updateAddress` and `deleteAddress`.

### P2‑27. `CheckoutForm` clears `stripeError` on retry
Already correct. Verify after P2‑16 change.

### P2‑28. `CheckoutDetailsForm` `addAddress` `isDefault` handling
**File:** `client/payment_front/src/features/checkout/components/CheckoutDetailsForm.jsx:111-127`
Stop sending `isDefault` from the form (the server is the source of
truth; see P1‑6). On the client, after `addAddress` / `updateAddress`,
update `savedAddresses` from the response.

### P2‑29. `WishlistContext` localStorage write on every change
See P2‑18. The write is fine, but the read on mount should not be
overwritten by an empty `[]` while the fetch is in flight.

### P2‑30. Redis fallback for rate limiter
Already set with `passOnStoreError: true`. The session store fallback is
moot once session middleware is removed (P0‑2). Add a startup warning
log if `redis.status !== "ready"` after the ping.

---

## P3 — Nits (do last, group into a single cleanup PR)

- **P3‑1.** `OrderDetailPage` dead import of `noImage` (it does not render
  product images on the detail page). Remove.
- **P3‑2.** `OrderDetailPage.jsx:127` `key={idx}` → `key={item.productId}`.
- **P3‑3.** `OrdersContext` useRef gate (resolved by P1‑1).
- **P3‑4.** `CheckoutPage.jsx:12` `loadStripe` at module load → move
  inside the component with a guard.
- **P3‑5.** `OrdersProvider` re-renders are scoped to consumers; verify
  `Header.jsx` does not import `useOrders` (it doesn't — confirmed).
- **P3‑6.** `app.use('/uploads', express.static('uploads'))` — add
  `maxAge: '1d'` and `etag: true`.
- **P3‑7.** `useCachedFetch` set-state-in-effect suppression — refactor
  to a ref-based one-shot guard (P2‑1).
- **P3‑8.** `OrderDetailPage` `isWithinReturnWindow` — already correct.
- **P3‑9.** `error.middleware` development stack leak — already gated on
  `NODE_ENV === "development"`.
- **P3‑10.** `auth.controller.ts:97-99` failedLoginAttempts — already
  self-corrects on next success.
- **P3‑11.** `order.controller.ts:130-132` use `Promise.all` to
  parallelize `find` + `countDocuments` (already done in
  `payment.controller.getPaymentHistory`).
- **P3‑12.** `product.controller.ts:34-37` — already uses `Promise.all`.

---

## Implementation order (concrete steps)

1. **P0‑1** (Redis secret) — single file edit, immediate.
2. **P0‑2** (CORS / session removal) — edits `app.ts`. Restart server.
3. **P0‑3** (OAuth redirect hardening) — edits 2 files.
4. **P0‑4 + P0‑5 + P2‑3 + P2‑4 + P1‑4 + P1‑9** (Stripe + webhook
   idempotency) — grouped because they touch the same flows. Edit
   `stripe.provider.ts`, `checkout.controller.ts`, `payment.controller.ts`,
   `webhook.controller.ts`, `refund.service.ts`. Write a small
   integration test that calls `verifyPayment` twice on the same
   payment intent and asserts only one `status: "paid"` transition.
5. **P0‑6** (upload magic bytes) — install `file-type`, edit
   `multer.ts`, `return.controller.ts`, `app.ts` (CSP + content-disposition).
6. **P0‑7** (Auth context fix) — edit `AuthContext.jsx`,
   `LoginPage.jsx`, `OAuthCallbackPage.jsx`. Run a manual OAuth test.
7. **P0‑8** (CheckoutDetailsForm `items: []`) — single line.
8. **P1‑1 + P1‑2 + P1‑14 + P2‑1** (OrdersContext / useCachedFetch
   rewrite) — single coherent change. Validate by opening the app,
   logging in as A, logging out, logging in as B, and confirming B sees
   their own orders.
9. **P1‑3 + P2‑12** (ProfilePage / CheckoutDetailsForm address fix).
10. **P1‑5** (guest order token) — schema migration: add `guestToken`
    to `Order`. New orders with no userId get a random token. Update
    `getOrderById` to require it for guest orders. Existing guest
    orders: nullable field, no migration needed.
11. **P1‑6, P2‑28** (address isDefault) — server + client.
12. **P1‑7** (wishlist E11000 catch) — single file.
13. **P1‑8** (refund idempotency) — service + Stripe.
14. **P1‑10, P1‑11** (trust proxy, error middleware status).
15. **P1‑12** (CSP, content-disposition on uploads) — `app.ts`.
16. **P1‑13, P1‑15** (AuthContext finally, return success banner).
17. **P2‑6, P2‑9, P2‑10, P2‑11, P2‑14, P2‑16, P2‑17, P2‑18, P2‑20,
    P2‑22** — cleanup batch.
18. **P3** — final nit pass.

## Validation

After every step:
- `cd server && npm run typecheck` — must pass.
- `cd server && npm run lint` — must pass (or only pre-existing warnings).
- `cd client/payment_front && npm run build` — must succeed.
- `cd client/payment_front && npm run lint` — must pass.

End-to-end manual checks (record in a `QA_REPORT.md`):

| Test | Expected |
|---|---|
| Register a new user, receive verification email, click link, log in | 200, redirected to `/` |
| Place an order with a test card (`4242 4242 4242 4242`) | `/payment-success` shows order, dashboard recent orders has it |
| Log out, log in as a different user | dashboard shows the new user's orders, not the previous user's |
| Open dashboard, navigate to product, back to dashboard | no `GET /orders` in Network tab |
| Hard reload | 1 `GET /orders` |
| Submit a return on a paid order | `OrderDetailPage` shows "Return Requested" badge |
| Refresh the app after a return | badge persists |
| Upload a `.txt` file renamed to `.jpg` on a return | rejected with 400, no file saved |
| Call `verifyPayment` twice on the same payment intent | only 1 notification scheduled (visible in Redis key count) |
| Place 2 orders in quick succession from two tabs | 2 distinct orders, no duplicate payments |
| Simulate Stripe webhook + client `verifyPayment` arriving within 1 s | exactly 1 notification, exactly 1 `paidAt`, no extra schedule |
| Curl `GET /api/orders/<guestOrderId>` without `guestToken` | 403 |

## Risks & open questions

- **Q1 (unresolved):** Should the JWT-in-localStorage be replaced by
  httpOnly cookies now, or in a follow-up? **Recommendation:** follow-up;
  the immediate hardening (CSP, sameSite) reduces the risk.
- **Q2 (unresolved):** The admin app has not been audited. The
  implementation agent should not touch it in this PR; flag it in the
  PR description.
- **Risk:** The Redis credential in `redis.ts` has likely already been
  scraped from the repo. Treat it as compromised and rotate it in
  Upstash **before** merging the fix.

## Open question for the user

> The previous chat got cut off mid-issue (#52 of 52). I have folded
> everything I observed into this plan. Two items I am explicitly
> leaving out unless you say otherwise:
>
> 1. Migrating JWT from localStorage to httpOnly cookies (P1‑12).
> 2. Full audit of the admin app (`server/src/admin/**` and any
>    separate `admin_front` workspace).
>
> Both are larger, breaking changes that deserve their own PRs. OK to
> defer them?

