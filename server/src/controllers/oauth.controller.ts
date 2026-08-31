import { type Request, type Response } from "express"
import passport from "passport"
import { generateToken } from "../config/jwt.ts"

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173"

export const googleAuth = passport.authenticate("google", {
  scope: ["profile", "email"],
  session: false,
})

export const googleCallback = (req: Request, res: Response) => {
  passport.authenticate("google", { session: false }, (err: Error | null, user: any) => {
    if (err) {
      console.error("Google OAuth error:", err)
      return res.redirect(`${FRONTEND_URL}/login?error=google_auth_failed`)
    }

    if (!user) {
      return res.redirect(`${FRONTEND_URL}/login?error=no_user`)
    }

    const token = generateToken(user._id.toString())

    res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}`)
  })(req, res)
}
