import { z } from "zod";

export const createPaymentIntentSchema = z.object({
  orderId: z.string().min(1, "orderId is required"),
});

export const verifyPaymentSchema = z.object({
  paymentIntentId: z.string().min(1, "Payment Intent ID is required"),
});

export const refundPaymentSchema = z.object({
  amount: z.number().positive("Refund amount must be greater than 0").optional(),
});
