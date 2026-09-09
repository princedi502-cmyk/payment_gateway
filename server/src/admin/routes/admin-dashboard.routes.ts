import { Router } from "express";
import {
  getStats,
  getRecentOrders,
  getRecentUsers,
  getSalesChart,
  getAlerts,
} from "../controllers/admin-dashboard.controller.ts";

const router = Router();

router.get("/stats", getStats);
router.get("/recent-orders", getRecentOrders);
router.get("/recent-users", getRecentUsers);
router.get("/sales-chart", getSalesChart);
router.get("/alerts", getAlerts);

export default router;
