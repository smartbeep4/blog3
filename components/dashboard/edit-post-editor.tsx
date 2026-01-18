"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useDebouncedCallback } from "use-debounce"
import type { JSONContent } from "@tiptap/react"
import {
  useEditorStore,
  getWordCount,
  getReadingTime,
} from "@/stores/editor-store"
import {
  usePost,
  useUpdatePost,
  usePublishPost,
  useUnpublishPost,
} from "@/hooks/use-posts"
import { Editor } from "@/components/editor/editor"
import { CoverImagePicker } from "@/components/editor/cover-image-picker"
import { EditorHeader } from "./editor-header"
import { PublishSettings } from "./publish-settings"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Container } from "@/components/layout/container"
import type { PostStatus } from "@prisma/client"

interface EditPostEditorProps {
  postId: string
}

export function EditPostEditor({ postId }: EditPostEditorProps) {
  const router = useRouter()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  const { data: postData, isLoading, error } = usePost(postId)

  const {
    title,
    subtitle,
    content,
    coverImage,
    isPremium,
    categories,
    tags,
    metaTitle,
    metaDescription,
    isDirty,
    setTitle,
    setSubtitle,
    setContent,
    setCoverImage,
    setIsSaving,
    markAsSaved,
    initializePost,
    resetEditor,
  } = useEditorStore()

  const updatePost = useUpdatePost()
  const publishPost = usePublishPost()
  const unpublishPost = useUnpublishPost()

  // Initialize editor with post data
  useEffect(() => {
    if (postData?.data && !isInitialized) {
      const post = postData.data
      initializePost({
        title: post.title,
        subtitle: post.subtitle || "",
        content: post.content as JSONContent | null,
        coverImage: post.coverImage,
        isPremium: post.isPremium,
        categories: post.categories.map((c) => c.id),
        tags: post.tags.map((t) => t.name),
        metaTitle: post.metaTitle || "",
        metaDescription: post.metaDescription || "",
        postId: post.id,
      })
      setIsInitialized(true)
    }
  }, [postData, isInitialized, initializePost])

  // Reset on unmount
  useEffect(() => {
    return () => {
      resetEditor()
    }
  }, [resetEditor])

  // Get current status from post data
  const status: PostStatus = postData?.data?.status || "DRAFT"

  // Save post
  const savePost = useCallback(async () => {
    if (!title.trim()) {
      toast.error("Please add a title")
      return
    }

    setIsSaving(true)

    try {
      await updatePost.mutateAsync({
        id: postId,
        data: {
          title,
          subtitle: subtitle || null,
          content,
          coverImage,
          isPremium,
          categories,
          tags,
          metaTitle: metaTitle || null,
          metaDescription: metaDescription || null,
        },
      })

      markAsSaved()
      toast.success("Changes saved")
    } catch (error) {
      setIsSaving(false)
      toast.error(
        error instanceof Error ? error.message : "Failed to save post"
      )
    }
  }, [
    title,
    subtitle,
    content,
    coverImage,
    isPremium,
    categories,
    tags,
    metaTitle,
    metaDescription,
    postId,
    updatePost,
    setIsSaving,
    markAsSaved,
  ])

  // Debounced autosave
  const debouncedSave = useDebouncedCallback(async () => {
    if (isDirty && title.trim()) {
      await savePost()
    }
  }, 3000)

  // Trigger autosave when content changes
  useEffect(() => {
    if (isDirty && title.trim() && isInitialized) {
      debouncedSave()
    }
  }, [
    isDirty,
    title,
    subtitle,
    content,
    coverImage,
    isInitialized,
    debouncedSave,
  ])

  const handlePublish = async () => {
    if (!title.trim()) {
      toast.error("Please add a title")
      return
    }

    // Check if content has actual text
    const wordCount = getWordCount(content)
    if (wordCount === 0) {
      toast.error("Please add some content before publishing")
      return
    }

    setIsSaving(true)

    try {
      // Save changes first if dirty
      if (isDirty) {
        await updatePost.mutateAsync({
          id: postId,
          data: {
            title,
            subtitle: subtitle || null,
            content,
            coverImage,
            isPremium,
            categories,
            tags,
            metaTitle: metaTitle || null,
            metaDescription: metaDescription || null,
          },
        })
      }

      // Publish
      await publishPost.mutateAsync({ id: postId })

      toast.success("Post published!")
      router.push("/dashboard/posts")
    } catch (error) {
      setIsSaving(false)
      toast.error(
        error instanceof Error ? error.message : "Failed to publish post"
      )
    }
  }

  const handleSchedule = async (date: Date) => {
    if (!title.trim()) {
      toast.error("Please add a title")
      return
    }

    setIsSaving(true)

    try {
      // Save changes first if dirty
      if (isDirty) {
        await updatePost.mutateAsync({
          id: postId,
          data: {
            title,
            subtitle: subtitle || null,
            content,
            coverImage,
            isPremium,
            categories,
            tags,
            metaTitle: metaTitle || null,
            metaDescription: metaDescription || null,
          },
        })
      }

      // Schedule
      await publishPost.mutateAsync({
        id: postId,
        data: { scheduledFor: date.toISOString() },
      })

      toast.success("Post scheduled!")
      router.push("/dashboard/posts")
    } catch (error) {
      setIsSaving(false)
      toast.error(
        error instanceof Error ? error.message : "Failed to schedule post"
      )
    }
  }

  const handleContentChange = useCallback(
    (newContent: JSONContent) => {
      setContent(newContent)
    },
    [setContent]
  )

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen">
        <div className="border-b">
          <Container className="py-3">
            <Skeleton className="h-8 w-48" />
          </Container>
        </div>
        <Container className="max-w-3xl space-y-6 py-8">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-64 w-full" />
        </Container>
      </div>
    )
  }

  if (error || !postData?.data) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-medium">Post not found</p>
          <p className="text-muted-foreground mt-2">
            The post you are looking for does not exist or you do not have
            permission to edit it.
          </p>
        </div>
      </div>
    )
  }

  const wordCount = getWordCount(content)
  const readingTime = getReadingTime(content)

  return (
    <div className="bg-background min-h-screen">
      <EditorHeader
        postId={postId}
        status={status}
        onSave={savePost}
        onPublish={
          status !== "PUBLISHED" ? () => setSettingsOpen(true) : undefined
        }
        onSettings={() => setSettingsOpen(true)}
      />

      <Container className="max-w-3xl py-8">
        <div className="space-y-6">
          {/* Cover Image */}
          <CoverImagePicker value={coverImage} onChange={setCoverImage} />

          {/* Title */}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Post title"
            className="placeholder:text-muted-foreground/50 h-auto border-0 px-0 py-2 font-serif text-4xl font-bold focus-visible:ring-0 focus-visible:ring-offset-0"
          />

          {/* Subtitle */}
          <Textarea
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Add a subtitle (optional)"
            className="text-muted-foreground placeholder:text-muted-foreground/50 min-h-[60px] resize-none border-0 px-0 text-xl focus-visible:ring-0 focus-visible:ring-offset-0"
            rows={2}
          />

          {/* Editor */}
          <Editor
            content={content}
            onChange={handleContentChange}
            placeholder="Start writing your story..."
          />

          {/* Word count and reading time */}
          <div className="text-muted-foreground flex items-center gap-4 border-t pt-4 text-sm">
            <span>{wordCount} words</span>
            <span>{readingTime} min read</span>
          </div>
        </div>
      </Container>

      <PublishSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onPublish={status !== "PUBLISHED" ? handlePublish : undefined}
        onSchedule={status !== "PUBLISHED" ? handleSchedule : undefined}
        onSave={savePost}
      />
    </div>
  )
}
