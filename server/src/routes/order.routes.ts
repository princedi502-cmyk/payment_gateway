import { Router } from "express";
import { createOrder, getOrderById, getUserOrders } from "../controllers/order.controller.ts";
import { authenticateUser } from "../middlewares/auth.middleware.ts";
import { validate } from "../middlewares/validation.middleware.ts";
import { createOrderSchema, orderIdParamSchema } from "../validators/order.validator.ts";

const router = Router();

router.post("/", authenticateUser, validate(createOrderSchema), createOrder);
router.get("/:orderId", authenticateUser, validate(orderIdParamSchema, "params"), getOrderById);
router.get("/", authenticateUser, getUserOrders);

export default router;
