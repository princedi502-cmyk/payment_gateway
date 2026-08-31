import { type Request, type Response, type NextFunction } from "express"
import jwt from "jsonwebtoken"
import { JWT_SECRET } from "../config/jwt.ts"
import User from "../models/user.model.ts"

export const authenticateUser = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1] as string
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as unknown as { userId: string }
      ;(req as any).userId = decoded.userId
      next()
      return
    } catch {
      res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      })
      return
    }
  } else {
    res.status(401).json({
      success: false,
      message: "Authorization token is required",
    })
    return
  }
}

export const authenticateAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "Authorization token is required",
    })
    return
  }

  const token = authHeader.split(" ")[1] as string
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as unknown as { userId: string }
    const user = await User.findById(decoded.userId).select("role")

    if (!user || user.role !== "admin") {
      res.status(403).json({
        success: false,
        message: "Admin access required",
      })
      return
    }

    ;(req as any).userId = decoded.userId
    next()
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    })
    return
  }
}