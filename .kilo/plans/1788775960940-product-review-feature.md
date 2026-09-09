# Product Review Feature — Implementation Plan

## Goal

Add a complete product review system where authenticated users who purchased a product can submit reviews with star ratings (1–5), optional text comments, and optional product images. Reviews require admin approval before being publicly visible. Aggregate rating is derived from the review collection and synced to the Product model.

---

## 1. Key Design Decisions

### 1.1 Review Eligibility
- Only authenticated users can write reviews.
- A user must have at least one **paid** order containing the product to be eligible to review it.
- One review per user per product. Users can edit or delete their own review.

### 1.2 Review Workflow (Moderation)
1. User submits review → `status: "pending"`.
2. Admin approves → `status: "approved"`, `isVerifiedPurchase: true`, product aggregate rating updated.
3. Admin rejects → `status: "rejected"`, no rating update.
4. User edits pending review → stays pending.
5. User edits approved review → falls back to `status: "pending"` for re-moderation.

### 1.3 Aggregate Rating
- `Product.rating` and `Product.reviews` (flat fields) are **removed** from the Product model.
- Aggregate rating (average of all approved reviews, rounded to 1 decimal) and review count are computed on demand via aggregation or cached in Redis alongside the product.
- A post-save hook on the Review model triggers `updateProductAggregateRating(productId)`.

### 1.4 Images
- Users can attach up to 3 images per review.
- Uploaded via existing multer `memoryStorage`, saved to `uploads/reviews/`.
- Existing `validateMagicBytes()` is reused.
- Response serves images via `/uploads/reviews/filename.jpg`.

### 1.5 Review Model
New file: `server/src/models/review.model.ts`

```ts
{
  userId: ObjectId (ref: User, required, indexed)
  productId: ObjectId (ref: Product, required, indexed)
  orderId: ObjectId (ref: Order, required)  // purchase verification
  rating: Number (required, min: 1, max: 5)
  comment: String (max 2000, optional)
  images: [String] (paths like "reviews/filename.jpg", default: [])
  status: "pending" | "approved" | "rejected" (default: "pending", indexed)
  isVerifiedPurchase: Boolean (default: false)
}
// Compound unique index on { userId, productId } — one review per user per product
```

---

## 2. Backend Implementation

### 2.1 Model — `server/src/models/review.model.ts`
- Define `IReview` interface and `reviewSchema`.
- Compound unique index: `{ userId: 1, productId: 1 }`.
- Regular indexes on `productId + status` (for fast product review queries) and `status` (for admin moderation list).
- Static method `updateProductAggregateRating(productId)`:
  - Aggregates approved reviews for the product: `{ $avg: "$rating", $sum: 1 }`.
  - Updates `Product.rating` and `Product.reviews` fields (keep these two fields on Product, just compute them from reviews now instead of manual input).
- Post-save hook: after `save()`, if status is `"approved"`, call `updateProductAggregateRating`.
- Post-remove hook: after `deleteOne()`, call `updateProductAggregateRating`.

### 2.2 Validators — `server/src/validators/review.validator.ts`
New file with Zod schemas:
- `createReviewSchema`: `{ productId: string, rating: z.number().int().min(1).max(5), comment: z.string().max(2000).optional() }`
- `updateReviewSchema`: same fields, all optional (partial).
- `reviewIdParamSchema`: `{ id: string }` — validates ObjectId format.
- `productReviewsQuerySchema`: `{ page?: number, limit?: number, sort?: string }` — pagination + sorting.

### 2.3 Multer Extension — `server/src/config/multer.ts`
- Add a second multer instance `uploadMultipleImages(maxCount = 3)` for review images, using the same `memoryStorage` + `fileFilter` + `validateMagicBytes`.
- Add a helper `generateReviewImageFilename()` following the existing pattern: `review-${Date.now()}-${random}.${ext}`.

### 2.4 Review Controller — `server/src/controllers/review.controller.ts`
New file with the following actions:

| Action | Auth | Logic |
|--------|------|-------|
| `createReview` | `authenticateUser` | Validate body, check user purchased product (order with `status: "paid"` exists with this product), check no existing review, create with `status: "pending"`, handle optional image uploads |
| `getProductReviews` | none (public) | Paginate approved reviews for a product, populate user name, include images |
| `getMyReviews` | `authenticateUser` | All reviews by current user (all statuses) |
| `updateReview` | `authenticateUser` | Verify ownership, allow edit of rating/comment, re-set status to `"pending"` if was approved, handle image uploads (replace all) |
| `deleteReview` | `authenticateUser` | Verify ownership, delete |
| `approveReview` (admin) | `authenticateAdmin` | Set status → `"approved"`, `isVerifiedPurchase: true`, trigger aggregate update |
| `rejectReview` (admin) | `authenticateAdmin` | Set status → `"rejected"`, trigger aggregate update |
| `getPendingReviews` (admin) | `authenticateAdmin` | Paginate pending reviews for moderation queue |

### 2.5 Review Routes — `server/src/routes/review.routes.ts`
New file mounted at `/api/reviews` in `app.ts`:

```
POST   /api/reviews                              → createReview
GET    /api/products/:productId/reviews          → getProductReviews
GET    /api/reviews/me                           → getMyReviews
PATCH  /api/reviews/:id                          → updateReview
DELETE /api/reviews/:id                          → deleteReview
```

Admin routes mounted at `/api/admin/reviews`:

```
GET    /api/admin/reviews/pending                 → getPendingReviews
PATCH  /api/admin/reviews/:id/approve             → approveReview
PATCH  /api/admin/reviews/:id/reject              → rejectReview
GET    /api/admin/reviews                         → getAllReviews (optional: filter by status/product)
```

### 2.6 Route Registration — `server/src/app.ts`
- Import `reviewRoutes` and `adminReviewRoutes`.
- Mount `reviewRoutes` at `/api/reviews` with `apiLimiter`.
- Mount `adminReviewRoutes` at `/api/admin/reviews` with `adminRateLimiter`.

### 2.7 Product Aggregate Update (Caching)
- After aggregate rating changes, delete the Redis cache key for the product (`product:${productId}`) to force recalculation on next fetch. Follow existing pattern from product controller.

---

## 3. Frontend Implementation (Customer — `payment_front`)

### 3.1 API Client — `shared/utils/api.js`
Add functions:
- `createReview(productId, data, images?)` — POST multipart for image upload.
- `getProductReviews(productId, page, limit)` — GET.
- `getMyReviews()` — GET.
- `updateReview(reviewId, data)` — PATCH.
- `deleteReview(reviewId)` — DELETE.

Follow the existing pattern: use `FormData` when images are present, `JSON.stringify` otherwise.

### 3.2 Review Components — new `features/reviews/` directory

**`features/reviews/components/ReviewForm.jsx`**
- Props: `productId`, `orderId` (optional, pre-fills purchase verification), existing review (for edit mode).
- Star rating selector (1–5, interactive hover + click).
- Textarea for comment (optional, max 2000 chars).
- Image upload: drag-and-drop or file picker, max 3, preview thumbnails with remove button.
- Submit button → calls `createReview` or `updateReview`.
- Shows loading/success/error states.

**`features/reviews/components/ReviewList.jsx`**
- Props: `productId`, `userId` (to highlight own reviews).
- Fetches `getProductReviews(productId, page, limit)`.
- Renders: overall average rating (big stars + count), paginated list of review cards.
- Each card: user name, star rating, comment text, review images (click to enlarge), date, `Verified Purchase` badge if applicable.
- Edit/Delete buttons only on own reviews.

**`features/reviews/components/ReviewSummary.jsx`**
- Compact component showing average rating + total count — reusable on ProductCard and ProductDetails.

### 3.3 Product Details Page — `features/products/pages/ProductDetailsPage.jsx`
- Add `<ReviewSummary productId={product._id} />` near the product title/price.
- Add `<ReviewList productId={product._id} userId={user?.id} />` below the product description.
- Conditionally show `<ReviewForm productId={product._id} />` if user is logged in and has purchased the product.
- If user has already reviewed, show edit mode in ReviewForm.
- If user hasn't purchased, show "Purchase this product to leave a review" message.

### 3.4 Purchase Verification Logic
- On ProductDetailsPage load, fetch user's orders and check if any contain the current product with `status: "paid"`.
- Cache this check (it's lightweight — orders are already fetched in dashboard).
- Show/hide review form based on result.

### 3.5 AuthContext Integration
- Ensure `user` object from `AuthContext` is available in ProductDetailsPage (it already is via `ProtectedRoute` pattern, but ProductDetailsPage is public — check if user is optionally logged in).
- ReviewForm should gracefully handle both authenticated and unauthenticated states.

---

## 4. Frontend Implementation (Admin — `admin_front`)

### 4.1 API Client — `admin/services/api.js`
Add methods to `ApiService` class:
- `getPendingReviews(page, limit)` → `GET /api/admin/reviews/pending`
- `approveReview(id)` → `PATCH /api/admin/reviews/:id/approve`
- `rejectReview(id)` → `PATCH /api/admin/reviews/:id/reject`
- `getAllReviews(filters)` → `GET /api/admin/reviews`

### 4.2 Admin Review Moderation Page — `admin/pages/AdminReviewsPage.jsx`
- Route: `/admin/reviews`.
- Two sections:
  1. **Pending Reviews** (default): table with product, user, rating, comment preview, images, Approve/Reject actions.
  2. **All Reviews**: filterable by status (pending/approved/rejected), search by product name or user.
- Pagination on both tables.
- Toast notifications on approve/reject actions.

### 4.3 Admin Route — `admin/App.jsx`
- Add `<Route path="/admin/reviews" element={<AdminReviewsPage />} />` inside the admin layout.
- Add "Reviews" to sidebar navigation (between Returns and Payments).

---

## 5. Database Migration

### 5.1 Product Model Migration
- Remove `rating` and `reviews` fields from `IProduct` interface and `productSchema`.
- These fields remain in existing MongoDB documents but are no longer populated or used directly.
- New documents will not have these fields — they'll be populated by the review aggregate update.
- **Important**: Existing seed data has hardcoded `rating` and `reviews`. These should be cleared or ignored since there are no real reviews yet.

### 5.2 New Collection
- `reviews` collection created automatically by Mongoose on first write.

---

## 6. Order Model Consideration

The Order model already has a `returnRequested` boolean flag. A similar pattern could be used for `hasUserReviewed` to prevent users from even seeing the review form if they've already reviewed. However, the compound unique index on `{ userId, productId }` in the Review model already enforces one review per product, so this flag is **not strictly necessary**. It can be added later as an optimization if needed.

---

## 7. File Structure Summary

```
server/
├── models/
│   └── review.model.ts                        [NEW]
├── validators/
│   └── review.validator.ts                    [NEW]
├── controllers/
│   └── review.controller.ts                   [NEW]
├── routes/
│   └── review.routes.ts                       [NEW]
├── admin/
│   ├── controllers/
│   │   └── admin-review.controller.ts         [NEW]
│   ├── routes/
│   │   └── admin-review.routes.ts             [NEW]
│   └── pages/                                 (handled in admin_front)
├── config/
│   └── multer.ts                              [EDIT — add uploadMultipleImages + generateReviewImageFilename]
├── app.ts                                     [EDIT — mount review routes]
└── models/
    └── product.model.ts                       [EDIT — remove rating/reviews fields]

client/payment_front/src/
├── shared/utils/api.js                        [EDIT — add review API functions]
├── features/reviews/
│   ├── components/
│   │   ├── ReviewForm.jsx                     [NEW]
│   │   ├── ReviewList.jsx                     [NEW]
│   │   └── ReviewSummary.jsx                  [NEW]
└── features/products/
    └── pages/ProductDetailsPage.jsx            [EDIT — integrate reviews]

client/admin_front/src/
├── services/api.js                            [EDIT — add review admin API methods]
└── admin/pages/
    └── AdminReviewsPage.jsx                    [NEW]
```

---

## 8. Implementation Order (Execution Sequence)

1. **Backend — Model + Validators**: `review.model.ts`, `review.validator.ts`, multer extension.
2. **Backend — Controller + Routes**: `review.controller.ts`, `review.routes.ts`, admin review controller/routes.
3. **Backend — App Registration**: Mount routes in `app.ts`, edit `product.model.ts`.
4. **Frontend (Customer) — API + Components**: API functions, ReviewForm, ReviewList, ReviewSummary.
5. **Frontend (Customer) — Integration**: Update ProductDetailsPage.
6. **Frontend (Admin) — API + Page**: Admin API methods, AdminReviewsPage, sidebar nav.
7. **Testing**: End-to-end flow: create order → submit review → admin approves → aggregate rating visible.

---

## 9. Risks & Open Questions

| Risk | Mitigation |
|------|-----------|
| Guest users (no account) can't review | Out of scope for v1 — only authenticated users. Can add guest review token later. |
| Image storage on server disk | Existing pattern already uses local disk for uploads. For production, replace with S3/R2. |
| Aggregate computation N+1 on product list | Use Redis caching with 60s TTL (already in place). Invalidation on review status change. |
| Spam/low-quality reviews | Moderation queue (pending → approved) handles this. Add rate limiting on review creation if needed. |
| Bulk import of existing seed data ratings | No migration needed — seed data is hardcoded demo data. Real ratings come from user reviews. |

---

## 10. Validation Plan

- **Unit**: Review model hooks (aggregate update on save/delete), validators (rating bounds, ObjectId checks).
- **Integration**: POST `/api/reviews` with/without images, GET `/api/products/:id/reviews`, admin approve/reject flow.
- **E2E**: Place order as user → submit review → log in as admin → approve → verify rating appears on product page.
- **Caching**: Verify product cache invalidates after review approval.
