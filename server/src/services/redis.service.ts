export class RedisUnavailableError extends Error {
  constructor(message = "Redis clone is unavailable") {
    super(message);
    this.name = "RedisUnavailableError";
  }
}

export class RedisService {
  #baseUrl: string;
  #clientId: string;
  #available: boolean;
  #connectionError: Error | null;

  constructor(baseUrl: string, clientId: string) {
    this.#baseUrl = baseUrl.replace(/\/$/, "");
    this.#clientId = clientId;
    this.#available = true;
    this.#connectionError = null;
  }

  get isAvailable(): boolean {
    return this.#available;
  }

  get connectionError(): Error | null {
    return this.#connectionError;
  }

  async #request<T>(args: string[]): Promise<T> {
    const response = await fetch(`${this.#baseUrl}/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cmd: args[0], args: args.slice(1), clientId: this.#clientId }),
      signal: AbortSignal.timeout(2000),
    });

    if (!response.ok) {
      throw new RedisUnavailableError(`HTTP ${response.status}`);
    }

    const payload = (await response.json()) as { result?: T; error?: string };
    if (payload.error) {
      throw new Error(payload.error);
    }
    return payload.result as T;
  }

  async get(key: string): Promise<string | null> {
    try {
      const value = await this.#request<string | null>(["GET", key]);
      return value;
    } catch (error) {
      this.#handleUnavailable(error);
      return null;
    }
  }

  async set(key: string, value: string, ex?: number): Promise<"OK" | null> {
    try {
      return await this.#request<"OK" | null>(["SET", key, value, ...(ex !== undefined ? ["EX", String(ex)] : [])]);
    } catch (error) {
      this.#handleUnavailable(error);
      return null;
    }
  }

  async del(key: string): Promise<number | null> {
    try {
      return await this.#request<number>(["DEL", key]);
    } catch (error) {
      this.#handleUnavailable(error);
      return null;
    }
  }

  async expire(key: string, seconds: number): Promise<number | null> {
    try {
      return await this.#request<number>(["EXPIRE", key, String(seconds)]);
    } catch (error) {
      this.#handleUnavailable(error);
      return null;
    }
  }

  async ttl(key: string): Promise<number | null> {
    try {
      return await this.#request<number>(["TTL", key]);
    } catch (error) {
      this.#handleUnavailable(error);
      return null;
    }
  }

  async keys(pattern = "*"): Promise<string[]> {
    try {
      return await this.#request<string[]>(["KEYS", pattern]);
    } catch (error) {
      this.#handleUnavailable(error);
      return [];
    }
  }

  async ping(): Promise<boolean> {
    try {
      const result = await this.#request<string>(["PING"]);
      this.#available = true;
      this.#connectionError = null;
      return result === "PONG";
    } catch (error) {
      this.#available = false;
      this.#connectionError = error instanceof Error ? error : new Error(String(error));
      return false;
    }
  }

  async flushdb(): Promise<"OK" | null> {
    try {
      return await this.#request<"OK">(["FLUSHDB"]);
    } catch (error) {
      this.#handleUnavailable(error);
      return null;
    }
  }

  #handleUnavailable(error: unknown): void {
    this.#available = false;
    this.#connectionError = error instanceof Error ? error : new Error(String(error));
  }
}

const redis = new RedisService(
  process.env.REDIS_URL || "http://localhost:6379",
  process.env.REDIS_CLIENT_ID || "payment-server"
);

export default redis;
