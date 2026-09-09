import redis from "../config/redis.js";

export interface OrderNotificationJob {
  orderId: string;
  userId: string;
  scheduledAt: string;
  retryCount: number;
}

const KEY_PREFIX = "notification:order:";

export async function scheduleOrderNotification(
  orderId: string,
  userId: string,
  scheduledAt: Date
): Promise<"OK"> {
  const job: OrderNotificationJob = {
    orderId,
    userId,
    scheduledAt: scheduledAt.toISOString(),
    retryCount: 0,
  };
  await redis.set(`${KEY_PREFIX}${orderId}`, JSON.stringify(job));
  return "OK";
}

export async function getOrderNotificationJob(
  orderId: string
): Promise<OrderNotificationJob | null> {
  const value = await redis.get(`${KEY_PREFIX}${orderId}`);
  if (value === null) {
    return null;
  }
  return JSON.parse(value) as OrderNotificationJob;
}

export async function deleteOrderNotificationJob(orderId: string): Promise<number> {
  return redis.del(`${KEY_PREFIX}${orderId}`);
}

export async function rescheduleOrderNotification(
  orderId: string,
  scheduledAt: Date
): Promise<"OK"> {
  const job = await getOrderNotificationJob(orderId);
  if (!job) {
    return "OK";
  }
  const updatedJob: OrderNotificationJob = {
    ...job,
    scheduledAt: scheduledAt.toISOString(),
    retryCount: job.retryCount + 1,
  };
  await redis.set(`${KEY_PREFIX}${orderId}`, JSON.stringify(updatedJob));
  return "OK";
}
