import { Router } from "express"
import { z } from "zod"
import { validate } from "../middlewares/validation.middleware.ts"
import { authenticateUser } from "../middlewares/auth.middleware.ts"
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlist,
} from "../controllers/wishlist.controller.ts"

const router = Router()

const productIdParam = z.object({
  productId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid product ID"),
})

router.use(authenticateUser)

router.get("/", getWishlist)

router.post(
  "/:productId",
  validate(productIdParam, "params"),
  addToWishlist
)

router.delete(
  "/:productId",
  validate(productIdParam, "params"),
  removeFromWishlist
)

router.get(
  "/check/:productId",
  validate(productIdParam, "params"),
  checkWishlist
)

export default router
