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
import { useCreatePost, useUpdatePost, usePublishPost } from "@/hooks/use-posts"
import { Editor } from "@/components/editor/editor"
import { CoverImagePicker } from "@/components/editor/cover-image-picker"
import { EditorHeader } from "./editor-header"
import { PublishSettings } from "./publish-settings"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Container } from "@/components/layout/container"

export function NewPostEditor() {
  const router = useRouter()
  const [settingsOpen, setSettingsOpen] = useState(false)

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
    postId,
    isDirty,
    setTitle,
    setSubtitle,
    setContent,
    setCoverImage,
    setPostId,
    setIsSaving,
    markAsSaved,
    resetEditor,
    initializePost,
  } = useEditorStore()

  const createPost = useCreatePost()
  const updatePost = useUpdatePost()
  const publishPost = usePublishPost()

  // Reset editor on mount
  useEffect(() => {
    resetEditor()
  }, [resetEditor])

  // Save post (create or update)
  const savePost = useCallback(async () => {
    if (!title.trim()) {
      toast.error("Please add a title")
      return
    }

    setIsSaving(true)

    try {
      if (postId) {
        // Update existing post
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
      } else {
        // Create new post
        const result = await createPost.mutateAsync({
          title,
          subtitle: subtitle || undefined,
          content,
          coverImage,
          isPremium,
          categories,
          tags,
          metaTitle: metaTitle || undefined,
          metaDescription: metaDescription || undefined,
          status: "DRAFT",
        })

        // Store the post ID for subsequent saves
        setPostId(result.data.id)
      }

      markAsSaved()
      toast.success("Draft saved")
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
    createPost,
    updatePost,
    setPostId,
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
    if (isDirty && title.trim()) {
      debouncedSave()
    }
  }, [isDirty, title, subtitle, content, coverImage, debouncedSave])

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
      let id = postId

      // Save first if needed
      if (!id) {
        const result = await createPost.mutateAsync({
          title,
          subtitle: subtitle || undefined,
          content,
          coverImage,
          isPremium,
          categories,
          tags,
          metaTitle: metaTitle || undefined,
          metaDescription: metaDescription || undefined,
          status: "DRAFT",
        })
        id = result.data.id
        setPostId(id)
      } else if (isDirty) {
        await updatePost.mutateAsync({
          id,
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

      // Now publish
      await publishPost.mutateAsync({ id })

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
      let id = postId

      // Save first if needed
      if (!id) {
        const result = await createPost.mutateAsync({
          title,
          subtitle: subtitle || undefined,
          content,
          coverImage,
          isPremium,
          categories,
          tags,
          metaTitle: metaTitle || undefined,
          metaDescription: metaDescription || undefined,
          status: "DRAFT",
        })
        id = result.data.id
        setPostId(id)
      }

      // Schedule
      await publishPost.mutateAsync({
        id,
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

  const wordCount = getWordCount(content)
  const readingTime = getReadingTime(content)

  return (
    <div className="bg-background min-h-screen">
      <EditorHeader
        postId={postId}
        status="DRAFT"
        onSave={savePost}
        onPublish={() => setSettingsOpen(true)}
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
        onPublish={handlePublish}
        onSchedule={handleSchedule}
        onSave={savePost}
      />
    </div>
  )
}
