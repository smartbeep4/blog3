import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { EditPostEditor } from "@/components/dashboard/edit-post-editor"

export const metadata = {
  title: "Edit Post",
  description: "Edit your blog post",
}

interface EditPostPageProps {
  params: Promise<{ id: string }>
}

export default async function EditPostPage({ params }: EditPostPageProps) {
  const { id } = await params
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  // Check if post exists and user has permission
  const post = await prisma.post.findUnique({
    where: { id },
    select: { id: true, authorId: true },
  })

  if (!post) {
    notFound()
  }

  // Check permissions
  const isAuthor = session.user.id === post.authorId
  const isEditorOrAdmin =
    session.user.role === "EDITOR" || session.user.role === "ADMIN"

  if (!isAuthor && !isEditorOrAdmin) {
    redirect("/dashboard/posts")
  }

  return <EditPostEditor postId={id} />
}
