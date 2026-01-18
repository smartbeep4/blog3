import { redirect } from "next/navigation"
import { getSession, hasRole as checkRole } from "@/lib/auth"
import type { Role } from "@prisma/client"

/**
 * Server-side guard that requires authentication.
 * Redirects to login if user is not authenticated.
 *
 * @example
 * ```tsx
 * // In a server component
 * export default async function DashboardPage() {
 *   const user = await requireAuth()
 *   return <div>Welcome, {user.name}</div>
 * }
 * ```
 */
export async function requireAuth() {
  const session = await getSession()

  if (!session?.user) {
    redirect("/login")
  }

  return session.user
}

/**
 * Server-side guard that requires a specific role.
 * Redirects to login if not authenticated, or to dashboard if insufficient role.
 *
 * @param role - The minimum required role
 * @example
 * ```tsx
 * // In a server component
 * export default async function EditorPage() {
 *   const user = await requireRole("EDITOR")
 *   // User has EDITOR or ADMIN role
 * }
 * ```
 */
export async function requireRole(role: Role) {
  const session = await getSession()

  if (!session?.user) {
    redirect("/login")
  }

  if (!checkRole(session.user.role, role)) {
    redirect("/dashboard")
  }

  return session.user
}

/**
 * Server-side guard that requires AUTHOR role or higher.
 *
 * @example
 * ```tsx
 * export default async function CreatePostPage() {
 *   const user = await requireAuthor()
 *   // User can create posts
 * }
 * ```
 */
export async function requireAuthor() {
  return requireRole("AUTHOR")
}

/**
 * Server-side guard that requires EDITOR role or higher.
 *
 * @example
 * ```tsx
 * export default async function EditPostPage() {
 *   const user = await requireEditor()
 *   // User can edit any post
 * }
 * ```
 */
export async function requireEditor() {
  return requireRole("EDITOR")
}

/**
 * Server-side guard that requires ADMIN role.
 *
 * @example
 * ```tsx
 * export default async function AdminPage() {
 *   const user = await requireAdmin()
 *   // User is an admin
 * }
 * ```
 */
export async function requireAdmin() {
  return requireRole("ADMIN")
}

/**
 * Check if the current user can perform an action without redirecting.
 * Returns the user if authenticated and authorized, null otherwise.
 *
 * @param role - Optional minimum required role
 * @example
 * ```tsx
 * const user = await checkAuth("AUTHOR")
 * if (user) {
 *   // Show author-only content
 * }
 * ```
 */
export async function checkAuth(role?: Role) {
  const session = await getSession()

  if (!session?.user) {
    return null
  }

  if (role && !checkRole(session.user.role, role)) {
    return null
  }

  return session.user
}

/**
 * Guard for API routes that requires authentication.
 * Returns the user if authenticated, throws a response otherwise.
 *
 * @example
 * ```ts
 * // In an API route
 * export async function POST(request: Request) {
 *   const result = await requireAuthApi()
 *   if (!result.authorized) {
 *     return result.response
 *   }
 *   const user = result.user
 *   // ... rest of the handler
 * }
 * ```
 */
export async function requireAuthApi(): Promise<
  | {
      authorized: true
      user: { id: string; email: string; name: string; role: Role }
    }
  | { authorized: false; response: Response }
> {
  const session = await getSession()

  if (!session?.user) {
    return {
      authorized: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  return {
    authorized: true,
    user: session.user,
  }
}

/**
 * Guard for API routes that requires a specific role.
 * Returns the user if authenticated and authorized, throws a response otherwise.
 *
 * @param role - The minimum required role
 * @example
 * ```ts
 * // In an API route
 * export async function POST(request: Request) {
 *   const result = await requireRoleApi("AUTHOR")
 *   if (!result.authorized) {
 *     return result.response
 *   }
 *   const user = result.user
 *   // ... rest of the handler
 * }
 * ```
 */
export async function requireRoleApi(
  role: Role
): Promise<
  | {
      authorized: true
      user: { id: string; email: string; name: string; role: Role }
    }
  | { authorized: false; response: Response }
> {
  const session = await getSession()

  if (!session?.user) {
    return {
      authorized: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  if (!checkRole(session.user.role, role)) {
    return {
      authorized: false,
      response: Response.json({ error: "Forbidden" }, { status: 403 }),
    }
  }

  return {
    authorized: true,
    user: session.user,
  }
}
