import { type Request, type Response, type NextFunction } from "express"
import jwt from "jsonwebtoken"
import { JWT_SECRET } from "../config/jwt.ts"
import User from "../models/user.model.ts"

export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1] as string
    try {
      const decoded = jwt.verify(token, JWT_SECRET!) as unknown as { userId: string; tokenVersion?: number }

      if (decoded.tokenVersion !== undefined) {
        const user = await User.findById(decoded.userId).select("tokenVersion")
        if (!user || user.tokenVersion !== decoded.tokenVersion) {
          res.status(401).json({
            success: false,
            message: "Token has been revoked",
          })
          return
        }
      }

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

/**
 * Makes the current user available to endpoints that are otherwise public.
 * An absent (or stale) bearer token must not make a public product page fail.
 */
export const attachUserIfAuthenticated = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith("Bearer ")) {
    next()
    return
  }

  try {
    const token = authHeader.split(" ")[1] as string
    const decoded = jwt.verify(token, JWT_SECRET!) as unknown as { userId: string; tokenVersion?: number }

    if (decoded.tokenVersion !== undefined) {
      const user = await User.findById(decoded.userId).select("tokenVersion")
      if (!user || user.tokenVersion !== decoded.tokenVersion) {
        next()
        return
      }
    }

    ;(req as any).userId = decoded.userId
  } catch {
    // This route is public. Authenticated review actions still use authenticateUser.
  }

  next()
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
    const decoded = jwt.verify(token, JWT_SECRET!) as unknown as { userId: string }
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
