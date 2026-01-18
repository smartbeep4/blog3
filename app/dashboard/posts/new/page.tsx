import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { NewPostEditor } from "@/components/dashboard/new-post-editor"

export const metadata = {
  title: "New Post",
  description: "Create a new blog post",
}

export default async function NewPostPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  // Check if user can create posts
  const canCreatePosts = ["AUTHOR", "EDITOR", "ADMIN"].includes(
    session.user.role
  )

  if (!canCreatePosts) {
    redirect("/dashboard")
  }

  return <NewPostEditor />
}
