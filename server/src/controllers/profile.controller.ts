import { type Request, type Response, type NextFunction } from "express"
import crypto from "crypto"
import User from "../models/user.model.ts"
import { sendVerificationEmail } from "../services/mail.service.ts"
import { NotFoundError, ConflictError } from "../errors/AppError.ts"

export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).userId
    const { name, email } = req.body

    const user = await User.findById(userId)
    if (!user) {
      throw new NotFoundError("User")
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email })
      if (existingUser) {
        throw new ConflictError("Email already in use")
      }
      user.email = email
      user.isVerified = false
      user.verificationToken = crypto.randomBytes(32).toString("hex")
      user.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)
      sendVerificationEmail(email, user.verificationToken).catch((err: Error) =>
        console.error("Failed to send verification email:", err)
      )
    }

    user.name = name ?? user.name
    await user.save()

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        email: user.email,
        name: user.name,
        isVerified: user.isVerified,
      },
    })
  } catch (error) {
    next(error)
  }
}