import { z } from "zod"

export const orderItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
})

export const shippingAddressSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "ZIP code is required"),
})

export const contactInfoSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
})

export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
  shippingAddress: shippingAddressSchema,
  contactInfo: contactInfoSchema.optional(),
})

export const orderIdParamSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
})
