export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string | undefined;
  public readonly details: unknown;
  public readonly timestamp: Date;

  constructor(
    statusCode: number,
    message: string,
    options: {
      code?: string;
      details?: unknown;
      isOperational?: boolean;
    } = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = options.isOperational ?? true;
    this.code = options.code ?? undefined;
    this.details = options.details;
    this.timestamp = new Date();

    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, options: { code?: string; details?: unknown } = {}) {
    super(400, message, { ...options, code: options.code ?? "BAD_REQUEST" });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Authentication required", options: { code?: string; details?: unknown } = {}) {
    super(401, message, { ...options, code: options.code ?? "UNAUTHORIZED" });
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Access denied", options: { code?: string; details?: unknown } = {}) {
    super(403, message, { ...options, code: options.code ?? "FORBIDDEN" });
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Resource", options: { code?: string; details?: unknown } = {}) {
    super(404, `${resource} not found`, { ...options, code: options.code ?? "NOT_FOUND" });
  }
}

export class ConflictError extends AppError {
  constructor(message: string, options: { code?: string; details?: unknown } = {}) {
    super(409, message, { ...options, code: options.code ?? "CONFLICT" });
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string = "Too many requests", options: { code?: string; details?: unknown } = {}) {
    super(429, message, { ...options, code: options.code ?? "TOO_MANY_REQUESTS" });
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = "Internal server error", options: { code?: string; details?: unknown } = {}) {
    super(500, message, { ...options, isOperational: false, code: options.code ?? "INTERNAL_ERROR" });
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = "Service temporarily unavailable", options: { code?: string; details?: unknown } = {}) {
    super(503, message, { ...options, isOperational: false, code: options.code ?? "SERVICE_UNAVAILABLE" });
  }
}

export class ValidationError extends AppError {
  public readonly validationErrors: Array<{ field: string; message: string }>;

  constructor(errors: Array<{ field: string; message: string }>) {
    super(400, "Validation failed", { code: "VALIDATION_ERROR" });
    this.validationErrors = errors;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isOperationalError(error: unknown): boolean {
  return error instanceof AppError && error.isOperational;
}