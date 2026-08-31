import { z } from "zod"

export const addressSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(100),
  email: z.string().email("Invalid email address").max(255),
  phone: z.string().min(1, "Phone number is required").max(20),
  address: z.string().min(1, "Address is required").max(255),
  city: z.string().min(1, "City is required").max(100),
  state: z.string().min(1, "State is required").max(100),
  zipCode: z.string().min(1, "ZIP code is required").max(20),
  isDefault: z.boolean().optional(),
})

export const updateAddressSchema = addressSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field is required" }
)

export const addressIdParamSchema = z.object({
  addressId: z.string().min(1, "Address ID is required"),
})
