import "./config/env.js";
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import type { Store as RateLimitStore, Options as RateLimitOptions } from "express-rate-limit";
import morgan from "morgan";
import session from "express-session";
import connectDatabase from "./config/database.ts";
import { seedProducts } from "./scripts/seed.ts";
import { errorHandler } from "./middlewares/error.middleware.ts";
import passport from "./config/google.ts";
import productRoutes from "./routes/product.routes.ts";
import wishlistRoutes from "./routes/wishlist.routes.ts";
import orderRoutes from "./routes/order.routes.ts";
import checkoutRoutes from "./routes/checkout.routes.ts";
import paymentRoutes from "./routes/payment.routes.ts";
import webhookRoutes from "./routes/webhook.routes.ts";
import authRoutes from "./routes/auth.routes.ts";
import profileRoutes from "./routes/profile.routes.ts";
import addressRoutes from "./routes/address.routes.ts";
import { RedisService } from "./services/redis.service.ts";
import { RedisSessionStore } from "./config/session.ts";

const app = express();
const PORT = process.env.PORT || 5000;

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const SESSION_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || "fallback_session_secret";

const redis = new RedisService(
  process.env.REDIS_URL || "http://localhost:6379",
  process.env.REDIS_CLIENT_ID || "payment-server"
);

class RedisRateLimitStore implements RateLimitStore {
  private redis: RedisService;
  private windowMs: number;
  prefix = "";

  constructor(redis: RedisService, windowMs: number) {
    this.redis = redis;
    this.windowMs = windowMs;
  }

  init(options: RateLimitOptions): void {
    this.windowMs = options.windowMs ?? this.windowMs;
  }

  get(key: string) {
    return this.#fetch(key).then((entry) => (entry ? { totalHits: entry.hits, resetTime: new Date(entry.reset) } : undefined));
  }

  async increment(key: string) {
    const now = Date.now();
    const reset = now + this.windowMs;
    const rawKey = `ratelimit:${key}`;
    const raw = await this.redis.get(rawKey);
    let entry: { hits: number; reset: number };
    if (raw) {
      try {
        entry = JSON.parse(raw);
      } catch {
        entry = { hits: 0, reset };
      }
    } else {
      entry = { hits: 0, reset };
    }

    if (now > entry.reset) {
      entry = { hits: 1, reset };
    } else {
      entry.hits += 1;
    }

    const ttlSeconds = Math.max(1, Math.ceil((entry.reset - now) / 1000));
    await this.redis.set(rawKey, JSON.stringify(entry), ttlSeconds);
    return { totalHits: entry.hits, resetTime: new Date(entry.reset) };
  }

  async decrement(key: string): Promise<void> {
    const rawKey = `ratelimit:${key}`;
    const raw = await this.redis.get(rawKey);
    if (!raw) return;
    try {
      const entry = JSON.parse(raw);
      entry.hits = Math.max(0, entry.hits - 1);
      await this.redis.set(rawKey, JSON.stringify(entry), Math.max(1, Math.ceil((entry.reset - Date.now()) / 1000)));
    } catch {
      // ignore
    }
  }

  resetKey(key: string): void {
    void this.redis.del(`ratelimit:${key}`);
  }

  resetAll(): void {
    void this.redis.keys("ratelimit:*").then((keys: string[]) => Promise.all(keys.map((k: string) => this.redis.del(k))));
  }

  shutdown(): void {
    // nothing to clean up
  }

  async #fetch(key: string) {
    const raw = await this.redis.get(`ratelimit:${key}`);
    if (!raw) return null;
    try {
      const entry = JSON.parse(raw);
      if (Date.now() > entry.reset) return null;
      return entry;
    } catch {
      return null;
    }
  }
}

app.use(helmet());
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan("short"));

const sessionStore = redis.isAvailable ? new RedisSessionStore(redis) : undefined;

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);
app.use(passport.initialize());

const rateLimitStore = redis.isAvailable ? new RedisRateLimitStore(redis, 15 * 60 * 1000) : undefined;

const apiLimiterOptions: Partial<RateLimitOptions> = {
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
};
if (rateLimitStore) {
  apiLimiterOptions.store = rateLimitStore;
}
const apiLimiter = rateLimit(apiLimiterOptions);

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

app.use("/api/products", productRoutes);
app.use("/api/wishlist", wishlistRoutes);

app.use("/api/auth", apiLimiter, authRoutes);

app.use("/api/profile", apiLimiter, profileRoutes);

app.use("/api/addresses", apiLimiter, addressRoutes);

app.use("/api/orders", apiLimiter, orderRoutes);

app.use("/api/checkout", apiLimiter, checkoutRoutes);

app.use("/api/payments", apiLimiter, paymentRoutes);

app.use("/api/webhooks", express.raw({ type: "application/json" }), webhookRoutes);

app.use(errorHandler);

const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();

    if (process.env.NODE_ENV !== "production") {
      await seedProducts();
    }

    const redisHealthy = await redis.ping();
    if (!redisHealthy) {
      console.warn("Redis clone unavailable, falling back to in-memory stores:", redis.connectionError?.message);
    } else {
      console.log("Redis clone connected");
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server safely running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
