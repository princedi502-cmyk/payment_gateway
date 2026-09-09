import { type Request, type Response, type NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

export const requestIdMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const requestId = (req.headers["x-request-id"] as string) || uuidv4();
  req.id = requestId;
  next();
};

export const responseHeadersMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.setHeader("X-Request-ID", req.id);
  next();
};