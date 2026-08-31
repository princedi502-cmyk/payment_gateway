import { z } from "zod"

export const orderItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
})

export const shippingAddressSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(100),
  email: z.string().email("Invalid email address").max(255),
  phone: z.string().min(1, "Phone number is required").max(20),
  address: z.string().min(1, "Address is required").max(255),
  city: z.string().min(1, "City is required").max(100),
  state: z.string().min(1, "State is required").max(100),
  zipCode: z.string().min(1, "ZIP code is required").max(20),
})

export const contactInfoSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(100),
  email: z.string().email("Invalid email address").max(255),
  phone: z.string().min(1, "Phone number is required").max(20),
})

export const createCheckoutSessionSchema = z.object({
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
  shippingAddress: shippingAddressSchema,
  contactInfo: contactInfoSchema.optional(),
  selectedAddressId: z.string().optional(),
})
