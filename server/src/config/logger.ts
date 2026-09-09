import "./env.js";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type Logger = {
  child: (bindings: Record<string, unknown>) => Logger;
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

const levelOrder: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function parseLogLevel(value: string | undefined): LogLevel {
  if (value === "debug" || value === "info" || value === "warn" || value === "error") return value;
  const nodeEnv = process.env.NODE_ENV;
  return nodeEnv && nodeEnv !== "production" ? "debug" : "info";
}

function serializeError(error: Error): Record<string, unknown> {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
}

function formatLogArgs(args: unknown[]): { message: string; data?: unknown } {
  if (args.length === 0) return { message: "" };

  const [first, second] = args;

  if (typeof first === "string") {
    return { message: first, data: args.length > 1 ? args.slice(1) : undefined };
  }

  if (typeof second === "string") {
    return { message: second, data: first instanceof Error ? serializeError(first) : first };
  }

  if (first instanceof Error) {
    return { message: first.message, data: serializeError(first) };
  }

  try {
    return { message: JSON.stringify(first) };
  } catch {
    return { message: String(first) };
  }
}

class SimpleLogger implements Logger {
  private readonly level: LogLevel;
  private readonly bindings: Record<string, unknown>;

  constructor(options: { level: LogLevel; bindings?: Record<string, unknown> }) {
    this.level = options.level;
    this.bindings = options.bindings ?? {};
  }

  child(bindings: Record<string, unknown>): Logger {
    return new SimpleLogger({ level: this.level, bindings: { ...this.bindings, ...bindings } });
  }

  debug(...args: unknown[]): void {
    this.write("debug", args);
  }

  info(...args: unknown[]): void {
    this.write("info", args);
  }

  warn(...args: unknown[]): void {
    this.write("warn", args);
  }

  error(...args: unknown[]): void {
    this.write("error", args);
  }

  private write(level: LogLevel, args: unknown[]): void {
    if (levelOrder[level] < levelOrder[this.level]) return;

    const { message, data } = formatLogArgs(args);
    const entry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      service: "payment-api",
      environment: process.env.NODE_ENV,
      ...this.bindings,
    };

    if (message) entry.message = message;
    if (data !== undefined) entry.data = data;

    const text = JSON.stringify(entry);

    if (level === "error") console.error(text);
    else if (level === "warn") console.warn(text);
    else if (level === "debug") console.debug(text);
    else console.info(text);
  }
}

export const logger: Logger = new SimpleLogger({ level: parseLogLevel(process.env.LOG_LEVEL) });

export function createChildLogger(bindings: Record<string, unknown>): Logger {
  return logger.child(bindings);
}

export function getRequestLogger(req: {
  id?: string | undefined;
  method?: string | undefined;
  url?: string | undefined;
  ip?: string | undefined;
}): Logger {
  return logger.child({
    reqId: req.id,
    method: req.method,
    url: req.url,
    ip: req.ip,
  });
}
