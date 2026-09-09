import AdminLog from "../../models/admin-log.model.ts";
import type { AdminRequest } from "../../middleware/admin-auth.middleware.ts";

interface LogActionParams {
  req: AdminRequest;
  action: string;
  entityType: "order" | "product" | "user" | "return" | "payment" | "setting" | "review";
  entityId?: string;
  previousState?: Record<string, any> | null | undefined;
  newState?: Record<string, any> | null | undefined;
}

export async function logAdminAction(params: LogActionParams): Promise<void> {
  const { req, action, entityType, entityId, previousState, newState } = params;

  const logData: Record<string, any> = {
    adminId: req.adminId,
    action,
    entityType,
    ipAddress: req.ip || "unknown",
    userAgent: req.get("user-agent"),
  };

  if (entityId) logData.entityId = entityId;
  if (previousState) logData.previousState = previousState;
  if (newState) logData.newState = newState;

  AdminLog.create(logData).catch((err: Error) => {
    console.error("Failed to log admin action:", err.message);
  });
}
