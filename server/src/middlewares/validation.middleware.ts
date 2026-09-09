import { type Request, type Response, type NextFunction } from "express";
import { z, type ZodError } from "zod";
import { ValidationError } from "../errors/AppError.js";

type Schema = z.ZodTypeAny;

export const validate =
  (schema: Schema, source: "body" | "query" | "params" = "body") =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const data = source === "body" ? req.body : source === "query" ? req.query : req.params;

    const result = schema.safeParse(data);

    if (!result.success) {
      const error = result.error as ZodError;
      const validationErrors = error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      throw new ValidationError(validationErrors);
    }

    if (source === "body") req.body = result.data;
    if (source === "query") Object.defineProperty(req, "query", { value: result.data, writable: true, configurable: true });
    if (source === "params") Object.defineProperty(req, "params", { value: result.data, writable: true, configurable: true });

    next();
  };