import { type Request, type Response, type NextFunction } from "express";
import Order from "../models/order.model.ts";
import WebhookEvent from "../models/webhookEvent.model.ts";
import { sendReceipt } from "../services/mail.service.ts";
import { scheduleOrderNotification } from "../services/order-notification.service.ts";
import { stripe } from "../config/stripe.ts";

export const handleStripeWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      res.status(400).json({ success: false, message: "Webhook secret not configured" });
      return;
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      res.status(400).json({ success: false, message: "Invalid signature" });
      return;
    }

    const existingEvent = await WebhookEvent.findOne({ eventId: event.id });
    if (existingEvent) {
      res.status(200).json({ received: true });
      return;
    }

    try {
      await WebhookEvent.create({
        eventId: event.id,
        type: event.type,
        processedAt: new Date(),
      });
    } catch (err: any) {
      if (err.code === 11000) {
        res.status(200).json({ received: true });
        return;
      }
      throw err;
    }

    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata?.orderId;

        if (orderId) {
          const notificationScheduledAt = new Date(Date.now() + 5 * 1000);
          const order = await Order.findOneAndUpdate(
            { _id: orderId, status: { $ne: "paid" } },
            {
              status: "paid",
              paymentIntentId: paymentIntent.id,
              paidAt: new Date(),
              notificationScheduledAt,
              notificationSent: false,
              $push: {
                statusHistory: {
                  status: "paid",
                  changedAt: new Date(),
                },
              },
            },
            { new: true }
          );

          if (!order) {
            break;
          }

          if (order.userId) {
            await scheduleOrderNotification(
              order._id.toString(),
              order.userId.toString(),
              notificationScheduledAt
            );
          } else {
            console.warn(`Order ${orderId} has no userId, skipping notification scheduling`);
          }

          if (!order.receiptSent) {
            await Order.findByIdAndUpdate(orderId, { receiptSent: true });
            sendReceipt(order).catch((err: Error) =>
              console.error("Failed to send receipt via webhook:", err)
            );
          }
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata?.orderId;

        if (orderId) {
          await Order.findByIdAndUpdate(orderId, {
            status: "failed",
            paymentIntentId: paymentIntent.id,
            $push: {
              statusHistory: {
                status: "failed",
                changedAt: new Date(),
              },
            },
          });
        }
        break;
      }

      case "payment_intent.canceled": {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata?.orderId;

        if (orderId) {
          await Order.findByIdAndUpdate(orderId, {
            status: "canceled",
            $push: {
              statusHistory: {
                status: "canceled",
                changedAt: new Date(),
              },
            },
          });
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object;
        const orderId = charge.metadata?.orderId;

        if (orderId) {
          await Order.findByIdAndUpdate(orderId, {
            status: "refunded",
            $push: {
              statusHistory: {
                status: "refunded",
                changedAt: new Date(),
              },
            },
          });
        }
        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
};
