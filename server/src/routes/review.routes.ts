import { Router } from "express";
import { attachUserIfAuthenticated, authenticateUser } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import {
  createReviewSchema,
  updateReviewSchema,
  reviewIdParamSchema,
  productReviewsQuerySchema,
} from "../validators/review.validator.js";
import { uploadMultipleImages } from "../config/multer.js";
import {
  createReview,
  getProductReviews,
  getMyReviews,
  updateReview,
  deleteReview,
  hasUserReviewedProduct,
  canUserReviewProduct,
} from "../controllers/review.controller.js";

const router = Router();

router.post(
  "/",
  authenticateUser,
  uploadMultipleImages(3),
  validate(createReviewSchema),
  createReview,
);

router.get(
  "/me",
  authenticateUser,
  getMyReviews,
);

router.get(
  "/product/:productId/can-review",
  authenticateUser,
  canUserReviewProduct,
);

router.get(
  "/product/:productId/exists",
  authenticateUser,
  hasUserReviewedProduct,
);

router.patch(
  "/:id",
  authenticateUser,
  uploadMultipleImages(3),
  validate(reviewIdParamSchema, "params"),
  validate(updateReviewSchema),
  updateReview,
);

router.delete(
  "/:id",
  authenticateUser,
  validate(reviewIdParamSchema, "params"),
  deleteReview,
);

router.get(
  "/products/:productId/reviews",
  attachUserIfAuthenticated,
  validate(productReviewsQuerySchema, "query"),
  getProductReviews,
);

export default router;
