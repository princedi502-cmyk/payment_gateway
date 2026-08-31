import { Router } from "express";
import {
  createPaymentIntent,
  getPaymentStatus,
  refundPayment,
  getPaymentHistory,
  verifyPayment,
} from "../controllers/payment.controller.ts";
import { authenticateUser, authenticateAdmin } from "../middlewares/auth.middleware.ts";
import { validate } from "../middlewares/validation.middleware.ts";
import { createPaymentIntentSchema, verifyPaymentSchema, refundPaymentSchema } from "../validators/payment.validator.ts";

const router = Router();

router.post("/intent", authenticateUser, validate(createPaymentIntentSchema), createPaymentIntent);
router.get("/status/:paymentId", authenticateUser, getPaymentStatus);
router.post("/verify", authenticateUser, validate(verifyPaymentSchema), verifyPayment);
router.post("/refund/:paymentId", authenticateAdmin, validate(refundPaymentSchema), refundPayment);
router.get("/history", authenticateUser, getPaymentHistory);

export default router;