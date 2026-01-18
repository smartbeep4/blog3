"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Calendar, X, Plus, Tag, Folder, Globe, Lock } from "lucide-react"
import {
  useEditorStore,
  getWordCount,
  getReadingTime,
} from "@/stores/editor-store"
import { useCategories, useTags } from "@/hooks/use-posts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface PublishSettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPublish?: () => void
  onSchedule?: (date: Date) => void
  onSave?: () => void
}

export function PublishSettings({
  open,
  onOpenChange,
  onPublish,
  onSchedule,
  onSave,
}: PublishSettingsProps) {
  const {
    title,
    content,
    isPremium,
    categories,
    tags,
    metaTitle,
    metaDescription,
    setIsPremium,
    setCategories,
    setTags,
    setMetaTitle,
    setMetaDescription,
  } = useEditorStore()

  const { data: categoriesData } = useCategories()
  const { data: tagsData } = useTags()

  const [tagInput, setTagInput] = useState("")
  const [scheduleDate, setScheduleDate] = useState("")
  const [scheduleTime, setScheduleTime] = useState("")

  const wordCount = getWordCount(content)
  const readingTime = getReadingTime(content)

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim()
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag])
      setTagInput("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleCategoryChange = (categoryId: string) => {
    if (categories.includes(categoryId)) {
      setCategories(categories.filter((id) => id !== categoryId))
    } else {
      setCategories([...categories, categoryId])
    }
  }

  const handleSchedule = () => {
    if (scheduleDate && scheduleTime && onSchedule) {
      const date = new Date(`${scheduleDate}T${scheduleTime}`)
      onSchedule(date)
    }
  }

  const suggestedTags = tagsData?.data
    .filter((tag) => !tags.includes(tag.name))
    .slice(0, 5)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Post Settings</SheetTitle>
          <SheetDescription>
            Configure your post before publishing
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Post Stats */}
          <div className="text-muted-foreground flex items-center gap-4 text-sm">
            <span>{wordCount} words</span>
            <span>{readingTime} min read</span>
          </div>

          <Separator />

          {/* Premium Content */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  {isPremium ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    <Globe className="h-4 w-4" />
                  )}
                  Premium Content
                </Label>
                <p className="text-muted-foreground text-sm">
                  {isPremium
                    ? "Only paid subscribers can read this"
                    : "Anyone can read this post"}
                </p>
              </div>
              <Switch checked={isPremium} onCheckedChange={setIsPremium} />
            </div>
          </div>

          <Separator />

          {/* Categories */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <Folder className="h-4 w-4" />
              Categories
            </Label>
            <div className="flex flex-wrap gap-2">
              {categoriesData?.data.map((category) => (
                <Badge
                  key={category.id}
                  variant={
                    categories.includes(category.id) ? "default" : "outline"
                  }
                  className="cursor-pointer"
                  onClick={() => handleCategoryChange(category.id)}
                >
                  {category.name}
                </Badge>
              ))}
              {(!categoriesData?.data || categoriesData.data.length === 0) && (
                <p className="text-muted-foreground text-sm">
                  No categories available
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Tags */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Tags
            </Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add a tag..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddTag()
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={handleAddTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:bg-muted rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            {suggestedTags && suggestedTags.length > 0 && (
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs">Suggested:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedTags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      className="cursor-pointer"
                      onClick={() => setTags([...tags, tag.name])}
                    >
                      + {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* SEO Settings */}
          <div className="space-y-4">
            <Label>SEO Settings</Label>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="metaTitle"
                  className="text-muted-foreground text-sm"
                >
                  Meta Title ({(metaTitle || title).length}/60)
                </Label>
                <Input
                  id="metaTitle"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder={title || "Enter meta title"}
                  maxLength={60}
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="metaDescription"
                  className="text-muted-foreground text-sm"
                >
                  Meta Description ({metaDescription.length}/160)
                </Label>
                <Textarea
                  id="metaDescription"
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="Enter meta description for search engines"
                  maxLength={160}
                  rows={3}
                />
              </div>

              {/* SEO Preview */}
              <div className="bg-muted/30 rounded-lg border p-4">
                <p className="text-muted-foreground mb-2 text-xs">
                  Search Engine Preview
                </p>
                <div className="space-y-1">
                  <p className="line-clamp-1 text-lg font-medium text-blue-600 dark:text-blue-400">
                    {metaTitle || title || "Post Title"}
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-500">
                    example.com/posts/your-post-slug
                  </p>
                  <p className="text-muted-foreground line-clamp-2 text-sm">
                    {metaDescription || "No description provided"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Schedule */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Schedule
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                min={format(new Date(), "yyyy-MM-dd")}
              />
              <Input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
              />
            </div>
            {scheduleDate && scheduleTime && (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleSchedule}
              >
                Schedule for{" "}
                {format(
                  new Date(`${scheduleDate}T${scheduleTime}`),
                  "MMM d, yyyy 'at' h:mm a"
                )}
              </Button>
            )}
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {onPublish && (
              <Button onClick={onPublish} className="w-full">
                Publish Now
              </Button>
            )}
            {onSave && (
              <Button variant="outline" onClick={onSave} className="w-full">
                Save as Draft
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
