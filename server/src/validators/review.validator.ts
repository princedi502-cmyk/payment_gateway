import { z } from "zod";

export const createReviewSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  rating: z.coerce.number().min(1).max(5).refine((val) => val * 2 === Math.floor(val * 2), { message: "Rating must be in 0.5 increments" }),
  comment: z.string().max(2000).optional(),
});

export const updateReviewSchema = z.object({
  rating: z.coerce.number().min(1).max(5).refine((val) => val * 2 === Math.floor(val * 2), { message: "Rating must be in 0.5 increments" }).optional(),
  comment: z.string().max(2000).optional(),
});

export const reviewIdParamSchema = z.object({
  id: z.string().min(1, "Review ID is required"),
});

export const productReviewsQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
  sort: z.string().optional(),
});
