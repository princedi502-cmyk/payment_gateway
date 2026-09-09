import { type Request, type Response, type NextFunction } from "express";
import mongoose from "mongoose";
import { stripe } from "../../config/stripe.ts";
import Order from "../../models/order.model.ts";
import { logAdminAction } from "../services/admin-log.service.ts";
import type { AdminRequest } from "../../middleware/admin-auth.middleware.ts";
import { getQueryParam, getQueryParamAsInt, getRouteParam } from "../utils/query-helpers.ts";

export const getPayments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const q = req.query as Record<string, any>;
    const page = getQueryParamAsInt(q, "page", 1);
    const limit = getQueryParamAsInt(q, "limit", 20);
    const status = getQueryParam(q, "status");

    const query: Record<string, any> = {
      paymentIntentId: { $exists: true, $ne: null },
    };
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate("userId", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: orders,
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

export const getPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = getRouteParam(req.params as Record<string, string>, "id");

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid payment ID" });
      return;
    }

    const order = await Order.findById(id).populate("userId", "name email");

    if (!order) {
      res.status(404).json({ success: false, message: "Payment not found" });
      return;
    }

    let stripePaymentIntent = null;
    if (order.paymentIntentId) {
      try {
        stripePaymentIntent = await stripe.paymentIntents.retrieve(order.paymentIntentId);
      } catch {
      }
    }

    res.status(200).json({
      success: true,
      data: {
        order,
        stripe: stripePaymentIntent,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const processRefund = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminReq = req as AdminRequest;
    const id = getRouteParam(req.params as Record<string, string>, "id");
    const { amount } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid payment ID" });
      return;
    }

    const order = await Order.findById(id);
    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    if (!order.paymentIntentId) {
      res.status(400).json({ success: false, message: "No payment intent found" });
      return;
    }

    const refundParams: any = {
      payment_intent: order.paymentIntentId,
    };
    if (amount) {
      refundParams.amount = Math.round(amount * 100);
    }

    const refund = await stripe.refunds.create(refundParams);

    order.status = "refunded";
    order.statusHistory.push({
      status: "refunded",
      changedBy: new mongoose.Types.ObjectId(adminReq.adminId),
      changedAt: new Date(),
      note: `Refund processed: ${refund.id}`,
    });
    await order.save();

    await logAdminAction({
      req: adminReq,
      action: "payment.process_refund",
      entityType: "payment",
      entityId: id,
      newState: { refundId: refund.id, amount: amount || order.total },
    });

    res.status(200).json({ success: true, data: { order, refund } });
  } catch (error) {
    next(error);
  }
};

export const getPaymentStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [totalPayments, refundedPayments, grossRevenue, totalRefunds] = await Promise.all([
      Order.countDocuments({ paymentIntentId: { $exists: true, $ne: null } }),
      Order.countDocuments({ status: "refunded" }),
      Order.aggregate([
        { $match: { status: "paid" } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      Order.aggregate([
        { $match: { status: "refunded" } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalPayments,
        refundedPayments,
        grossRevenue: grossRevenue[0]?.total || 0,
        totalRefunds: totalRefunds[0]?.total || 0,
        netRevenue: (grossRevenue[0]?.total || 0) - (totalRefunds[0]?.total || 0),
      },
    });
  } catch (error) {
    next(error);
  }
};
