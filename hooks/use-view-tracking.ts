"use client"

import { useEffect, useRef } from "react"

/**
 * Hook to track post views
 * Sends a POST request to the view tracking API
 * Only tracks once per component mount
 */
export function useViewTracking(postId: string) {
  const hasTracked = useRef(false)

  useEffect(() => {
    if (hasTracked.current) return
    hasTracked.current = true

    // Track the view
    fetch(`/api/posts/${postId}/view`, {
      method: "POST",
    }).catch(() => {
      // Ignore errors - view tracking shouldn't block user experience
    })
  }, [postId])
}
