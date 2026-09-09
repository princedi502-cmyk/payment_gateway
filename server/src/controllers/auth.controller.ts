import bcrypt from "bcryptjs"
import crypto from "crypto"
import jwt from "jsonwebtoken"
import { type Request, type Response, type NextFunction } from "express"
import User from "../models/user.model.ts"
import { generateToken } from "../config/jwt.ts"
import { sendVerificationEmail, sendPasswordResetEmail } from "../services/mail.service.ts"
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError,
} from "../errors/AppError.ts"

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password, name } = req.body

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      throw new ConflictError("User already exists")
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const verificationToken = crypto.randomBytes(32).toString("hex")
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)

    const user = new User({
      email,
      password: hashedPassword,
      name,
      verificationToken,
      verificationTokenExpires,
    })
    await user.save()

    sendVerificationEmail(email, verificationToken).catch((err: Error) =>
      console.error("Failed to send verification email:", err)
    )

    res.status(201).json({
      success: true,
      message: "Registration successful. Please verify your email before logging in.",
    })
  } catch (error) {
    next(error)
  }
}

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email })
    if (!user) {
      throw new UnauthorizedError("Invalid credentials")
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000)
      throw new TooManyRequestsError(`Account temporarily locked. Try again in ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}.`)
    }

    if (!user.isVerified) {
      throw new ForbiddenError("Please verify your email before logging in")
    }

    if (!user.password) {
      throw new UnauthorizedError("Invalid credentials")
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000)
      }
      await user.save()

      throw new UnauthorizedError("Invalid credentials")
    }

    user.failedLoginAttempts = 0
    user.lockUntil = null
    await user.save()

    const token = generateToken(user._id.toString(), user.tokenVersion ?? 0)

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        email: user.email,
        name: user.name,
        token,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token } = req.query

    if (!token || typeof token !== "string") {
      throw new BadRequestError("Verification token is required")
    }

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: new Date() },
    })

    if (!user) {
      throw new BadRequestError("Invalid or expired verification token")
    }

    if (user.isVerified) {
      throw new BadRequestError("Email is already verified")
    }

     user.isVerified = true
     user.verificationToken = undefined as any
     user.verificationTokenExpires = undefined as any
     await user.save()

    res.status(200).json({
      success: true,
      data: { isVerified: user.isVerified },
      message: "Email verified successfully. You can now log in.",
    })
  } catch (error) {
    next(error)
  }
}

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body

    const user = await User.findOne({ email })

    if (user) {
      const resetPasswordToken = crypto.randomInt(100000, 999999).toString()
      const resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000)

      user.resetPasswordToken = resetPasswordToken
      user.resetPasswordExpires = resetPasswordExpires
      await user.save()

      sendPasswordResetEmail(email, resetPasswordToken).catch((err: Error) =>
        console.error("Failed to send password reset email:", err)
      )
    }

    res.status(200).json({
      success: true,
      message: "If an account with that email exists, we have sent a password reset OTP.",
    })
  } catch (error) {
    next(error)
  }
}

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token, newPassword } = req.body

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    })

    if (!user) {
      throw new BadRequestError("Invalid or expired reset token")
    }

    user.password = await bcrypt.hash(newPassword, 10)
    user.resetPasswordToken = undefined
    user.resetPasswordExpires = undefined
    user.tokenVersion = (user.tokenVersion ?? 0) + 1
    await user.save()

    res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now log in with your new password.",
    })
  } catch (error) {
    next(error)
  }
}

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).userId

    const user = await User.findById(userId).select("email name isVerified provider addresses createdAt")
    if (!user) {
      throw new NotFoundError("User")
    }

    res.status(200).json({
      success: true,
      data: user,
    })
  } catch (error) {
    next(error)
  }
}

export const getTokenFromCookie = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = (req as any).cookies?.auth_token
    if (!token) {
      throw new UnauthorizedError("No authentication token found")
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as unknown as { userId: string }
    const user = await User.findById(decoded.userId).select("email name isVerified provider addresses createdAt")
    if (!user) {
      throw new UnauthorizedError("User not found")
    }

    res.status(200).json({
      success: true,
      data: { token, user },
    })
  } catch (error) {
    next(error)
  }
}