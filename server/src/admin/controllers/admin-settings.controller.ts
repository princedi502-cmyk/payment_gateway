import { type Request, type Response, type NextFunction } from "express";
import {
  getAllSettings,
  getSettingsByCategory,
  getPublicSetting,
  updateSettings,
} from "../services/admin-settings.service.ts";
import { logAdminAction } from "../services/admin-log.service.ts";
import type { AdminRequest } from "../../middleware/admin-auth.middleware.ts";
import { getQueryParam, getRouteParam } from "../utils/query-helpers.ts";

export const getSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const q = req.query as Record<string, any>;
    const category = getQueryParam(q, "category");

    const settings = category
      ? await getSettingsByCategory(category)
      : await getAllSettings();

    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

export const getSettingsByCategoryController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const category = getRouteParam(req.params as Record<string, string>, "category");
    const settings = await getSettingsByCategory(category);
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

export const getPublicSettingController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const key = getRouteParam(req.params as Record<string, string>, "key");
    const setting = await getPublicSetting(key);

    if (!setting) {
      res.status(404).json({ success: false, message: "Setting not found" });
      return;
    }

    res.status(200).json({ success: true, data: setting });
  } catch (error) {
    next(error);
  }
};

export const updateSettingsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminReq = req as AdminRequest;
    const { settings } = req.body;

    if (!Array.isArray(settings)) {
      res.status(400).json({ success: false, message: "Settings array is required" });
      return;
    }

    const updatedSettings = await updateSettings(settings, adminReq.adminId);

    await logAdminAction({
      req: adminReq,
      action: "settings.update",
      entityType: "setting",
      newState: { updatedKeys: settings.map((s: any) => s.key) },
    });

    res.status(200).json({ success: true, data: updatedSettings });
  } catch (error) {
    next(error);
  }
};
