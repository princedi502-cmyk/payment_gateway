import { Router } from "express";
import {
  getSettings,
  getSettingsByCategoryController,
  getPublicSettingController,
  updateSettingsController,
} from "../controllers/admin-settings.controller.ts";

const router = Router();

router.get("/", getSettings);
router.get("/public/:key", getPublicSettingController);
router.get("/:category", getSettingsByCategoryController);
router.put("/", updateSettingsController);

export default router;
