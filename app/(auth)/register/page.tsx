import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { RegisterForm } from "@/components/auth/register-form"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create a new account to get started",
}

export default async function RegisterPage() {
  const session = await getSession()

  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Create an account
          </h1>
          <p className="text-muted-foreground mt-2">
            Join our community of writers and readers
          </p>
        </div>
        <Suspense fallback={<RegisterFormSkeleton />}>
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  )
}

function RegisterFormSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="space-y-2">
        <div className="bg-muted h-4 w-12 rounded" />
        <div className="bg-muted h-10 rounded" />
      </div>
      <div className="space-y-2">
        <div className="bg-muted h-4 w-12 rounded" />
        <div className="bg-muted h-10 rounded" />
      </div>
      <div className="space-y-2">
        <div className="bg-muted h-4 w-16 rounded" />
        <div className="bg-muted h-10 rounded" />
      </div>
      <div className="space-y-2">
        <div className="bg-muted h-4 w-28 rounded" />
        <div className="bg-muted h-10 rounded" />
      </div>
      <div className="bg-muted h-10 rounded" />
    </div>
  )
}
