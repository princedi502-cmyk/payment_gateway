# Half-Star Rating Implementation Plan

## Overview
Enable users to submit half-star ratings (e.g., 1.5, 2.5, 3.5, 4.5) by clicking on the left/right half of each star.

## Current State
- **Frontend (ReviewForm.jsx)**: Integer-only rating (1-5) via click on whole stars
- **Backend Validator**: `z.coerce.number().int().min(1).max(5)` - enforces integers
- **Backend Model**: `rating: { type: Number, min: 1, max: 5 }` - already supports decimals
- **Product Aggregate**: Already rounds to 1 decimal place (`Math.round(avgRating * 10) / 10`)

## Changes Required

### 1. Backend: Update Review Validator (`server/src/validators/review.validator.ts`)
- Remove `.int()` from rating validation to allow decimals
- Keep min: 1, max: 5
- Allow one decimal place (0.5 increments)

### 2. Frontend: Update ReviewForm.jsx Rating Input
- Replace whole-star click with half-star precision
- Each star becomes two clickable halves (left = 0.5, right = 1.0)
- Visual feedback on hover showing half-star fill
- Rating state stores float (e.g., 3.5)
- Update rating label text for half values

### 3. Frontend: Update ReviewList.jsx Display
- Render half-filled stars for display (average rating, individual reviews)
- Use CSS clip-path or overlay technique for half-star visual

### 4. Frontend: Update Rating Labels
- Add labels for half-star values (1.5, 2.5, 3.5, 4.5)
- Keep existing labels for whole stars

## Implementation Details

### Half-Star Click Logic
```
Star 1: [left=0.5] [right=1.0]
Star 2: [left=1.5] [right=2.0]
Star 3: [left=2.5] [right=3.0]
Star 4: [left=3.5] [right=4.0]
Star 5: [left=4.5] [right=5.0]
```

### Visual Approach
- Each star rendered as two half-star SVGs (or use CSS clip-path on single star)
- Hover highlights up to the hovered half
- Click sets rating to that half value

## Validation
- Backend: Allow 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0
- Frontend: Same validation before submit

## Testing Scenarios
1. Click left half of star 3 → rating = 2.5
2. Click right half of star 3 → rating = 3.0
3. Hover shows correct half-star preview
4. Display shows half-stars correctly in ReviewList
5. Backend accepts and stores half-star ratings
6. Aggregate rating calculates correctly with decimals

## Files to Modify
1. `server/src/validators/review.validator.ts` - Remove `.int()`
2. `client/payment_front/src/features/reviews/components/ReviewForm.jsx` - Half-star input
3. `client/payment_front/src/features/reviews/components/ReviewList.jsx` - Half-star display