import { type Request, type Response, type NextFunction } from "express"

export const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode

  const isDevelopment = process.env.NODE_ENV === "development"

  const response: Record<string, unknown> = {
    success: false,
    message: "Internal Server Error",
  }

  if (isDevelopment && error instanceof Error) {
    response.message = error.message
    response.stack = error.stack
  }

  res.status(statusCode).json(response)
}