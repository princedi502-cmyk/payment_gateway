import { Router } from "express";
import { createCheckoutSession } from "../controllers/checkout.controller.ts";
import { authenticateUser } from "../middlewares/auth.middleware.ts";
import { validate } from "../middlewares/validation.middleware.ts";
import { createCheckoutSessionSchema } from "../validators/checkout.validator.ts";

const router = Router();

router.post("/", authenticateUser, validate(createCheckoutSessionSchema), createCheckoutSession);

export default router;
