import redis from "../config/redis.js";
import Order from "../models/order.model.js";
import { logger } from "../config/logger.js";
import {
  getOrderNotificationJob,
  deleteOrderNotificationJob,
  rescheduleOrderNotification,
  type OrderNotificationJob,
} from "../services/order-notification.service.js";
import { OneSignalService } from "../services/onesignal.service.js";

const POLL_INTERVAL_MS = 5000;
const KEY_PATTERN = "notification:order:";
const KEY_PREFIX_LENGTH = KEY_PATTERN.length;

const MAX_RETRIES = 12;
const RETRY_DELAY_MS = 5000;

const oneSignal = new OneSignalService();

let isProcessing = false;
let intervalId: ReturnType<typeof setInterval> | null = null;

function isUserNotFoundError(errors?: string[]): boolean {
  if (!errors || errors.length === 0) return false;
  return errors.some(
    (e) =>
      /not found/i.test(e) ||
      /no user/i.test(e) ||
      /does not exist/i.test(e) ||
      /external user/i.test(e)
  );
}

async function processDueJobs(): Promise<void> {
  if (isProcessing) {
    return;
  }
  isProcessing = true;

  try {
    const keys = await redis.keys(`${KEY_PATTERN}*`);

    for (const key of keys) {
      const orderId = key.slice(KEY_PREFIX_LENGTH);
      const job: OrderNotificationJob | null = await getOrderNotificationJob(orderId);

      if (!job) {
        continue;
      }

      const scheduledAt = new Date(job.scheduledAt);
      if (scheduledAt.getTime() > Date.now()) {
        continue;
      }

      const order = await Order.findById(orderId);

      if (!order) {
        logger.warn({ orderId }, "Order not found, deleting notification job");
        await deleteOrderNotificationJob(orderId);
        continue;
      }

      if (order.notificationSent === true) {
        await deleteOrderNotificationJob(orderId);
        continue;
      }

      if (!order.userId) {
        logger.warn({ orderId }, "Order has no userId, deleting notification job");
        await deleteOrderNotificationJob(orderId);
        continue;
      }

      const retryCount = job.retryCount ?? 0;

      const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
      const result = await oneSignal.sendPushToExternalId({
        externalUserId: order.userId.toString(),
        title: "Order placed successfully",
        message: `Your order #${order.orderNumber} has been placed successfully. Total: $${order.total.toFixed(2)}. Items: ${itemCount}.`,
        data: {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
        },
      });

      if (!result.success) {
        const shouldRetry =
          isUserNotFoundError(result.errors) && retryCount < MAX_RETRIES;

        if (shouldRetry) {
          const nextScheduledAt = new Date(Date.now() + RETRY_DELAY_MS);
          logger.warn(
            { orderId, attempt: retryCount + 1, maxRetries: MAX_RETRIES, nextRetry: nextScheduledAt.toISOString(), errors: result.errors },
            "OneSignal notification failed, scheduling retry"
          );
          await rescheduleOrderNotification(orderId, nextScheduledAt);
          continue;
        }

        logger.error(
          { orderId, attempts: retryCount + 1, errors: result.errors },
          "Failed to send OneSignal notification after max retries"
        );
        await deleteOrderNotificationJob(orderId);
        continue;
      }

      await Order.findByIdAndUpdate(orderId, {
        notificationSent: true,
        notificationSentAt: new Date(),
      });
      await deleteOrderNotificationJob(orderId);
    }
  } catch (error) {
    logger.error({ err: error }, "Error processing notification jobs");
  } finally {
    isProcessing = false;
  }
}

export function startOrderNotificationWorker(): void {
  logger.info("Starting order notification worker");
  void processDueJobs();
  intervalId = setInterval(processDueJobs, POLL_INTERVAL_MS);
}

export function stopOrderNotificationWorker(): void {
  logger.info("Stopping order notification worker");
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}