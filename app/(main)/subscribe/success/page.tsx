import { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CheckCircle, BookOpen, Settings } from "lucide-react"

export const metadata: Metadata = {
  title: "Subscription Successful",
  description: "Welcome to your premium subscription",
}

export default async function SubscriptionSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const params = await searchParams

  return (
    <div className="container max-w-lg py-24 text-center">
      <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
        <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
      </div>

      <h1 className="mb-4 font-serif text-3xl font-bold">Welcome aboard!</h1>

      <p className="text-muted-foreground mb-8 text-lg">
        Your subscription is now active. You have unlimited access to all
        premium content.
      </p>

      <div className="bg-muted/30 mb-8 rounded-lg border p-6 text-left">
        <h2 className="mb-4 font-semibold">What you can do now:</h2>
        <ul className="space-y-3 text-sm">
          <li className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
            <span>Read all premium articles without restrictions</span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
            <span>Access exclusive newsletter content</span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
            <span>Comment and engage with the community</span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
            <span>Manage your subscription in settings</span>
          </li>
        </ul>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
        <Button asChild size="lg">
          <Link href="/">
            <BookOpen className="mr-2 h-5 w-5" />
            Start Reading
          </Link>
        </Button>
        <Button variant="outline" size="lg" asChild>
          <Link href="/dashboard/settings">
            <Settings className="mr-2 h-5 w-5" />
            Manage Subscription
          </Link>
        </Button>
      </div>

      {params.session_id && (
        <p className="text-muted-foreground mt-8 text-xs">
          Session ID: {params.session_id.substring(0, 20)}...
        </p>
      )}
    </div>
  )
}
