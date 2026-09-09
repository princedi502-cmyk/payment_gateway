import { type Request, type Response, type NextFunction } from "express";
import { Parser } from "json2csv";
import AdminLog from "../../models/admin-log.model.ts";
import { logAdminAction } from "../services/admin-log.service.ts";
import type { AdminRequest } from "../../middleware/admin-auth.middleware.ts";
import { getQueryParam, getQueryParamAsInt, getRouteParam } from "../utils/query-helpers.ts";

export const getAuditLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const q = req.query as Record<string, any>;
    const page = getQueryParamAsInt(q, "page", 1);
    const limit = getQueryParamAsInt(q, "limit", 20);
    const adminId = getQueryParam(q, "adminId");
    const entityType = getQueryParam(q, "entityType");
    const entityId = getQueryParam(q, "entityId");
    const action = getQueryParam(q, "action");
    const startDate = getQueryParam(q, "startDate");
    const endDate = getQueryParam(q, "endDate");

    const query: Record<string, any> = {};

    if (adminId) query.adminId = adminId;
    if (entityType) query.entityType = entityType;
    if (entityId) query.entityId = entityId;
    if (action) query.action = { $regex: action, $options: "i" };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AdminLog.find(query)
        .populate("adminId", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AdminLog.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: logs,
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

export const getAuditLog = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = getRouteParam(req.params as Record<string, string>, "id");

    const log = await AdminLog.findById(id).populate("adminId", "name email");

    if (!log) {
      res.status(404).json({ success: false, message: "Audit log not found" });
      return;
    }

    res.status(200).json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};

export const exportAuditLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminReq = req as AdminRequest;
    const q = req.query as Record<string, any>;
    const adminId = getQueryParam(q, "adminId");
    const entityType = getQueryParam(q, "entityType");
    const startDate = getQueryParam(q, "startDate");
    const endDate = getQueryParam(q, "endDate");

    const query: Record<string, any> = {};
    if (adminId) query.adminId = adminId;
    if (entityType) query.entityType = entityType;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const logs = await AdminLog.find(query)
      .populate("adminId", "name email")
      .sort({ createdAt: -1 });

    const fields = [
      { label: "Admin", value: "adminId.name" },
      { label: "Email", value: "adminId.email" },
      { label: "Action", value: "action" },
      { label: "Entity Type", value: "entityType" },
      { label: "Entity ID", value: "entityId" },
      { label: "IP Address", value: "ipAddress" },
      { label: "Date", value: "createdAt" },
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(logs.map((l) => ({
      ...l.toObject(),
      adminId: l.adminId as any,
    })));

    await logAdminAction({
      req: adminReq,
      action: "audit.export",
      entityType: "setting",
      newState: { count: logs.length },
    });

    res.header("Content-Type", "text/csv");
    res.attachment(`audit-logs-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
};
