import { type Request, type Response, type NextFunction } from "express";
import Order from "../../models/order.model.ts";
import User from "../../models/user.model.ts";
import {
  getDashboardStats,
  getSalesChartData,
} from "../services/admin-analytics.service.ts";
import type { AdminRequest } from "../../middleware/admin-auth.middleware.ts";

export const getStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await getDashboardStats();
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

export const getRecentOrders = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const orders = await Order.find()
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};

export const getRecentUsers = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const users = await User.find({ role: "user" })
      .select("email name createdAt")
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

export const getSalesChart = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const data = await getSalesChartData(days);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getAlerts = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminReq = _req as AdminRequest;

    const [pendingReturns, lowStockProducts, pendingOrders] = await Promise.all([
      import("../../models/return.model.ts").then((m) =>
        m.default.countDocuments({ status: "requested" })
      ),
      import("../../models/product.model.ts").then((m) =>
        m.default.countDocuments({ isActive: true, stock: { $lt: 10 } })
      ),
      Order.countDocuments({ status: "pending" }),
    ]);

    const alerts = [];

    if (pendingReturns > 0) {
      alerts.push({
        type: "warning",
        message: `${pendingReturns} return request(s) pending review`,
        link: "/admin/returns",
      });
    }

    if (lowStockProducts > 0) {
      alerts.push({
        type: "info",
        message: `${lowStockProducts} product(s) with low stock`,
        link: "/admin/products",
      });
    }

    if (pendingOrders > 0) {
      alerts.push({
        type: "info",
        message: `${pendingOrders} order(s) pending payment`,
        link: "/admin/orders",
      });
    }

    res.status(200).json({ success: true, data: alerts });
  } catch (error) {
    next(error);
  }
};
