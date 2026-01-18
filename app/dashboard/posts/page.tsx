import Link from "next/link"
import { Plus } from "lucide-react"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { PostsTable } from "@/components/dashboard/posts-table"

export const metadata = {
  title: "Posts",
  description: "Manage your blog posts",
}

export default async function PostsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  // Check if user can create posts
  const canCreatePosts = ["AUTHOR", "EDITOR", "ADMIN"].includes(
    session.user.role
  )

  return (
    <div className="space-y-6">
      <PageHeader title="Posts" description="Create and manage your blog posts">
        {canCreatePosts && (
          <Button asChild>
            <Link href="/dashboard/posts/new">
              <Plus className="mr-2 h-4 w-4" />
              New Post
            </Link>
          </Button>
        )}
      </PageHeader>

      <PostsTable
        authorId={session.user.role === "AUTHOR" ? session.user.id : undefined}
      />
    </div>
  )
}
