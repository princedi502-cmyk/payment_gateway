import { Router } from "express";
import {
  getAuditLogs,
  getAuditLog,
  exportAuditLogs,
} from "../controllers/admin-audit.controller.ts";

const router = Router();

router.get("/", getAuditLogs);
router.get("/export", exportAuditLogs);
router.get("/:id", getAuditLog);

export default router;
