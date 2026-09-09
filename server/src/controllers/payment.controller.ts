import mongoose from "mongoose";
import { type Request, type Response, type NextFunction } from "express";
import Order from "../models/order.model.ts";
import { sendReceipt } from "../services/mail.service.ts";
import { scheduleOrderNotification } from "../services/order-notification.service.ts";
import { stripe } from "../config/stripe.ts";
import { BadRequestError, NotFoundError, ForbiddenError } from "../errors/AppError.ts";

export const createPaymentIntent = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { orderId } = req.body;
    const userId = (req as any).userId;

    if (!orderId) {
      throw new BadRequestError("orderId is required");
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new BadRequestError("Invalid orderId");
    }

    const order = await Order.findById(orderId);
    if (!order) {
      throw new NotFoundError("Order");
    }

    if (order.userId && order.userId.toString() !== userId) {
      throw new ForbiddenError("You do not have permission to make a payment for this order");
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.total * 100),
      currency: "usd",
      metadata: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPaymentStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { paymentId: rawPaymentId } = req.params;
    if (!rawPaymentId || Array.isArray(rawPaymentId)) {
      throw new BadRequestError("paymentId is required");
    }
    const paymentId = rawPaymentId;
    const userId = (req as any).userId;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentId);

    const orderId = paymentIntent.metadata?.orderId;
    if (!orderId) {
      throw new ForbiddenError("Payment has no associated order");
    }

    const order = await Order.findById(orderId);
    if (!order || (order.userId && order.userId.toString() !== userId)) {
      throw new ForbiddenError("You do not have permission to view this payment");
    }

    res.status(200).json({
      success: true,
      data: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refundPayment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { paymentId: rawPaymentId } = req.params;
    if (!rawPaymentId || Array.isArray(rawPaymentId)) {
      throw new BadRequestError("paymentId is required");
    }
    const paymentId = rawPaymentId;
    const { amount } = req.body;
    const userId = (req as any).userId;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentId);

    const orderId = paymentIntent.metadata?.orderId;
    if (!orderId) {
      throw new ForbiddenError("Payment has no associated order");
    }

    const order = await Order.findById(orderId);
    if (!order || (order.userId && order.userId.toString() !== userId)) {
      throw new ForbiddenError("You do not have permission to refund this payment");
    }

    if (amount && amount > order.total) {
      throw new BadRequestError(`Refund amount ($${amount}) cannot exceed order total ($${order.total})`);
    }

    const refund = await stripe.refunds.create({
      payment_intent: paymentId,
      ...(amount ? { amount: Math.round(amount * 100) } : {}),
    });

    res.status(200).json({
      success: true,
      data: {
        id: refund.id,
        paymentId,
        amount: refund.amount,
        status: refund.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPaymentHistory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = (req as any).userId;

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit as string) || 10),
    );
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("orderNumber status total paymentIntentId createdAt paidAt"),
      Order.countDocuments({ userId }),
    ]);

    res.status(200).json({
      success: true,
      data: orders.map((order) => ({
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        total: order.total,
        paymentIntentId: order.paymentIntentId,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const verifyPayment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { paymentIntentId } = req.body;
    const userId = (req as any).userId;

    if (!paymentIntentId) {
      throw new BadRequestError("paymentIntentId is required");
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === "succeeded") {
      const orderId = paymentIntent.metadata?.orderId;

      if (!orderId) {
        throw new ForbiddenError("Payment has no associated order");
      }

      const order = await Order.findById(orderId);
      if (!order || (order.userId && order.userId.toString() !== userId)) {
        throw new ForbiddenError("You do not have permission to verify this payment");
      }

      if (Math.round(order.total * 100) !== paymentIntent.amount) {
        throw new ForbiddenError("Payment amount does not match order total");
      }

      const notificationScheduledAt = new Date(Date.now() + 5 * 1000);
      const updatedOrder = await Order.findOneAndUpdate(
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
        { new: true },
      );

      if (!updatedOrder) {
        res.status(200).json({
          success: true,
          data: {
            id: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
          },
        });
        return;
      }

      if (updatedOrder.userId) {
        await scheduleOrderNotification(
          updatedOrder._id.toString(),
          updatedOrder.userId.toString(),
          notificationScheduledAt,
        );
      }

      if (!updatedOrder.receiptSent) {
        await Order.findByIdAndUpdate(orderId, { receiptSent: true });
        sendReceipt(updatedOrder).catch((err: Error) =>
          console.error("Failed to send receipt:", err),
        );
      }
    }

    res.status(200).json({
      success: true,
      data: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      },
    });
  } catch (error) {
    next(error);
  }
};