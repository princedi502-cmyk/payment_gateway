import { Router } from "express";
import { validate } from "../../middlewares/validation.middleware.js";
import { reviewIdParamSchema } from "../../validators/review.validator.js";
import {
  getPendingReviews,
  getAllReviews,
  getReviewById,
  approveReview,
  rejectReview,
  deleteReview,
  getReviewStats,
} from "../controllers/admin-review.controller.ts";

const router = Router();

router.get("/pending", getPendingReviews);

router.get("/stats", getReviewStats);

router.get("/", getAllReviews);

router.get("/:id", validate(reviewIdParamSchema, "params"), getReviewById);

router.patch("/:id/approve", validate(reviewIdParamSchema, "params"), approveReview);

router.patch("/:id/reject", validate(reviewIdParamSchema, "params"), rejectReview);

router.delete("/:id", validate(reviewIdParamSchema, "params"), deleteReview);

export default router;
