import { Redis } from "ioredis";

const url = process.env.REDIS_URL;
if (!url) {
  throw new Error("REDIS_URL is not defined in environment variables");
}

const redis = new Redis(url, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => Math.min(times * 200, 2000),
  lazyConnect: true,
  connectTimeout: 10000,
  tls: url.startsWith("rediss://") ? {} : undefined,
});

redis.on("error", (err: Error) => console.error("Redis error:", err.message));
redis.on("connect", () => console.log("Redis connected"));
redis.on("ready", () => console.log("Redis ready"));

export default redis;
