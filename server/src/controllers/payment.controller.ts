import mongoose from "mongoose";
import { type Request, type Response, type NextFunction } from "express";
import Order from "../models/order.model.ts";
import { sendReceipt } from "../services/mail.service.ts";
import { stripe } from "../config/stripe.ts";

export const createPaymentIntent = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { orderId } = req.body;
    const userId = (req as any).userId;

    if (!orderId) {
      res.status(400).json({
        success: false,
        message: "orderId is required",
      });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      res.status(400).json({
        success: false,
        message: "Invalid orderId",
      });
      return;
    }

    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({
        success: false,
        message: "Order not found",
      });
      return;
    }

    if (order.userId && order.userId.toString() !== userId) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to make a payment for this order",
      });
      return;
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
      res.status(400).json({
        success: false,
        message: "paymentId is required",
      });
      return;
    }
    const paymentId = rawPaymentId;
    const userId = (req as any).userId;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentId);

    const orderId = paymentIntent.metadata?.orderId;
    if (!orderId) {
      res.status(403).json({
        success: false,
        message: "Payment has no associated order",
      });
      return;
    }

    const order = await Order.findById(orderId);
    if (!order || (order.userId && order.userId.toString() !== userId)) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to view this payment",
      });
      return;
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
      res.status(400).json({
        success: false,
        message: "paymentId is required",
      });
      return;
    }
    const paymentId = rawPaymentId;
    const { amount } = req.body;
    const userId = (req as any).userId;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentId);

    const orderId = paymentIntent.metadata?.orderId;
    if (!orderId) {
      res.status(403).json({
        success: false,
        message: "Payment has no associated order",
      });
      return;
    }

    const order = await Order.findById(orderId);
    if (!order || (order.userId && order.userId.toString() !== userId)) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to refund this payment",
      });
      return;
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
      res.status(400).json({
        success: false,
        message: "paymentIntentId is required",
      });
      return;
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === "succeeded") {
      const orderId = paymentIntent.metadata?.orderId;

      if (!orderId) {
        res.status(403).json({
          success: false,
          message: "Payment has no associated order",
        });
        return;
      }

      const order = await Order.findById(orderId);
      if (!order || (order.userId && order.userId.toString() !== userId)) {
        res.status(403).json({
          success: false,
          message: "You do not have permission to verify this payment",
        });
        return;
      }

      await Order.findByIdAndUpdate(orderId, {
        status: "paid",
        paymentIntentId: paymentIntent.id,
        paidAt: new Date(),
      });

      if (order && !order.receiptSent) {
        await Order.findByIdAndUpdate(orderId, { receiptSent: true });
        sendReceipt(order).catch((err: Error) =>
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
