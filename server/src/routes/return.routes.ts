import { Router } from "express";
import {
  createReturnRequest,
  getAllReturns,
  getReturnById,
  approveReturn,
  rejectReturn,
  markReturnInitiated,
  markReturned,
  processRefund,
} from "../controllers/return.controller.js";
import { authenticateUser, authenticateAdmin } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import { createReturnSchema, returnIdParamSchema, reviewReturnSchema, refundReturnSchema } from "../validators/return.validator.js";
import { uploadSingleImage } from "../config/multer.js";

const router = Router();

router.post(
  "/",
  authenticateUser,
  uploadSingleImage,
  validate(createReturnSchema),
  createReturnRequest,
);

router.get("/", authenticateAdmin, getAllReturns);

router.get(
  "/:id",
  authenticateAdmin,
  validate(returnIdParamSchema, "params"),
  getReturnById,
);

router.patch(
  "/:id/approve",
  authenticateAdmin,
  validate(returnIdParamSchema, "params"),
  approveReturn,
);

router.patch(
  "/:id/reject",
  authenticateAdmin,
  validate(returnIdParamSchema, "params"),
  validate(reviewReturnSchema),
  rejectReturn,
);

router.patch(
  "/:id/return-initiated",
  authenticateAdmin,
  validate(returnIdParamSchema, "params"),
  markReturnInitiated,
);

router.patch(
  "/:id/returned",
  authenticateAdmin,
  validate(returnIdParamSchema, "params"),
  markReturned,
);

router.patch(
  "/:id/refund",
  authenticateAdmin,
  validate(returnIdParamSchema, "params"),
  validate(refundReturnSchema),
  processRefund,
);

export default router;
