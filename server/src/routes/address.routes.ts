import { Router } from "express"
import { authenticateUser } from "../middlewares/auth.middleware.ts"
import { getAddresses, addAddress, updateAddress, deleteAddress } from "../controllers/address.controller.ts"
import { validate } from "../middlewares/validation.middleware.ts"
import { addressSchema, updateAddressSchema, addressIdParamSchema } from "../validators/address.validator.ts"

const router = Router()

router.get("/", authenticateUser, getAddresses)
router.post("/", authenticateUser, validate(addressSchema), addAddress)
router.put("/:addressId", authenticateUser, validate(updateAddressSchema), updateAddress)
router.delete("/:addressId", authenticateUser, deleteAddress)

export default router
