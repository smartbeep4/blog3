"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

interface SubscriptionStatus {
  tier: "FREE" | "PAID"
  isActive: boolean
  isPaid: boolean
  expiresAt: string | null
  hasStripeCustomer: boolean
}

/**
 * Hook to fetch current user's subscription status
 */
export function useSubscription() {
  return useQuery<SubscriptionStatus>({
    queryKey: ["subscription"],
    queryFn: async () => {
      const res = await fetch("/api/subscriptions/status")
      if (!res.ok) {
        if (res.status === 401) {
          // Not logged in, return free tier
          return {
            tier: "FREE" as const,
            isActive: false,
            isPaid: false,
            expiresAt: null,
            hasStripeCustomer: false,
          }
        }
        throw new Error("Failed to fetch subscription")
      }
      return res.json()
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  })
}

/**
 * Hook to manage subscription (open Stripe customer portal)
 */
export function useManageSubscription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/subscriptions/portal", {
        method: "POST",
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to open billing portal")
      }

      return res.json()
    },
    onSuccess: ({ url }) => {
      if (url) {
        window.location.href = url
      }
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
    onSettled: () => {
      // Refetch subscription status after portal visit
      queryClient.invalidateQueries({ queryKey: ["subscription"] })
    },
  })
}

/**
 * Hook to start subscription checkout
 */
export function useSubscriptionCheckout() {
  return useMutation({
    mutationFn: async (priceId: string) => {
      const res = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to create checkout session")
      }

      return res.json()
    },
    onSuccess: ({ url }) => {
      if (url) {
        window.location.href = url
      }
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

/**
 * Helper to check if user has active premium subscription
 */
export function usePremiumAccess() {
  const { data: subscription, isLoading } = useSubscription()

  return {
    hasPremium: subscription?.isActive ?? false,
    isLoading,
    subscription,
  }
}
