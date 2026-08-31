import jwt from "jsonwebtoken";

export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";

const WEAK_SECRETS = ["super_secret_jwt_key", "secret", "changeme", "jwt_secret", "password", "123456"]

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables")
}

if (JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters long")
}

if (WEAK_SECRETS.includes(JWT_SECRET.toLowerCase())) {
  throw new Error("JWT_SECRET is a known weak value - please change it to a random string")
}

export const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as any)
};