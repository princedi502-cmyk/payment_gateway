import { type Request, type Response, type NextFunction } from "express";
import { getRouteParam } from "../utils/query-helpers.ts";
import mongoose from "mongoose";
import NotificationTemplate from "../../models/notification-template.model.ts";
import { logAdminAction } from "../services/admin-log.service.ts";
import type { AdminRequest } from "../../middleware/admin-auth.middleware.ts";

export const getTemplates = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const templates = await NotificationTemplate.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: templates });
  } catch (error) {
    next(error);
  }
};

export const createTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminReq = req as AdminRequest;
    const template = await NotificationTemplate.create(req.body);

    await logAdminAction({
      req: adminReq,
      action: "notification.create_template",
      entityType: "setting",
      entityId: template._id.toString(),
      newState: template.toObject(),
    });

    res.status(201).json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
};

export const updateTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminReq = req as AdminRequest;
    const id = getRouteParam(req.params as Record<string, string>, "id");

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid template ID" });
      return;
    }

    const previousTemplate = await NotificationTemplate.findById(id);
    if (!previousTemplate) {
      res.status(404).json({ success: false, message: "Template not found" });
      return;
    }

    const template = await NotificationTemplate.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    await logAdminAction({
      req: adminReq,
      action: "notification.update_template",
      entityType: "setting",
      entityId: id,
      previousState: previousTemplate.toObject(),
      newState: template ? template.toObject() : undefined,
    });

    res.status(200).json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
};

export const deleteTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminReq = req as AdminRequest;
    const id = getRouteParam(req.params as Record<string, string>, "id");

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid template ID" });
      return;
    }

    const template = await NotificationTemplate.findByIdAndDelete(id);

    if (!template) {
      res.status(404).json({ success: false, message: "Template not found" });
      return;
    }

    await logAdminAction({
      req: adminReq,
      action: "notification.delete_template",
      entityType: "setting",
      entityId: id,
      previousState: template.toObject(),
    });

    res.status(200).json({ success: true, message: "Template deleted" });
  } catch (error) {
    next(error);
  }
};

export const sendNotification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminReq = req as AdminRequest;
    const { userIds, templateId, customMessage } = req.body;

    await logAdminAction({
      req: adminReq,
      action: "notification.send",
      entityType: "setting",
      newState: { userIds, templateId, customMessage },
    });

    res.status(200).json({
      success: true,
      message: "Notification queued for sending",
    });
  } catch (error) {
    next(error);
  }
};

export const getNotificationHistory = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.status(200).json({ success: true, data: [] });
  } catch (error) {
    next(error);
  }
};
