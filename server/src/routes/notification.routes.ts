import { Router } from "express";
import { sendTestNotificationSchema } from "../validators/notification.validator.ts";
import { authenticateUser } from "../middlewares/auth.middleware.ts";
import { validate } from "../middlewares/validation.middleware.ts";
import { OneSignalService } from "../services/onesignal.service.ts";

const router = Router();

const oneSignal = new OneSignalService();

router.post(
  "/test",
  authenticateUser,
  validate(sendTestNotificationSchema),
  async (req, res, next) => {
    try {
      const { title, message, data } = req.body;
      const userId = (req as any).userId;

      const result = await oneSignal.sendPushToExternalId({
        externalUserId: userId,
        title,
        message,
        data,
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Failed to send notification",
          errors: result.errors,
        });
      }

      res.status(200).json({
        success: true,
        message: "Notification sent successfully",
        data: {
          notificationId: result.id,
          externalUserId: userId,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
