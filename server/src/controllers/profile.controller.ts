import { type Request, type Response, type NextFunction } from "express"
import User from "../models/user.model.ts"

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
      res.status(404).json({ success: false, message: "User not found" })
      return
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email })
      if (existingUser) {
        res.status(400).json({ success: false, message: "Email already in use" })
        return
      }
    }

    user.name = name ?? user.name
    user.email = email ?? user.email
    await user.save()

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        email: user.email,
        name: user.name,
      },
    })
  } catch (error) {
    next(error)
  }
}
