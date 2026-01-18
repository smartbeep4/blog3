"use client"

import { formatDistanceToNow } from "date-fns"
import { ArrowLeft, Loader2, Check, Cloud, AlertCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useEditorStore } from "@/stores/editor-store"
import { cn } from "@/lib/utils"
import type { PostStatus } from "@prisma/client"

interface EditorHeaderProps {
  postId?: string | null
  status?: PostStatus
  onSave?: () => void
  onPublish?: () => void
  onSettings?: () => void
  isSaveDisabled?: boolean
  isPublishDisabled?: boolean
}

export function EditorHeader({
  postId,
  status = "DRAFT",
  onSave,
  onPublish,
  onSettings,
  isSaveDisabled,
  isPublishDisabled,
}: EditorHeaderProps) {
  const { isSaving, lastSaved, isDirty } = useEditorStore()

  const statusColors: Record<PostStatus, string> = {
    DRAFT:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    SCHEDULED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    PUBLISHED:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    ARCHIVED: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  }

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="container flex h-14 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/posts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>

          <Badge
            variant="secondary"
            className={cn("text-xs", statusColors[status])}
          >
            {status}
          </Badge>

          <div className="text-muted-foreground hidden items-center gap-2 text-sm sm:flex">
            {isSaving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Saving...</span>
              </>
            ) : isDirty ? (
              <>
                <AlertCircle className="h-3 w-3" />
                <span>Unsaved changes</span>
              </>
            ) : lastSaved ? (
              <>
                <Cloud className="h-3 w-3" />
                <span>
                  Saved {formatDistanceToNow(lastSaved, { addSuffix: true })}
                </span>
              </>
            ) : postId ? (
              <>
                <Check className="h-3 w-3" />
                <span>All changes saved</span>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onSettings && (
            <Button variant="outline" size="sm" onClick={onSettings}>
              Settings
            </Button>
          )}

          {onSave && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSave}
              disabled={isSaveDisabled || isSaving || !isDirty}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Draft"
              )}
            </Button>
          )}

          {onPublish && status !== "PUBLISHED" && (
            <Button
              size="sm"
              onClick={onPublish}
              disabled={isPublishDisabled || isSaving}
            >
              Publish
            </Button>
          )}

          {status === "PUBLISHED" && (
            <Button size="sm" variant="secondary" onClick={onSettings}>
              Update
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
