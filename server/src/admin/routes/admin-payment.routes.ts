import { Router } from "express";
import {
  getPayments,
  getPayment,
  processRefund,
  getPaymentStats,
} from "../controllers/admin-payment.controller.ts";

const router = Router();

router.get("/", getPayments);
router.get("/stats", getPaymentStats);
router.get("/:id", getPayment);
router.post("/:id/refund", processRefund);

export default router;
