import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Set a new password for your account",
}

export default async function ResetPasswordPage() {
  const session = await getSession()

  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Reset password</h1>
          <p className="text-muted-foreground mt-2">
            Enter your new password below
          </p>
        </div>
        <Suspense fallback={<ResetPasswordFormSkeleton />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}

function ResetPasswordFormSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="space-y-2">
        <div className="bg-muted h-4 w-20 rounded" />
        <div className="bg-muted h-10 rounded" />
      </div>
      <div className="space-y-2">
        <div className="bg-muted h-4 w-32 rounded" />
        <div className="bg-muted h-10 rounded" />
      </div>
      <div className="bg-muted h-10 rounded" />
    </div>
  )
}
