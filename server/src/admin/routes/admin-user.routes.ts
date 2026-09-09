import { Router } from "express";
import {
  getUsers,
  getUser,
  getUserOrders,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  exportUsers,
} from "../controllers/admin-user.controller.ts";

const router = Router();

router.get("/", getUsers);
router.get("/export", exportUsers);
router.get("/:id", getUser);
router.get("/:id/orders", getUserOrders);
router.patch("/:id/status", updateUserStatus);
router.patch("/:id/role", updateUserRole);
router.delete("/:id", deleteUser);

export default router;
