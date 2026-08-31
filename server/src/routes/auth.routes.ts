import { Router } from "express"
import rateLimit from "express-rate-limit"
import { register, login, verifyEmail, forgotPassword, resetPassword, getMe } from "../controllers/auth.controller.ts"
import { googleAuth, googleCallback } from "../controllers/oauth.controller.ts"
import { authenticateUser } from "../middlewares/auth.middleware.ts"
import { validate } from "../middlewares/validation.middleware.ts"
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, verifyEmailSchema } from "../validators/auth.validator.ts"

const router = Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: "Too many attempts, please try again later" },
})

router.post("/register", authLimiter, validate(registerSchema), register)
router.post("/login", authLimiter, validate(loginSchema), login)
router.get("/verify-email", validate(verifyEmailSchema, "query"), verifyEmail)
router.post("/forgot-password", authLimiter, validate(forgotPasswordSchema), forgotPassword)
router.post("/reset-password", authLimiter, validate(resetPasswordSchema), resetPassword)
router.get("/me", authenticateUser, getMe)

router.get("/google", googleAuth)
router.get("/google/callback", googleCallback)

export default router
