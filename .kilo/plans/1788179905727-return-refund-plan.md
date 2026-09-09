# Return & Refund System Implementation Plan

## 1. Standardized Return Policy (Industry Standard)

- **Return Window**: 15 days from the order `paidAt` date. After this window, returns are not permitted.
- **Eligibility**: Order status must be `paid`. Orders already refunded, canceled, or with an active return request are ineligible.
- **Product Condition**: Items must be unused, in original packaging, with all tags attached.
- **Return Shipping**: Customer arranges and pays for return shipping unless the item is defective/damaged.
- **Refund**: Full refund to the original payment method once the returned product is received and inspected.
- **Non-returnable**: Final sale items (if applicable), custom/personalized items, perishable goods.

## 2. Database Schema Changes

### 2.1 New `Return` Model
**File**: `server/src/models/return.model.ts`

```typescript
interface IReturn extends Document {
  orderId: Types.ObjectId;
  userId: Types.ObjectId;
  reason: ReturnReason;
  description?: string;
  image?: string;           // Uploaded image path
  status: ReturnStatus;
  adminNotes?: string;
  refundAmount?: number;    // Set when refunded
  refundPaymentIntentId?: string;
  refundedAt?: Date;
  requestedAt: Date;
  reviewedAt?: Date;
  returnedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

type ReturnReason =
  | "defective"
  | "damaged_in_shipping"
  | "wrong_item"
  | "not_as_described"
  | "no_longer_needed"
  | "size_issue"
  | "other";

type ReturnStatus =
  | "requested"
  | "approved"
  | "rejected"
  | "return_initiated"
  | "returned"
  | "refunded";
```

**Indexes**: `orderId` (unique, one return per order), `userId`, `status`, `createdAt`.

### 2.2 Order Model Updates
**File**: `server/src/models/order.model.ts`

- Add `returnRequested?: boolean` (default `false`) to prevent duplicate returns.
- Keep existing statuses (`pending`, `paid`, `failed`, `refunded`, `canceled`).
- Do NOT add new order statuses; track return state entirely in the `Return` model.

## 3. File Upload Infrastructure

### 3.1 Multer Setup
**File**: `server/src/config/multer.ts`

- Configure `multer` with `memoryStorage` for MVP.
- Destination: `server/uploads/returns/`.
- Accept: `image/jpeg`, `image/png`, `image/webp`.
- Max size: 5MB.
- Static route in `app.ts`: `app.use("/uploads", express.static("uploads"))`.

### 3.2 Image Handling
- On upload, generate a unique filename: `return-{timestamp}-{random}.ext`.
- Store relative path in `Return.image` (e.g., `returns/return-12345.jpg`).
- In production, this should be replaced with S3/Cloudinary.

## 4. Backend API Endpoints

### 4.1 Return Routes
**File**: `server/src/routes/return.routes.ts`

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | `/returns` | User | user | Create return request |
| GET | `/returns` | Admin | admin | List all returns |
| GET | `/returns/:id` | Admin | admin | Get return by ID |
| PATCH | `/returns/:id/approve` | Admin | admin | Approve return |
| PATCH | `/returns/:id/reject` | Admin | admin | Reject return |
| PATCH | `/returns/:id/return-initiated` | Admin | admin | Mark as shipped by customer |
| PATCH | `/returns/:id/returned` | Admin | admin | Mark as received |
| PATCH | `/returns/:id/refund` | Admin | admin | Process refund |

### 4.2 Return Request Controller
**File**: `server/src/controllers/return.controller.ts`

**`createReturnRequest`**:
1. Validate input with Zod: `orderId` (required), `reason` (required, enum), `description` (optional string), `image` (required file via multer).
2. Load order, verify ownership and status is `paid`.
3. Verify `paidAt` + 15 days > now (15-day window check).
4. Verify no existing return for this order.
5. Upload image if provided.
6. Create `Return` with status `requested`.
7. Set `order.returnRequested = true`.
8. Send OneSignal notification to user: "Return request received for order #XXX".
9. Return the return object.

**`approveReturn`**:
1. Load return, verify status is `requested`.
2. Update status to `approved`, set `reviewedAt`.
3. Send OneSignal: "Your return for order #XXX has been approved. Please ship the item back."
4. Return updated return.

**`rejectReturn`**:
1. Load return, verify status is `requested`.
2. Update status to `rejected`, set `adminNotes` (required in body), `reviewedAt`.
3. Set `order.returnRequested = false`.
4. Send OneSignal: "Your return for order #XXX has been rejected. Reason: {adminNotes}."
5. Return updated return.

**`markReturnInitiated`**:
1. Update status to `return_initiated`.
2. Optional: set estimated delivery date.

**`markReturned`**:
1. Update status to `returned`, set `returnedAt`.
2. Trigger refund API call (see Section 6).
3. Send OneSignal: "We received your returned item for order #XXX. Refund is being processed."

**`processRefund`**:
1. Verify status is `returned`.
2. Call Stripe refund API using `order.paymentIntentId` and `return.refundAmount` (defaults to `order.total`).
3. On success: update status to `refunded`, set `refundedAt`, `refundPaymentIntentId`, `refundAmount`.
4. Update order status to `refunded` via webhook or directly.
5. Send OneSignal: "Refund of $XXX for order #XXX has been processed. It will appear in 5-10 business days."

## 5. Validation Schemas

**File**: `server/src/validators/return.validator.ts`

```typescript
export const createReturnSchema = z.object({
  orderId: z.string().min(1),
  reason: z.enum(["defective", "damaged_in_shipping", "wrong_item", "not_as_described", "no_longer_needed", "size_issue", "other"]),
  description: z.string().max(1000).optional(),
});

export const returnIdParamSchema = z.object({
  id: z.string().min(1),
});

export const reviewReturnSchema = z.object({
  adminNotes: z.string().max(1000),
});
```

## 6. Refund API Integration (Future Separate App)

### 6.1 Internal Refund Service
**File**: `server/src/services/refund.service.ts`

```typescript
export async function processReturnRefund(returnId: string, orderId: string): Promise<void> {
  // 1. Fetch return and order from DB
  // 2. Call internal refund API endpoint (currently same app, future: separate microservice)
  //    POST /api/returns/internal/refund with { returnId, orderId, amount }
  // 3. Or call Stripe directly and update status
}
```

### 6.2 Separate App Hook
Create an internal-only endpoint that the future refund app can call:

**File**: `server/src/routes/internal.routes.ts`

- `POST /internal/refund` — accepts `returnId`, `orderId`, `amount`.
- Verifies internal API key (`INTERNAL_API_KEY` env var).
- Processes refund and updates statuses.

This keeps the contract clean so the future app only needs to call one endpoint.

## 7. OneSignal Notification Schedule

| Event | Title | Message |
|-------|-------|---------|
| Return submitted | "Return Request Received" | "Your return request for order #XXX has been received. We will review it within 24 hours." |
| Return approved | "Return Approved" | "Your return for order #XXX has been approved. Please ship the item back using the provided label." |
| Return rejected | "Return Rejected" | "Your return for order #XXX has been rejected. Reason: {adminNotes}" |
| Return initiated | "Return Label Sent" | "Your return shipping label for order #XXX is ready." |
| Return received | "Item Received" | "We received your returned item for order #XXX. Refund is being processed." |
| Refund processed | "Refund Processed" | "Your refund of $XXX for order #XXX has been processed and will appear in 5-10 business days." |

## 8. Frontend Changes

### 8.1 New Page: Return Request Page
**File**: `client/payment_front/src/features/returns/pages/ReturnRequestPage.jsx`

- Route: `/dashboard/orders/:orderId/return`
- Requires authenticated user.
- Form fields:
  - Reason (dropdown, required)
  - Image upload (file input, required, preview shown)
  - Description (textarea, optional, max 1000 chars)
- On submit: `POST /api/returns` with `multipart/form-data`.
- Redirect to order detail with success message.

### 8.2 Update Order Detail Page
**File**: `client/payment_front/src/features/dashboard/pages/OrderDetailPage.jsx`

- Show "Return Product" button if:
  - Order status is `paid`
  - `order.paidAt` is within 15 days
  - `order.returnRequested` is false
- Link to `/dashboard/orders/:id/return`.
- Show return status badge if return exists.

### 8.3 New API Functions
**File**: `client/payment_front/src/shared/utils/api.js`

```javascript
export async function createReturnRequest(orderId, formData) {
  const res = await fetch(`${API_BASE}/returns`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData, // multipart/form-data
  });
  if (!res.ok) throw new Error((await res.json()).message);
  return res.json();
}
```

### 8.4 Admin Returns Page (Optional but Recommended)
**File**: `client/payment_front/src/features/admin/pages/AdminReturnsPage.jsx`

- Table of all returns with status filters.
- Actions: Approve, Reject, Mark Returned, Process Refund.
- Admin notes modal for rejections.

## 9. Implementation Order

1. **Backend Model & Config** — Return model, multer config, uploads directory.
2. **Backend Service** — Refund service stub.
3. **Backend Validators & Middleware** — Return schemas, multer middleware.
4. **Backend Routes & Controllers** — All return endpoints.
5. **Notification Integration** — OneSignal messages in controller.
6. **Internal API Route** — `/internal/refund` for future app.
7. **Frontend API Utils** — New functions in `api.js`.
8. **Frontend Return Request Page** — Form with upload.
9. **Frontend Order Detail Updates** — Return button and status display.
10. **Testing** — End-to-end flow: submit → approve → mark returned → refund.

## 10. Migration & Edge Cases

- **Existing orders**: No migration needed; `returnRequested` defaults to `false`.
- **Duplicate returns**: Enforced by unique index on `Return.orderId` and `order.returnRequested` flag.
- **Expired window**: Reject at controller level with 403.
- **Image cleanup**: Add a cleanup job for images when a return is deleted (if needed later).
- **Concurrent refunds**: Check `return.status === "returned"` before processing refund.

## 11. Files to Create/Modify

### Create
- `server/src/models/return.model.ts`
- `server/src/config/multer.ts`
- `server/src/services/refund.service.ts`
- `server/src/validators/return.validator.ts`
- `server/src/routes/return.routes.ts`
- `server/src/routes/internal.routes.ts`
- `server/src/controllers/return.controller.ts`
- `client/payment_front/src/features/returns/pages/ReturnRequestPage.jsx`

### Modify
- `server/src/models/order.model.ts` — add `returnRequested`
- `server/src/app.ts` — add multer, static uploads, return routes, internal routes
- `server/src/routes/order.routes.ts` — (no change needed, returns are separate)
- `client/payment_front/src/shared/utils/api.js` — add return API functions
- `client/payment_front/src/features/dashboard/pages/OrderDetailPage.jsx` — add return button/status
- `client/payment_front/src/App.jsx` — add return route
