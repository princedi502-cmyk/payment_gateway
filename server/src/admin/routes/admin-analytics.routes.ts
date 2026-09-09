import { Router } from "express";
import {
  getRevenueAnalyticsController,
  getOrderAnalyticsController,
  getUserAnalyticsController,
  getProductAnalyticsController,
  exportAnalytics,
} from "../controllers/admin-analytics.controller.ts";

const router = Router();

router.get("/revenue", getRevenueAnalyticsController);
router.get("/orders", getOrderAnalyticsController);
router.get("/users", getUserAnalyticsController);
router.get("/products", getProductAnalyticsController);
router.get("/export", exportAnalytics);

export default router;
