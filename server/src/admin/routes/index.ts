import { Router } from "express";
import { authenticateAdmin, adminRateLimiter } from "../../middleware/admin-auth.middleware.ts";
import adminAuthRoutes from "./admin-auth.routes.ts";
import adminDashboardRoutes from "./admin-dashboard.routes.ts";
import adminProductRoutes from "./admin-product.routes.ts";
import adminCategoryRoutes from "./admin-category.routes.ts";
import adminOrderRoutes from "./admin-order.routes.ts";
import adminUserRoutes from "./admin-user.routes.ts";
import adminPaymentRoutes from "./admin-payment.routes.ts";
import adminAnalyticsRoutes from "./admin-analytics.routes.ts";
import adminSettingsRoutes from "./admin-settings.routes.ts";
import adminNotificationRoutes from "./admin-notification.routes.ts";
import adminAuditRoutes from "./admin-audit.routes.ts";
import adminReviewRoutes from "./admin-review.routes.ts";

const router = Router();

router.use("/auth", adminAuthRoutes);

router.use("/dashboard", authenticateAdmin, adminRateLimiter, adminDashboardRoutes);
router.use("/products", authenticateAdmin, adminRateLimiter, adminProductRoutes);
router.use("/categories", authenticateAdmin, adminRateLimiter, adminCategoryRoutes);
router.use("/orders", authenticateAdmin, adminRateLimiter, adminOrderRoutes);
router.use("/users", authenticateAdmin, adminRateLimiter, adminUserRoutes);
router.use("/payments", authenticateAdmin, adminRateLimiter, adminPaymentRoutes);
router.use("/analytics", authenticateAdmin, adminRateLimiter, adminAnalyticsRoutes);
router.use("/settings", authenticateAdmin, adminRateLimiter, adminSettingsRoutes);
router.use("/notifications", authenticateAdmin, adminRateLimiter, adminNotificationRoutes);
router.use("/audit-logs", authenticateAdmin, adminRateLimiter, adminAuditRoutes);
router.use("/reviews", authenticateAdmin, adminRateLimiter, adminReviewRoutes);

export default router;
