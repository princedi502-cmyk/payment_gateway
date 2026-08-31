import { type Request, type Response, type NextFunction } from "express";
import Order from "../models/order.model.ts";
import WebhookEvent from "../models/webhookEvent.model.ts";
import { sendReceipt } from "../services/mail.service.ts";
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

    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata?.orderId;

        if (orderId) {
          const order = await Order.findByIdAndUpdate(
            orderId,
            { status: "paid", paymentIntentId: paymentIntent.id, paidAt: new Date() },
            { new: true }
          );

          if (order && !order.receiptSent) {
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
          });
        }
        break;
      }

      case "payment_intent.canceled": {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata?.orderId;

        if (orderId) {
          await Order.findByIdAndUpdate(orderId, { status: "canceled" });
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object;
        const orderId = charge.metadata?.orderId;

        if (orderId) {
          await Order.findByIdAndUpdate(orderId, { status: "refunded" });
        }
        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    await WebhookEvent.create({
      eventId: event.id,
      type: event.type,
      processedAt: new Date(),
    });

    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
};
