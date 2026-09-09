import { type Request, type Response, type NextFunction } from "express";
import { ZodError } from "zod";
import multer from "multer";
import mongoose from "mongoose";
import { logger, getRequestLogger } from "../config/logger.js";
import {
  AppError,
  isAppError,
  isOperationalError,
  ValidationError as AppValidationError,
} from "../errors/AppError.js";

const isDevelopment = process.env.NODE_ENV === "development";

function normalizeMongooseError(error: mongoose.Error): { statusCode: number; message: string; code: string; details?: unknown } {
  if (error instanceof mongoose.Error.ValidationError) {
    const details = Object.values(error.errors).map((err) => ({
      field: err.path,
      message: err.message,
      kind: err.kind,
    }));
    return {
      statusCode: 400,
      message: "Validation failed",
      code: "VALIDATION_ERROR",
      details,
    };
  }

  if (error instanceof mongoose.Error.CastError) {
    return {
      statusCode: 400,
      message: `Invalid ${error.kind}: "${error.value}" for field "${error.path}"`,
      code: "INVALID_ID_FORMAT",
      details: { path: error.path, value: error.value, kind: error.kind },
    };
  }

  if (error instanceof mongoose.Error.VersionError) {
    return {
      statusCode: 409,
      message: "Document was modified concurrently. Please retry.",
      code: "VERSION_CONFLICT",
    };
  }

  return {
    statusCode: 500,
    message: "Database error",
    code: "DATABASE_ERROR",
  };
}

function normalizeMulterError(error: multer.MulterError): { statusCode: number; message: string; code: string } {
  switch (error.code) {
    case "LIMIT_FILE_SIZE":
      return {
        statusCode: 400,
        message: "File size exceeds the maximum allowed limit",
        code: "FILE_TOO_LARGE",
      };
    case "LIMIT_FILE_COUNT":
      return {
        statusCode: 400,
        message: "Too many files uploaded",
        code: "TOO_MANY_FILES",
      };
    case "LIMIT_UNEXPECTED_FILE":
      return {
        statusCode: 400,
        message: "Unexpected file field",
        code: "UNEXPECTED_FILE_FIELD",
      };
    case "LIMIT_PART_COUNT":
      return {
        statusCode: 400,
        message: "Too many parts in multipart request",
        code: "TOO_MANY_PARTS",
      };
    case "LIMIT_FIELD_KEY":
    case "LIMIT_FIELD_VALUE":
    case "LIMIT_FIELD_COUNT":
      return {
        statusCode: 400,
        message: "Field limits exceeded",
        code: "FIELD_LIMIT_EXCEEDED",
      };
    default:
      return {
        statusCode: 400,
        message: error.message,
        code: "UPLOAD_ERROR",
      };
  }
}

function normalizeZodError(error: ZodError): { statusCode: number; message: string; code: string; details: unknown } {
  const details = error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }));
  return {
    statusCode: 400,
    message: "Validation failed",
    code: "VALIDATION_ERROR",
    details,
  };
}

function normalizeSyntaxError(error: SyntaxError): { statusCode: number; message: string; code: string } {
  return {
    statusCode: 400,
    message: "Invalid JSON in request body",
    code: "INVALID_JSON",
  };
}

function normalizeJwtError(error: Error): { statusCode: number; message: string; code: string } {
  if (error.name === "TokenExpiredError") {
    return { statusCode: 401, message: "Token has expired", code: "TOKEN_EXPIRED" };
  }
  if (error.name === "JsonWebTokenError") {
    return { statusCode: 401, message: "Invalid token", code: "INVALID_TOKEN" };
  }
  if (error.name === "NotBeforeError") {
    return { statusCode: 401, message: "Token not yet valid", code: "TOKEN_NOT_ACTIVE" };
  }
  return { statusCode: 401, message: "Authentication failed", code: "AUTH_ERROR" };
}

function normalizeError(error: unknown): { statusCode: number; message: string; code: string; details?: unknown; isOperational: boolean } {
  if (isAppError(error)) {
    return {
      statusCode: error.statusCode,
      message: error.message,
      code: error.code ?? "APP_ERROR",
      details: error.details,
      isOperational: error.isOperational,
    };
  }

  if (error instanceof ZodError) {
    const normalized = normalizeZodError(error);
    return { ...normalized, isOperational: true };
  }

  if (error instanceof multer.MulterError) {
    const normalized = normalizeMulterError(error);
    return { ...normalized, isOperational: true };
  }

  if (error instanceof mongoose.Error) {
    const normalized = normalizeMongooseError(error);
    return { ...normalized, isOperational: normalized.statusCode < 500 };
  }

  if (error instanceof SyntaxError && "status" in error && (error as any).status === 400) {
    const normalized = normalizeSyntaxError(error);
    return { ...normalized, isOperational: true };
  }

  if (error instanceof Error && (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError" || error.name === "NotBeforeError")) {
    const normalized = normalizeJwtError(error);
    return { ...normalized, isOperational: true };
  }

  if (error instanceof Error && error.message.includes("CORS")) {
    return {
      statusCode: 403,
      message: "CORS policy violation",
      code: "CORS_ERROR",
      isOperational: true,
    };
  }

  if (error instanceof Error && (error.name === "MongoServerError" || error.name === "MongoError")) {
    const mongoError = error as any;
    if (mongoError.code === 11000) {
      return {
        statusCode: 409,
        message: "Resource already exists",
        code: "DUPLICATE_KEY",
        isOperational: true,
        details: { keyValue: mongoError.keyValue },
      };
    }
    if (mongoError.code === 11001) {
      return {
        statusCode: 409,
        message: "Duplicate key on update",
        code: "DUPLICATE_KEY_UPDATE",
        isOperational: true,
      };
    }
    return {
      statusCode: 500,
      message: "Database operation failed",
      code: "DATABASE_ERROR",
      isOperational: false,
    };
  }

  if (error instanceof Error) {
    return {
      statusCode: 500,
      message: isDevelopment ? error.message : "Internal server error",
      code: "INTERNAL_ERROR",
      isOperational: false,
      details: isDevelopment ? { stack: error.stack } : undefined,
    };
  }

  return {
    statusCode: 500,
    message: "Internal server error",
    code: "UNKNOWN_ERROR",
    isOperational: false,
  };
}

export const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (res.headersSent) {
    return;
  }

  const requestLogger = getRequestLogger(req);
  const normalized = normalizeError(error);

  const logLevel = normalized.isOperational ? "warn" : "error";
  requestLogger[logLevel]({ err: error, code: normalized.code, statusCode: normalized.statusCode }, normalized.message);

  const response: Record<string, unknown> = {
    success: false,
    message: normalized.message,
    code: normalized.code,
    requestId: req.id,
  };

  if (normalized.details) {
    response.details = normalized.details;
  }

  if (isDevelopment && error instanceof Error && !normalized.isOperational) {
    response.stack = error.stack;
  }

  res.status(normalized.statusCode).json(response);
};

export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    code: "NOT_FOUND",
  });
};

export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};