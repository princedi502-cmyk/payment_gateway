import { z } from "zod";

export const sendTestNotificationSchema = z.object({
  message: z.string().min(1, "message is required"),
  title: z.string().min(1, "title is required"),
  data: z.record(z.string(), z.unknown()).optional(),
});
