import { Router } from "express";
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  sendNotification,
  getNotificationHistory,
} from "../controllers/admin-notification.controller.ts";

const router = Router();

router.get("/templates", getTemplates);
router.post("/templates", createTemplate);
router.put("/templates/:id", updateTemplate);
router.delete("/templates/:id", deleteTemplate);
router.post("/send", sendNotification);
router.get("/history", getNotificationHistory);

export default router;
