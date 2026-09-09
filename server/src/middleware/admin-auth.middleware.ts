import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { RedisStore as RateLimitRedisStore } from "rate-limit-redis";
import { JWT_SECRET } from "../config/jwt.ts";
import redis from "../config/redis.ts";
import User from "../models/user.model.ts";

export interface AdminRequest extends Request {
  adminId: string;
  adminRole: string;
}

export const authenticateAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "Authorization token is required",
    });
    return;
  }

  const token = authHeader.split(" ")[1] as string;

  try {
    const decoded = jwt.verify(token, JWT_SECRET!) as unknown as { userId: string };
    const user = await User.findById(decoded.userId).select("role isVerified");

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Admin not found",
      });
      return;
    }

    if (user.role !== "admin") {
      res.status(403).json({
        success: false,
        message: "Admin access required",
      });
      return;
    }

    if (!user.isVerified) {
      res.status(403).json({
        success: false,
        message: "Email verification required for admin access",
      });
      return;
    }

    (req as AdminRequest).adminId = decoded.userId;
    (req as AdminRequest).adminRole = user.role;
    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

export const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: "Too many admin requests" },
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  store: new RateLimitRedisStore({
    sendCommand: (...args: string[]) => (redis as any).call(...args),
  }),
});
