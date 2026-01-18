"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import type { Role } from "@prisma/client"

export function useAuth() {
  const { data: session, status, update } = useSession()
  const router = useRouter()

  const isLoading = status === "loading"
  const isAuthenticated = status === "authenticated"
  const user = session?.user

  // Check if user has at least the required role (role hierarchy)
  const hasRole = (requiredRole: Role): boolean => {
    if (!user?.role) return false
    const roleHierarchy: Role[] = ["READER", "AUTHOR", "EDITOR", "ADMIN"]
    const userRoleIndex = roleHierarchy.indexOf(user.role)
    const requiredRoleIndex = roleHierarchy.indexOf(requiredRole)
    return userRoleIndex >= requiredRoleIndex
  }

  // Check if user is at least an author
  const isAuthor = (): boolean => hasRole("AUTHOR")

  // Check if user is at least an editor
  const isEditor = (): boolean => hasRole("EDITOR")

  // Check if user is an admin
  const isAdmin = (): boolean => user?.role === "ADMIN"

  // Logout and redirect to home
  const logout = async (callbackUrl: string = "/") => {
    await signOut({ redirect: false })
    router.push(callbackUrl)
    router.refresh()
  }

  // Update session (e.g., after profile update)
  const updateSession = async (
    data: Partial<{ name: string; image: string }>
  ) => {
    await update(data)
  }

  // Require authentication - redirect to login if not authenticated
  const requireAuth = (callbackUrl?: string) => {
    if (!isLoading && !isAuthenticated) {
      const url = callbackUrl
        ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
        : "/login"
      router.push(url)
    }
  }

  // Require a specific role - redirect to dashboard if insufficient permissions
  const requireRole = (role: Role, redirectUrl: string = "/dashboard") => {
    if (!isLoading && !hasRole(role)) {
      router.push(redirectUrl)
    }
  }

  return {
    user,
    session,
    status,
    isLoading,
    isAuthenticated,
    hasRole,
    isAuthor,
    isEditor,
    isAdmin,
    logout,
    updateSession,
    requireAuth,
    requireRole,
  }
}

// Re-export signIn for convenience
export { signIn } from "next-auth/react"
