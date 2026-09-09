import session from "express-session";
import { RedisStore } from "connect-redis";
import redis from "./redis.js";

const sessionStore = new RedisStore({
  client: redis,
  prefix: "session:",
  ttl: 24 * 60 * 60,
});

export { sessionStore };
