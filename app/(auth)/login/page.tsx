import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { LoginForm } from "@/components/auth/login-form"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your account",
}

export default async function LoginPage() {
  const session = await getSession()

  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground mt-2">
            Sign in to your account to continue
          </p>
        </div>
        <Suspense fallback={<LoginFormSkeleton />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}

function LoginFormSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="space-y-2">
        <div className="bg-muted h-4 w-12 rounded" />
        <div className="bg-muted h-10 rounded" />
      </div>
      <div className="space-y-2">
        <div className="bg-muted h-4 w-16 rounded" />
        <div className="bg-muted h-10 rounded" />
      </div>
      <div className="bg-muted h-10 rounded" />
    </div>
  )
}
