"use client"

import { useViewTracking } from "@/hooks/use-view-tracking"

interface ViewTrackerProps {
  postId: string
}

/**
 * Client component to track post views
 * This component renders nothing but tracks views when mounted
 */
export function ViewTracker({ postId }: ViewTrackerProps) {
  useViewTracking(postId)
  return null
}
