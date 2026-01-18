import Stripe from "stripe"

// Server-side Stripe client
// Only initialize if STRIPE_SECRET_KEY is available
const stripeSecretKey = process.env.STRIPE_SECRET_KEY

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2025-12-15.clover",
      typescript: true,
    })
  : (null as unknown as Stripe)

// Helper to check if Stripe is configured
export function isStripeConfigured(): boolean {
  return !!stripeSecretKey
}

// Client-side Stripe.js loader
export const getStripeJs = async () => {
  const { loadStripe } = await import("@stripe/stripe-js")
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
}

// Stripe price IDs from environment
export const STRIPE_PRICES = {
  monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY,
  yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY,
}
