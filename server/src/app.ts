import "./config/env.js";
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { RedisStore as RateLimitRedisStore } from "rate-limit-redis";
import morgan from "morgan";
import connectDatabase from "./config/database.js";
import { seedProducts } from "./scripts/seed.js";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js";
import { requestIdMiddleware, responseHeadersMiddleware } from "./middlewares/requestId.middleware.js";
import passport from "./config/google.js";
import { startOrderNotificationWorker, stopOrderNotificationWorker } from "./workers/order-notification.worker.js";
import redis from "./config/redis.js";
import { logger } from "./config/logger.js";
import { ForbiddenError } from "./errors/AppError.js";
import productRoutes from "./routes/product.routes.js";
import wishlistRoutes from "./routes/wishlist.routes.js";
import orderRoutes from "./routes/order.routes.js";
import checkoutRoutes from "./routes/checkout.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import webhookRoutes from "./routes/webhook.routes.js";
import authRoutes from "./routes/auth.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import addressRoutes from "./routes/address.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import returnRoutes from "./routes/return.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import internalRoutes from "./routes/internal.routes.js";
import adminRoutes from "./admin/routes/index.js";

const app = express();
const PORT = process.env.PORT || 5000;

let server: ReturnType<typeof app.listen>;

if (process.env.TRUST_PROXY) {
  app.set("trust proxy", parseInt(process.env.TRUST_PROXY, 10));
}

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const ADMIN_FRONTEND_URL = process.env.ADMIN_FRONTEND_URL || "http://localhost:5174";

const allowedOrigins = [FRONTEND_URL, ADMIN_FRONTEND_URL];

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "https://js.stripe.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "https://api.stripe.com"],
      frameSrc: ["'self'", "https://js.stripe.com"],
      frameAncestors: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
}));

function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;
  
  if (!origin || allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-ID");
    
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    
    next();
    return;
  }
  
  next(new ForbiddenError("Not allowed by CORS"));
}

app.use(corsMiddleware);

app.use(requestIdMiddleware);
app.use(responseHeadersMiddleware);
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));

app.use(morgan("short", {
  skip: (req) => req.url.startsWith("/api/webhooks") || req.url.startsWith("/internal"),
  stream: {
    write: (message) => logger.info(message.trim()),
  },
}));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: "Too many requests, please try again later", code: "RATE_LIMITED" },
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  store: new RateLimitRedisStore({
    sendCommand: (...args: string[]) => (redis as any).call(...args),
  }),
});

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

app.use("/api/products", apiLimiter, productRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/auth", apiLimiter, authRoutes);
app.use("/api/profile", apiLimiter, profileRoutes);
app.use("/api/addresses", apiLimiter, addressRoutes);
app.use("/api/orders", apiLimiter, orderRoutes);
app.use("/api/checkout", apiLimiter, checkoutRoutes);
app.use("/api/payments", apiLimiter, paymentRoutes);
app.use("/api/webhooks", express.raw({ type: "application/json", limit: "1mb" }), webhookRoutes);
app.use("/api/notifications", apiLimiter, notificationRoutes);
app.use("/api/returns", apiLimiter, returnRoutes);
app.use("/api/admin/returns", apiLimiter, returnRoutes);
app.use("/api/reviews", apiLimiter, reviewRoutes);
app.use("/internal", internalRoutes);
app.use("/api/admin", adminRoutes);

app.use("/uploads", express.static("uploads", {
  maxAge: "1d",
  etag: true,
  setHeaders: (res, filepath) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (filepath.includes("/reviews/")) {
      res.setHeader("Content-Disposition", "inline");
    } else {
      res.setHeader("Content-Disposition", "attachment");
    }
  },
}));

app.use(notFoundHandler);
app.use(errorHandler);

async function gracefulShutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Received shutdown signal, starting graceful shutdown");

  server.close(async () => {
    logger.info("HTTP server closed");

    try {
      await stopOrderNotificationWorker();
      logger.info("Order notification worker stopped");
    } catch (err) {
      logger.error({ err }, "Error stopping order notification worker");
    }

    try {
      await redis.quit();
      logger.info("Redis connection closed");
    } catch (err) {
      logger.error({ err }, "Error closing Redis connection");
    }

    try {
      const mongoose = (await import("mongoose")).default;
      await mongoose.connection.close();
      logger.info("MongoDB connection closed");
    } catch (err) {
      logger.error({ err }, "Error closing MongoDB connection");
    }

    logger.info("Graceful shutdown complete");
    process.exit(0);
  });

  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 30000).unref();
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("unhandledRejection", (reason: unknown, promise: Promise<unknown>) => {
  logger.error({ reason, promise }, "Unhandled Rejection");
});

process.on("uncaughtException", (error: Error) => {
  logger.error({ err: error }, "Uncaught Exception");
  gracefulShutdown("uncaughtException").catch(() => process.exit(1));
});

const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();

    if (process.env.NODE_ENV !== "production") {
      await seedProducts();
    }

    if (redis.status !== "ready") {
      await redis.connect();
    }
    const redisPing = await redis.ping();
    if (redisPing !== "PONG") {
      throw new Error("Redis ping failed");
    }
    logger.info("Redis connected to Upstash");

    startOrderNotificationWorker();

    server = app.listen(PORT, () => {
      logger.info({ port: PORT }, `Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to start server");
    process.exit(1);
  }
};

startServer();

export { app };