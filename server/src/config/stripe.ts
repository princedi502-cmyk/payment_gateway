import Stripe from "stripe"

const stripeKey = process.env.STRIPE_SECRET_KEY
if (!stripeKey) {
  throw new Error("STRIPE_SECRET_KEY is not defined in environment variables")
}

export const stripe = new Stripe(stripeKey, {
  apiVersion: "2025-04-30.basil",
} as any)
