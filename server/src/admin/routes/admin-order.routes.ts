import { Router } from "express";
import {
  getOrders,
  getOrder,
  updateOrderStatus,
  addOrderNote,
  getOrderHistory,
  cancelOrder,
  exportOrders,
} from "../controllers/admin-order.controller.ts";

const router = Router();

router.get("/", getOrders);
router.get("/export", exportOrders);
router.get("/:id", getOrder);
router.patch("/:id/status", updateOrderStatus);
router.post("/:id/note", addOrderNote);
router.get("/:id/history", getOrderHistory);
router.post("/:id/cancel", cancelOrder);

export default router;
