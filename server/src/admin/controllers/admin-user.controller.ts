import { type Request, type Response, type NextFunction } from "express";
import mongoose from "mongoose";
import { Parser } from "json2csv";
import User from "../../models/user.model.ts";
import Order from "../../models/order.model.ts";
import { logAdminAction } from "../services/admin-log.service.ts";
import type { AdminRequest } from "../../middleware/admin-auth.middleware.ts";
import { getQueryParam, getQueryParamAsInt, getQueryParamAsBool, getRouteParam } from "../utils/query-helpers.ts";

export const getUsers = async (
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
    const role = getQueryParam(q, "role");
    const isActive = getQueryParamAsBool(q, "isActive");
    const search = getQueryParam(q, "search");

    const query: Record<string, any> = {};

    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const sortOrder = order === "asc" ? 1 : -1;

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-password")
        .sort({ [sort]: sortOrder })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: users,
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

export const getUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = getRouteParam(req.params as Record<string, string>, "id");

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid user ID" });
      return;
    }

    const user = await User.findById(id).select("-password");

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const getUserOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = getRouteParam(req.params as Record<string, string>, "id");

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid user ID" });
      return;
    }

    const orders = await Order.find({ userId: new mongoose.Types.ObjectId(id) }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};

export const updateUserStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminReq = req as AdminRequest;
    const id = getRouteParam(req.params as Record<string, string>, "id");
    const { isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid user ID" });
      return;
    }

    const user = await User.findById(id).select("-password");
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const previousState = { isActive: !user.lockUntil || user.lockUntil < new Date() };
    user.lockUntil = isActive ? null : new Date("2099-01-01");
    await user.save();

    await logAdminAction({
      req: adminReq,
      action: "user.update_status",
      entityType: "user",
      entityId: id,
      previousState,
      newState: { isActive },
    });

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const updateUserRole = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminReq = req as AdminRequest;
    const id = getRouteParam(req.params as Record<string, string>, "id");
    const { role } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid user ID" });
      return;
    }

    const user = await User.findById(id).select("-password");
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const previousRole = user.role;
    user.role = role;
    await user.save();

    await logAdminAction({
      req: adminReq,
      action: "user.update_role",
      entityType: "user",
      entityId: id,
      previousState: { role: previousRole },
      newState: { role },
    });

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminReq = req as AdminRequest;
    const id = getRouteParam(req.params as Record<string, string>, "id");

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid user ID" });
      return;
    }

    const user = await User.findById(id).select("-password");
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    if (user.role === "admin") {
      res.status(403).json({ success: false, message: "Cannot delete admin users" });
      return;
    }

    await User.findByIdAndDelete(id);

    await logAdminAction({
      req: adminReq,
      action: "user.delete",
      entityType: "user",
      entityId: id,
      previousState: { email: user.email, name: user.name },
    });

    res.status(200).json({ success: true, message: "User deleted" });
  } catch (error) {
    next(error);
  }
};

export const exportUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminReq = req as AdminRequest;
    const q = req.query as Record<string, any>;
    const role = getQueryParam(q, "role");
    const isActive = getQueryParamAsBool(q, "isActive");

    const query: Record<string, any> = {};
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive;

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 });

    const fields = [
      { label: "Name", value: "name" },
      { label: "Email", value: "email" },
      { label: "Role", value: "role" },
      { label: "Provider", value: "provider" },
      { label: "Verified", value: "isVerified" },
      { label: "Created At", value: "createdAt" },
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(users);

    await logAdminAction({
      req: adminReq,
      action: "user.export",
      entityType: "user",
      newState: { count: users.length },
    });

    res.header("Content-Type", "text/csv");
    res.attachment(`users-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
};
