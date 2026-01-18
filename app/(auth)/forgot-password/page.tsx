import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your password",
}

export default async function ForgotPasswordPage() {
  const session = await getSession()

  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Forgot password?
          </h1>
          <p className="text-muted-foreground mt-2">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>
        <Suspense fallback={<ForgotPasswordFormSkeleton />}>
          <ForgotPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}

function ForgotPasswordFormSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="space-y-2">
        <div className="bg-muted h-4 w-12 rounded" />
        <div className="bg-muted h-10 rounded" />
      </div>
      <div className="bg-muted h-10 rounded" />
    </div>
  )
}
