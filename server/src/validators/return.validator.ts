import { z } from "zod";

export const createReturnSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  reason: z.enum([
    "defective",
    "damaged_in_shipping",
    "wrong_item",
    "not_as_described",
    "no_longer_needed",
    "size_issue",
    "other",
  ]),
  description: z.string().max(1000, "Description must be 1000 characters or less").optional(),
});

export const returnIdParamSchema = z.object({
  id: z.string().min(1, "Return ID is required"),
});

export const reviewReturnSchema = z.object({
  adminNotes: z.string().max(1000, "Admin notes must be 1000 characters or less"),
});

export const refundReturnSchema = z.object({
  refundAmount: z.number().positive("Refund amount must be a positive number").max(999999.99, "Refund amount exceeds maximum").optional(),
});
