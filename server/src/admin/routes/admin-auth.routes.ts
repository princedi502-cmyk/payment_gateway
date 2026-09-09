import { Router } from "express";
import { adminLogin, adminMe, adminLogout } from "../controllers/admin-auth.controller.ts";
import { authenticateAdmin } from "../../middleware/admin-auth.middleware.ts";

const router = Router();

router.post("/login", adminLogin);
router.get("/me", authenticateAdmin, adminMe);
router.post("/logout", authenticateAdmin, adminLogout);

export default router;
