import { type Request, type Response, type NextFunction } from "express";
import {
  getRevenueAnalytics,
  getOrderAnalytics,
  getUserAnalytics,
  getProductAnalytics,
} from "../services/admin-analytics.service.ts";
import { logAdminAction } from "../services/admin-log.service.ts";
import type { AdminRequest } from "../../middleware/admin-auth.middleware.ts";

function getDateRange(query: Record<string, string>): { startDate: Date; endDate: Date } {
  const endDate = query.endDate ? new Date(query.endDate) : new Date();
  const startDate = query.startDate
    ? new Date(query.startDate)
    : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { startDate, endDate };
}

export const getRevenueAnalyticsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { startDate, endDate } = getDateRange(req.query as Record<string, string>);
    const data = await getRevenueAnalytics(startDate, endDate);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getOrderAnalyticsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { startDate, endDate } = getDateRange(req.query as Record<string, string>);
    const data = await getOrderAnalytics(startDate, endDate);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getUserAnalyticsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { startDate, endDate } = getDateRange(req.query as Record<string, string>);
    const data = await getUserAnalytics(startDate, endDate);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getProductAnalyticsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { startDate, endDate } = getDateRange(req.query as Record<string, string>);
    const data = await getProductAnalytics(startDate, endDate);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const exportAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminReq = req as AdminRequest;
    const { startDate, endDate } = getDateRange(req.query as Record<string, string>);
    const type = (req.query.type as string) || "revenue";

    let data;
    switch (type) {
      case "orders":
        data = await getOrderAnalytics(startDate, endDate);
        break;
      case "users":
        data = await getUserAnalytics(startDate, endDate);
        break;
      case "products":
        data = await getProductAnalytics(startDate, endDate);
        break;
      default:
        data = await getRevenueAnalytics(startDate, endDate);
    }

    await logAdminAction({
      req: adminReq,
      action: "analytics.export",
      entityType: "setting",
      newState: { type, startDate, endDate },
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
