import passport from "passport"
import { Strategy as GoogleStrategy } from "passport-google-oauth20"
import User from "../models/user.model.ts"

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000"

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  throw new Error("Google OAuth credentials are not defined in environment variables")
}

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: `${BACKEND_URL}/api/auth/google/callback`,
      scope: ["profile", "email"],
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value

        if (!email) {
          return done(new Error("No email found from Google account"), undefined)
        }

        let user = await User.findOne({ googleId: profile.id })

        if (user) {
          return done(null, user)
        }

        user = await User.findOne({ email })

        if (user) {
          user.googleId = profile.id
          user.provider = "google"
          user.isVerified = true
          await user.save()
          return done(null, user)
        }

        user = new User({
          email,
          name: profile.displayName,
          googleId: profile.id,
          provider: "google",
          isVerified: true,
        })
        await user.save()

        return done(null, user)
      } catch (error) {
        return done(error as Error, undefined)
      }
    }
  )
)

passport.serializeUser((user: any, done) => {
  done(null, user._id)
})

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id)
    done(null, user)
  } catch (error) {
    done(error, null)
  }
})

export default passport
