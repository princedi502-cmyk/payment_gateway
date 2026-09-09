import { type Request, type Response, type NextFunction } from "express";
import mongoose from "mongoose";
import { Parser } from "json2csv";
import Order from "../../models/order.model.ts";
import { logAdminAction } from "../services/admin-log.service.ts";
import type { AdminRequest } from "../../middleware/admin-auth.middleware.ts";
import { getQueryParam, getQueryParamAsInt, getRouteParam } from "../utils/query-helpers.ts";

export const getOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const q = req.query as Record<string, any>;
    const page = getQueryParamAsInt(q, "page", 1);
    const limit = getQueryParamAsInt(q, "limit", 20);
    const sort = getQueryParam(q, "sort", "createdAt");
    const order = getQueryParam(q, "order", "desc");
    const status = getQueryParam(q, "status");
    const search = getQueryParam(q, "search");
    const startDate = getQueryParam(q, "startDate");
    const endDate = getQueryParam(q, "endDate");

    const query: Record<string, any> = {};

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { "shippingAddress.email": { $regex: search, $options: "i" } },
        { "shippingAddress.fullName": { $regex: search, $options: "i" } },
      ];
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    const sortOrder = order === "asc" ? 1 : -1;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate("userId", "name email")
        .sort({ [sort]: sortOrder })
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

export const getOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = getRouteParam(req.params as Record<string, string>, "id");

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid order ID" });
      return;
    }

    const order = await Order.findById(id)
      .populate("userId", "name email")
      .populate("statusHistory.changedBy", "name");

    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminReq = req as AdminRequest;
    const id = getRouteParam(req.params as Record<string, string>, "id");
    const { status, note } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid order ID" });
      return;
    }

    const order = await Order.findById(id);
    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    const previousStatus = order.status;
    order.status = status;
    order.statusHistory.push({
      status,
      changedBy: new mongoose.Types.ObjectId(adminReq.adminId),
      changedAt: new Date(),
      note,
    });

    if (status === "paid" && !order.paidAt) {
      order.paidAt = new Date();
    }

    await order.save();

    await logAdminAction({
      req: adminReq,
      action: "order.update_status",
      entityType: "order",
      entityId: id,
      previousState: { status: previousStatus },
      newState: { status, note },
    });

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

export const addOrderNote = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminReq = req as AdminRequest;
    const id = getRouteParam(req.params as Record<string, string>, "id");
    const { note } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid order ID" });
      return;
    }

    const order = await Order.findById(id);
    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    order.adminNotes = note;
    await order.save();

    await logAdminAction({
      req: adminReq,
      action: "order.add_note",
      entityType: "order",
      entityId: id,
      newState: { adminNotes: note },
    });

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

export const getOrderHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = getRouteParam(req.params as Record<string, string>, "id");

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid order ID" });
      return;
    }

    const order = await Order.findById(id)
      .select("statusHistory")
      .populate("statusHistory.changedBy", "name");

    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    res.status(200).json({ success: true, data: order.statusHistory });
  } catch (error) {
    next(error);
  }
};

export const cancelOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminReq = req as AdminRequest;
    const id = getRouteParam(req.params as Record<string, string>, "id");

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid order ID" });
      return;
    }

    const order = await Order.findById(id);
    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    if (order.status === "refunded" || order.status === "canceled") {
      res.status(400).json({
        success: false,
        message: `Order already ${order.status}`,
      });
      return;
    }

    const previousStatus = order.status;
    order.status = "canceled";
    order.statusHistory.push({
      status: "canceled",
      changedBy: new mongoose.Types.ObjectId(adminReq.adminId),
      changedAt: new Date(),
      note: "Canceled by admin",
    });
    await order.save();

    await logAdminAction({
      req: adminReq,
      action: "order.cancel",
      entityType: "order",
      entityId: id,
      previousState: { status: previousStatus },
      newState: { status: "canceled" },
    });

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

export const exportOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminReq = req as AdminRequest;
    const q = req.query as Record<string, any>;
    const status = getQueryParam(q, "status");
    const startDate = getQueryParam(q, "startDate");
    const endDate = getQueryParam(q, "endDate");

    const query: Record<string, any> = {};
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(query)
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    const fields = [
      { label: "Order Number", value: "orderNumber" },
      { label: "Customer", value: "userId.name" },
      { label: "Email", value: "userId.email" },
      { label: "Status", value: "status" },
      { label: "Subtotal", value: "subtotal" },
      { label: "Tax", value: "tax" },
      { label: "Total", value: "total" },
      { label: "Created At", value: "createdAt" },
      { label: "Paid At", value: "paidAt" },
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(orders.map((o) => ({
      ...o.toObject(),
      userId: o.userId as any,
    })));

    await logAdminAction({
      req: adminReq,
      action: "order.export",
      entityType: "order",
      newState: { count: orders.length },
    });

    res.header("Content-Type", "text/csv");
    res.attachment(`orders-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
};
