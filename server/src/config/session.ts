import type { Request } from "express";
import session from "express-session";
import type { RedisService } from "../services/redis.service.ts";

interface SessionData extends session.SessionData {
  [key: string]: any;
}

export class RedisSessionStore extends session.Store {
  private readonly redis: RedisService;
  private readonly ttlSeconds: number;

  constructor(redis: RedisService, ttlSeconds = 24 * 60 * 60) {
    super();
    this.redis = redis;
    this.ttlSeconds = ttlSeconds;
  }

  get(sid: string, callback: (err: any, session?: SessionData | null) => void): void {
    void this.#get(sid).then((session) => callback(null, session)).catch((err) => callback(err));
  }

  set(sid: string, session: SessionData, callback?: (err?: any) => void): void {
    const data = { ...session } as Record<string, unknown>;
    delete data.cookie;
    void this.redis
      .set(this.#prefix(sid), JSON.stringify(data), this.ttlSeconds)
      .then(() => callback?.())
      .catch((err) => callback?.(err));
  }

  destroy(sid: string, callback?: (err?: any) => void): void {
    void this.redis
      .del(this.#prefix(sid))
      .then(() => callback?.())
      .catch((err) => callback?.(err));
  }

  all(callback: (err: any, obj?: SessionData[] | { [sid: string]: SessionData } | null) => void): void {
    void this.redis
      .keys(this.#prefix("*"))
      .then(async (keys: string[]) => {
        const sessions: SessionData[] = [];
        for (const key of keys) {
          const raw = await this.redis.get(key);
          if (raw) {
            try {
              sessions.push(JSON.parse(raw));
            } catch {
              // skip corrupted session
            }
          }
        }
        callback(null, sessions);
      })
      .catch((err) => callback(err));
  }

  length(callback: (err: any, length?: number) => void): void {
    void this.redis
      .keys(this.#prefix("*"))
      .then((keys: string[]) => callback(null, keys.length))
      .catch((err) => callback(err));
  }

  clear(callback?: (err?: any) => void): void {
    void this.redis
      .keys(this.#prefix("*"))
      .then(async (keys: string[]) => {
        await Promise.all(keys.map((key: string) => this.redis.del(key)));
        callback?.();
      })
      .catch((err) => callback?.(err));
  }

  touch(sid: string, session: SessionData, callback?: () => void): void {
    void this.redis
      .expire(this.#prefix(sid), this.ttlSeconds)
      .then(() => callback?.())
      .catch(() => callback?.());
  }

  generate(_req: Request): void {
    // handled by express-session
  }

  create(sid: string, callback: (err: any, session?: SessionData | null) => void): void {
    void this.redis
      .set(this.#prefix(sid), JSON.stringify({}), this.ttlSeconds)
      .then(() => callback?.(null, null))
      .catch((err) => callback?.(err));
  }

  async #get(sid: string): Promise<SessionData | null> {
    const raw = await this.redis.get(this.#prefix(sid));
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  #prefix(sid: string): string {
    return `session:${sid}`;
  }
}
