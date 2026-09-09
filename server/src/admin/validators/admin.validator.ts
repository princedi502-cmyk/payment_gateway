import { z } from "zod";

export const adminProductSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  price: z.number().positive("Price must be positive"),
  category: z.string().optional(),
  categoryId: z.string().optional(),
  sku: z.string().optional(),
  stock: z.number().int().min(0).optional(),
  image: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  reviews: z.number().int().min(0).optional(),
});

export const adminProductUpdateSchema = adminProductSchema.partial();

export const adminOrderIdSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid order ID"),
});

export const adminOrderStatusSchema = z.object({
  status: z.enum(["pending", "paid", "failed", "refunded", "canceled"]),
  note: z.string().optional(),
});

export const adminOrderNoteSchema = z.object({
  note: z.string().max(2000, "Note must be less than 2000 characters"),
});

export const adminUserIdSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid user ID"),
});

export const adminUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export const adminUserRoleSchema = z.object({
  role: z.enum(["user", "admin"]),
});

export const adminSettingsSchema = z.array(
  z.object({
    key: z.string().min(1),
    value: z.any(),
  })
);

export const adminNotificationTemplateSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["email", "push"]),
  subject: z.string().optional(),
  content: z.string().min(1),
  variables: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const adminReturnRefundSchema = z.object({
  amount: z.number().positive().optional(),
});

export const adminPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const adminProductFilterSchema = adminPaginationSchema.extend({
  category: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

export const adminOrderFilterSchema = adminPaginationSchema.extend({
  status: z.enum(["pending", "paid", "failed", "refunded", "canceled"]).optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const adminUserFilterSchema = adminPaginationSchema.extend({
  role: z.enum(["user", "admin"]).optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().optional(),
});
