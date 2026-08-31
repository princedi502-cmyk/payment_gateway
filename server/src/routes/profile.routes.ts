import { Router } from "express"
import { authenticateUser } from "../middlewares/auth.middleware.ts"
import { updateProfile } from "../controllers/profile.controller.ts"
import { validate } from "../middlewares/validation.middleware.ts"
import { updateProfileSchema } from "../validators/profile.validator.ts"

const router = Router()

router.put("/me", authenticateUser, validate(updateProfileSchema), updateProfile)

export default router
