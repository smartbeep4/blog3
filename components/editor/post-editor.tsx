"use client"

import { useCallback, useEffect, useRef } from "react"
import { useDebouncedCallback } from "use-debounce"
import type { JSONContent } from "@tiptap/react"
import {
  useEditorStore,
  getWordCount,
  getReadingTime,
} from "@/stores/editor-store"
import { Editor } from "./editor"
import { Toolbar } from "./toolbar"
import { CoverImagePicker } from "./cover-image-picker"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface PostEditorProps {
  onSave?: (data: {
    title: string
    subtitle: string
    content: JSONContent | null
    coverImage: string | null
    isPremium: boolean
    categories: string[]
    tags: string[]
    metaTitle: string
    metaDescription: string
  }) => Promise<void>
  showToolbar?: boolean
  autosaveDelay?: number
  className?: string
}

export function PostEditor({
  onSave,
  showToolbar = true,
  autosaveDelay = 2000,
  className,
}: PostEditorProps) {
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
    isSaving,
    setTitle,
    setSubtitle,
    setContent,
    setCoverImage,
    setIsSaving,
    markAsSaved,
  } = useEditorStore()

  const editorRef = useRef<HTMLDivElement>(null)

  // Debounced autosave
  const debouncedSave = useDebouncedCallback(async () => {
    if (!onSave || !isDirty || isSaving) return

    setIsSaving(true)
    try {
      await onSave({
        title,
        subtitle,
        content,
        coverImage,
        isPremium,
        categories,
        tags,
        metaTitle,
        metaDescription,
      })
      markAsSaved()
    } catch (error) {
      console.error("Autosave failed:", error)
      setIsSaving(false)
    }
  }, autosaveDelay)

  // Trigger autosave when content changes
  useEffect(() => {
    if (isDirty && onSave) {
      debouncedSave()
    }
  }, [isDirty, title, subtitle, content, coverImage, debouncedSave, onSave])

  const handleContentChange = useCallback(
    (newContent: JSONContent) => {
      setContent(newContent)
    },
    [setContent]
  )

  const wordCount = getWordCount(content)
  const readingTime = getReadingTime(content)

  return (
    <div className={cn("space-y-6", className)}>
      {/* Cover Image */}
      <CoverImagePicker value={coverImage} onChange={setCoverImage} />

      {/* Title */}
      <div className="space-y-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Post title"
          className="placeholder:text-muted-foreground/50 border-0 px-0 font-serif text-4xl font-bold focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>

      {/* Subtitle */}
      <div className="space-y-2">
        <Textarea
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="Add a subtitle (optional)"
          className="text-muted-foreground placeholder:text-muted-foreground/50 min-h-[60px] resize-none border-0 px-0 text-xl focus-visible:ring-0 focus-visible:ring-offset-0"
          rows={2}
        />
      </div>

      {/* Toolbar */}
      {showToolbar && (
        <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 -mx-4 px-4 py-2 backdrop-blur">
          <Toolbar editor={null} />
        </div>
      )}

      {/* Editor */}
      <div ref={editorRef}>
        <Editor
          content={content}
          onChange={handleContentChange}
          placeholder="Start writing your story..."
        />
      </div>

      {/* Word count and reading time */}
      <div className="text-muted-foreground flex items-center gap-4 border-t pt-4 text-sm">
        <span>{wordCount} words</span>
        <span>{readingTime} min read</span>
      </div>
    </div>
  )
}
