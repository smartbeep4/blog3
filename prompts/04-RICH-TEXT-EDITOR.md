# 04 - Rich Text Editor

## Overview

You are responsible for implementing the Tiptap-based rich text editor with all required extensions, slash commands, bubble menus, and a beautiful writing experience.

---

## Prerequisites

- Project setup complete (Agent 01)
- UI components available (Agent 15)
- File storage configured (Agent 13)

---

## Editor Features

1. **Text Formatting**: Bold, italic, underline, strikethrough, highlight
2. **Structure**: Headings (H1-H4), paragraphs, blockquotes
3. **Lists**: Bullet, numbered, task lists
4. **Code**: Inline code, code blocks with syntax highlighting
5. **Media**: Images, embeds (YouTube, Twitter)
6. **Advanced**: Links, horizontal rules, callouts

---

## Step 1: Install Tiptap Extensions

All extensions should be installed in Agent 01, but verify:

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder
npm install @tiptap/extension-link @tiptap/extension-image
npm install @tiptap/extension-code-block-lowlight @tiptap/extension-underline
npm install @tiptap/extension-text-align @tiptap/extension-highlight
npm install @tiptap/extension-typography @tiptap/extension-task-list
npm install @tiptap/extension-task-item @tiptap/extension-horizontal-rule
npm install lowlight
```

---

## Step 2: Create Editor Store

Create `stores/editor-store.ts`:

```typescript
import { create } from "zustand"

interface EditorState {
  title: string
  subtitle: string
  content: any
  coverImage: string | null
  isPremium: boolean
  categories: string[]
  tags: string[]
  isSaving: boolean
  lastSaved: Date | null
  isDirty: boolean

  // Actions
  setTitle: (title: string) => void
  setSubtitle: (subtitle: string) => void
  setContent: (content: any) => void
  setCoverImage: (url: string | null) => void
  setIsPremium: (isPremium: boolean) => void
  setCategories: (categories: string[]) => void
  setTags: (tags: string[]) => void
  setSaving: (isSaving: boolean) => void
  setLastSaved: (date: Date) => void
  setDirty: (isDirty: boolean) => void
  reset: () => void
}

const initialState = {
  title: "",
  subtitle: "",
  content: null,
  coverImage: null,
  isPremium: false,
  categories: [],
  tags: [],
  isSaving: false,
  lastSaved: null,
  isDirty: false,
}

export const useEditorStore = create<EditorState>((set) => ({
  ...initialState,

  setTitle: (title) => set({ title, isDirty: true }),
  setSubtitle: (subtitle) => set({ subtitle, isDirty: true }),
  setContent: (content) => set({ content, isDirty: true }),
  setCoverImage: (coverImage) => set({ coverImage, isDirty: true }),
  setIsPremium: (isPremium) => set({ isPremium, isDirty: true }),
  setCategories: (categories) => set({ categories, isDirty: true }),
  setTags: (tags) => set({ tags, isDirty: true }),
  setSaving: (isSaving) => set({ isSaving }),
  setLastSaved: (lastSaved) => set({ lastSaved, isDirty: false }),
  setDirty: (isDirty) => set({ isDirty }),
  reset: () => set(initialState),
}))
```

---

## Step 3: Create Core Editor Component

Create `components/editor/editor.tsx`:

```typescript
"use client"

import { useEditor, EditorContent, Editor as TiptapEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import Highlight from "@tiptap/extension-highlight"
import Typography from "@tiptap/extension-typography"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight"
import HorizontalRule from "@tiptap/extension-horizontal-rule"
import { common, createLowlight } from "lowlight"
import { useCallback, useEffect } from "react"
import { EditorBubbleMenu } from "./bubble-menu"
import { SlashCommandMenu } from "./slash-command-menu"
import { cn } from "@/lib/utils"

const lowlight = createLowlight(common)

interface EditorProps {
  content?: any
  onChange?: (content: any) => void
  onUpdate?: (editor: TiptapEditor) => void
  placeholder?: string
  editable?: boolean
  className?: string
}

export function Editor({
  content,
  onChange,
  onUpdate,
  placeholder = "Start writing... (Type '/' for commands)",
  editable = true,
  className,
}: EditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
        codeBlock: false, // Use CodeBlockLowlight instead
        horizontalRule: false, // Use custom HorizontalRule
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === "heading") {
            return `Heading ${node.attrs.level}`
          }
          return placeholder
        },
        showOnlyWhenEditable: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline cursor-pointer",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "rounded-lg max-w-full",
        },
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Typography,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: "rounded-lg bg-muted p-4 font-mono text-sm",
        },
      }),
      HorizontalRule.configure({
        HTMLAttributes: {
          class: "my-8 border-t border-border",
        },
      }),
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[500px]",
          "prose-headings:font-serif prose-headings:font-bold",
          "prose-p:text-lg prose-p:leading-relaxed",
          "prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic",
          className
        ),
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON())
      onUpdate?.(editor)
    },
  })

  // Update content when prop changes
  useEffect(() => {
    if (editor && content && !editor.isDestroyed) {
      const currentContent = editor.getJSON()
      if (JSON.stringify(currentContent) !== JSON.stringify(content)) {
        editor.commands.setContent(content)
      }
    }
  }, [editor, content])

  if (!editor) {
    return (
      <div className="min-h-[500px] animate-pulse bg-muted rounded-lg" />
    )
  }

  return (
    <div className="relative">
      <EditorBubbleMenu editor={editor} />
      <SlashCommandMenu editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}

// Export hook for external access
export function useEditorInstance() {
  return useEditor
}
```

---

## Step 4: Create Bubble Menu

Create `components/editor/bubble-menu.tsx`:

```typescript
"use client"

import { BubbleMenu, Editor } from "@tiptap/react"
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Link as LinkIcon,
  Highlighter,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Toggle } from "@/components/ui/toggle"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useState, useCallback } from "react"
import { cn } from "@/lib/utils"

interface EditorBubbleMenuProps {
  editor: Editor
}

export function EditorBubbleMenu({ editor }: EditorBubbleMenuProps) {
  const [linkUrl, setLinkUrl] = useState("")
  const [showLinkInput, setShowLinkInput] = useState(false)

  const setLink = useCallback(() => {
    if (linkUrl) {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: linkUrl })
        .run()
    } else {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
    }
    setShowLinkInput(false)
    setLinkUrl("")
  }, [editor, linkUrl])

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{
        duration: 100,
        placement: "top",
      }}
      className="flex items-center gap-1 p-1 bg-background border rounded-lg shadow-lg"
    >
      <Toggle
        size="sm"
        pressed={editor.isActive("bold")}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
        aria-label="Bold"
      >
        <Bold className="h-4 w-4" />
      </Toggle>

      <Toggle
        size="sm"
        pressed={editor.isActive("italic")}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Italic"
      >
        <Italic className="h-4 w-4" />
      </Toggle>

      <Toggle
        size="sm"
        pressed={editor.isActive("underline")}
        onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
        aria-label="Underline"
      >
        <Underline className="h-4 w-4" />
      </Toggle>

      <Toggle
        size="sm"
        pressed={editor.isActive("strike")}
        onPressedChange={() => editor.chain().focus().toggleStrike().run()}
        aria-label="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </Toggle>

      <div className="w-px h-4 bg-border mx-1" />

      <Toggle
        size="sm"
        pressed={editor.isActive("code")}
        onPressedChange={() => editor.chain().focus().toggleCode().run()}
        aria-label="Code"
      >
        <Code className="h-4 w-4" />
      </Toggle>

      <Toggle
        size="sm"
        pressed={editor.isActive("highlight")}
        onPressedChange={() => editor.chain().focus().toggleHighlight().run()}
        aria-label="Highlight"
      >
        <Highlighter className="h-4 w-4" />
      </Toggle>

      <div className="w-px h-4 bg-border mx-1" />

      <Popover open={showLinkInput} onOpenChange={setShowLinkInput}>
        <PopoverTrigger asChild>
          <Toggle
            size="sm"
            pressed={editor.isActive("link")}
            aria-label="Link"
          >
            <LinkIcon className="h-4 w-4" />
          </Toggle>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-2" side="top">
          <div className="flex gap-2">
            <Input
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  setLink()
                }
              }}
            />
            <Button size="sm" onClick={setLink}>
              {editor.isActive("link") ? "Update" : "Add"}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </BubbleMenu>
  )
}
```

---

## Step 5: Create Slash Command Menu

Create `components/editor/slash-command-menu.tsx`:

```typescript
"use client"

import { Editor, Extension } from "@tiptap/react"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Image,
  Minus,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface CommandItem {
  title: string
  description: string
  icon: React.ReactNode
  command: (editor: Editor) => void
}

const commands: CommandItem[] = [
  {
    title: "Heading 1",
    description: "Large section heading",
    icon: <Heading1 className="h-4 w-4" />,
    command: (editor) =>
      editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    icon: <Heading2 className="h-4 w-4" />,
    command: (editor) =>
      editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    title: "Heading 3",
    description: "Small section heading",
    icon: <Heading3 className="h-4 w-4" />,
    command: (editor) =>
      editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    title: "Bullet List",
    description: "Create a simple bullet list",
    icon: <List className="h-4 w-4" />,
    command: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    title: "Numbered List",
    description: "Create a numbered list",
    icon: <ListOrdered className="h-4 w-4" />,
    command: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    title: "Task List",
    description: "Create a checklist",
    icon: <CheckSquare className="h-4 w-4" />,
    command: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    title: "Blockquote",
    description: "Create a quote block",
    icon: <Quote className="h-4 w-4" />,
    command: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    title: "Code Block",
    description: "Add a code snippet",
    icon: <Code className="h-4 w-4" />,
    command: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    title: "Divider",
    description: "Add a horizontal line",
    icon: <Minus className="h-4 w-4" />,
    command: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    title: "Image",
    description: "Upload or embed an image",
    icon: <Image className="h-4 w-4" />,
    command: (editor) => {
      const url = window.prompt("Enter image URL:")
      if (url) {
        editor.chain().focus().setImage({ src: url }).run()
      }
    },
  },
]

interface SlashCommandMenuProps {
  editor: Editor
}

export function SlashCommandMenu({ editor }: SlashCommandMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const menuRef = useRef<HTMLDivElement>(null)

  const filteredCommands = commands.filter(
    (cmd) =>
      cmd.title.toLowerCase().includes(search.toLowerCase()) ||
      cmd.description.toLowerCase().includes(search.toLowerCase())
  )

  const executeCommand = useCallback(
    (index: number) => {
      const command = filteredCommands[index]
      if (command) {
        // Delete the slash and search text
        const { from } = editor.state.selection
        const textBefore = editor.state.doc.textBetween(
          Math.max(0, from - 20),
          from
        )
        const slashIndex = textBefore.lastIndexOf("/")
        if (slashIndex !== -1) {
          editor
            .chain()
            .focus()
            .deleteRange({
              from: from - (textBefore.length - slashIndex),
              to: from,
            })
            .run()
        }

        command.command(editor)
        setIsOpen(false)
        setSearch("")
      }
    },
    [editor, filteredCommands]
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return

      if (event.key === "ArrowUp") {
        event.preventDefault()
        setSelectedIndex((prev) =>
          prev === 0 ? filteredCommands.length - 1 : prev - 1
        )
      } else if (event.key === "ArrowDown") {
        event.preventDefault()
        setSelectedIndex((prev) =>
          prev === filteredCommands.length - 1 ? 0 : prev + 1
        )
      } else if (event.key === "Enter") {
        event.preventDefault()
        executeCommand(selectedIndex)
      } else if (event.key === "Escape") {
        setIsOpen(false)
        setSearch("")
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, selectedIndex, filteredCommands, executeCommand])

  useEffect(() => {
    const handleUpdate = () => {
      const { selection } = editor.state
      const { from } = selection

      // Get text before cursor
      const textBefore = editor.state.doc.textBetween(
        Math.max(0, from - 20),
        from
      )

      // Check for slash command
      const slashMatch = textBefore.match(/\/(\w*)$/)

      if (slashMatch) {
        setSearch(slashMatch[1] || "")
        setSelectedIndex(0)

        // Get cursor position
        const coords = editor.view.coordsAtPos(from)
        setPosition({
          top: coords.bottom + 8,
          left: coords.left,
        })

        setIsOpen(true)
      } else {
        setIsOpen(false)
        setSearch("")
      }
    }

    editor.on("update", handleUpdate)
    editor.on("selectionUpdate", handleUpdate)

    return () => {
      editor.off("update", handleUpdate)
      editor.off("selectionUpdate", handleUpdate)
    }
  }, [editor])

  if (!isOpen || filteredCommands.length === 0) return null

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-72 bg-background border rounded-lg shadow-lg overflow-hidden"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <div className="p-2 text-xs text-muted-foreground border-b">
        Type to filter...
      </div>
      <div className="max-h-64 overflow-y-auto">
        {filteredCommands.map((cmd, index) => (
          <button
            key={cmd.title}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted transition-colors",
              index === selectedIndex && "bg-muted"
            )}
            onClick={() => executeCommand(index)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded bg-muted">
              {cmd.icon}
            </div>
            <div>
              <div className="font-medium text-sm">{cmd.title}</div>
              <div className="text-xs text-muted-foreground">
                {cmd.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
```

---

## Step 6: Create Image Upload Component

Create `components/editor/image-upload.tsx`:

```typescript
"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Editor } from "@tiptap/react"
import { ImagePlus, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface ImageUploadProps {
  editor: Editor
  onUpload?: (url: string) => void
}

export function ImageUpload({ editor, onUpload }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)

  const uploadImage = useCallback(
    async (file: File) => {
      setIsUploading(true)

      try {
        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error("Upload failed")
        }

        const { url } = await response.json()

        // Insert image into editor
        editor.chain().focus().setImage({ src: url }).run()
        onUpload?.(url)
      } catch (error) {
        toast.error("Failed to upload image")
        console.error(error)
      } finally {
        setIsUploading(false)
      }
    },
    [editor, onUpload]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    multiple: false,
    onDrop: (files) => {
      if (files[0]) {
        uploadImage(files[0])
      }
    },
    onDropRejected: () => {
      toast.error("Image must be less than 5MB")
    },
  })

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
        isDragActive && "border-primary bg-primary/5",
        isUploading && "pointer-events-none opacity-50"
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-2">
        {isUploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        ) : (
          <ImagePlus className="h-8 w-8 text-muted-foreground" />
        )}
        <p className="text-sm text-muted-foreground">
          {isDragActive
            ? "Drop image here..."
            : "Drag & drop an image, or click to select"}
        </p>
        <p className="text-xs text-muted-foreground">Max size: 5MB</p>
      </div>
    </div>
  )
}
```

Install react-dropzone:

```bash
npm install react-dropzone
```

---

## Step 7: Create Cover Image Picker

Create `components/editor/cover-image-picker.tsx`:

```typescript
"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { ImagePlus, Loader2, X, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import Image from "next/image"

interface CoverImagePickerProps {
  value?: string | null
  onChange: (url: string | null) => void
}

export function CoverImagePicker({ value, onChange }: CoverImagePickerProps) {
  const [isUploading, setIsUploading] = useState(false)

  const uploadImage = useCallback(
    async (file: File) => {
      setIsUploading(true)

      try {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("folder", "covers")

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error("Upload failed")
        }

        const { url } = await response.json()
        onChange(url)
      } catch (error) {
        toast.error("Failed to upload cover image")
        console.error(error)
      } finally {
        setIsUploading(false)
      }
    },
    [onChange]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB for cover images
    multiple: false,
    onDrop: (files) => {
      if (files[0]) {
        uploadImage(files[0])
      }
    },
    onDropRejected: () => {
      toast.error("Image must be less than 10MB")
    },
  })

  if (value) {
    return (
      <div className="relative aspect-[2/1] w-full overflow-hidden rounded-lg">
        <Image
          src={value}
          alt="Cover image"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 1200px"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <div {...getRootProps()}>
            <input {...getInputProps()} />
            <Button size="sm" variant="secondary">
              <Upload className="h-4 w-4 mr-2" />
              Replace
            </Button>
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onChange(null)}
          >
            <X className="h-4 w-4 mr-2" />
            Remove
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        "aspect-[2/1] w-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors",
        isDragActive && "border-primary bg-primary/5",
        isUploading && "pointer-events-none opacity-50"
      )}
    >
      <input {...getInputProps()} />
      {isUploading ? (
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      ) : (
        <>
          <ImagePlus className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Add a cover image
          </p>
          <p className="text-xs text-muted-foreground">
            Recommended: 1200 x 600px
          </p>
        </>
      )}
    </div>
  )
}
```

---

## Step 8: Create Editor Toolbar

Create `components/editor/toolbar.tsx`:

```typescript
"use client"

import { Editor } from "@tiptap/react"
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
} from "lucide-react"
import { Toggle } from "@/components/ui/toggle"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface EditorToolbarProps {
  editor: Editor | null
  className?: string
}

export function EditorToolbar({ editor, className }: EditorToolbarProps) {
  if (!editor) return null

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1 p-2 border-b bg-muted/50",
        className
      )}
    >
      {/* History */}
      <Toggle
        size="sm"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        aria-label="Undo"
      >
        <Undo className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        aria-label="Redo"
      >
        <Redo className="h-4 w-4" />
      </Toggle>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Text formatting */}
      <Toggle
        size="sm"
        pressed={editor.isActive("bold")}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
        aria-label="Bold"
      >
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("italic")}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Italic"
      >
        <Italic className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("underline")}
        onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
        aria-label="Underline"
      >
        <Underline className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("strike")}
        onPressedChange={() => editor.chain().focus().toggleStrike().run()}
        aria-label="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </Toggle>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Headings */}
      <Toggle
        size="sm"
        pressed={editor.isActive("heading", { level: 1 })}
        onPressedChange={() =>
          editor.chain().focus().toggleHeading({ level: 1 }).run()
        }
        aria-label="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("heading", { level: 2 })}
        onPressedChange={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
        aria-label="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("heading", { level: 3 })}
        onPressedChange={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
        aria-label="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </Toggle>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Lists */}
      <Toggle
        size="sm"
        pressed={editor.isActive("bulletList")}
        onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
        aria-label="Bullet list"
      >
        <List className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("orderedList")}
        onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
        aria-label="Numbered list"
      >
        <ListOrdered className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("blockquote")}
        onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
        aria-label="Quote"
      >
        <Quote className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("codeBlock")}
        onPressedChange={() => editor.chain().focus().toggleCodeBlock().run()}
        aria-label="Code block"
      >
        <Code className="h-4 w-4" />
      </Toggle>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Alignment */}
      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: "left" })}
        onPressedChange={() =>
          editor.chain().focus().setTextAlign("left").run()
        }
        aria-label="Align left"
      >
        <AlignLeft className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: "center" })}
        onPressedChange={() =>
          editor.chain().focus().setTextAlign("center").run()
        }
        aria-label="Align center"
      >
        <AlignCenter className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: "right" })}
        onPressedChange={() =>
          editor.chain().focus().setTextAlign("right").run()
        }
        aria-label="Align right"
      >
        <AlignRight className="h-4 w-4" />
      </Toggle>
    </div>
  )
}
```

---

## Step 9: Create Full Post Editor Component

Create `components/editor/post-editor.tsx`:

```typescript
"use client"

import { useCallback, useEffect, useRef } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import Highlight from "@tiptap/extension-highlight"
import Typography from "@tiptap/extension-typography"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight"
import HorizontalRule from "@tiptap/extension-horizontal-rule"
import { common, createLowlight } from "lowlight"
import { useEditorStore } from "@/stores/editor-store"
import { EditorBubbleMenu } from "./bubble-menu"
import { SlashCommandMenu } from "./slash-command-menu"
import { CoverImagePicker } from "./cover-image-picker"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useDebouncedCallback } from "use-debounce"

const lowlight = createLowlight(common)

interface PostEditorProps {
  initialData?: {
    title?: string
    subtitle?: string
    content?: any
    coverImage?: string | null
  }
  onSave?: (data: {
    title: string
    subtitle: string
    content: any
    coverImage: string | null
  }) => Promise<void>
}

export function PostEditor({ initialData, onSave }: PostEditorProps) {
  const {
    title,
    subtitle,
    content,
    coverImage,
    isSaving,
    setTitle,
    setSubtitle,
    setContent,
    setCoverImage,
    setSaving,
    setLastSaved,
    setDirty,
  } = useEditorStore()

  const initialized = useRef(false)

  // Initialize store with initial data
  useEffect(() => {
    if (!initialized.current && initialData) {
      if (initialData.title) setTitle(initialData.title)
      if (initialData.subtitle) setSubtitle(initialData.subtitle)
      if (initialData.content) setContent(initialData.content)
      if (initialData.coverImage) setCoverImage(initialData.coverImage)
      setDirty(false)
      initialized.current = true
    }
  }, [initialData, setTitle, setSubtitle, setContent, setCoverImage, setDirty])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        codeBlock: false,
        horizontalRule: false,
      }),
      Placeholder.configure({
        placeholder: "Start writing... (Type '/' for commands)",
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline" },
      }),
      Image.configure({
        HTMLAttributes: { class: "rounded-lg max-w-full my-4" },
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      Typography,
      TaskList,
      TaskItem.configure({ nested: true }),
      CodeBlockLowlight.configure({ lowlight }),
      HorizontalRule,
    ],
    content: initialData?.content || "",
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[400px]",
          "prose-headings:font-serif prose-headings:font-bold",
          "prose-p:text-lg prose-p:leading-relaxed"
        ),
      },
    },
    onUpdate: ({ editor }) => {
      setContent(editor.getJSON())
    },
  })

  // Autosave with debounce
  const debouncedSave = useDebouncedCallback(async () => {
    if (!onSave || isSaving) return

    setSaving(true)
    try {
      await onSave({
        title,
        subtitle,
        content,
        coverImage,
      })
      setLastSaved(new Date())
    } catch (error) {
      console.error("Autosave failed:", error)
    } finally {
      setSaving(false)
    }
  }, 2000)

  // Trigger autosave on changes
  useEffect(() => {
    if (initialized.current) {
      debouncedSave()
    }
  }, [title, subtitle, content, coverImage, debouncedSave])

  return (
    <div className="max-w-4xl mx-auto">
      {/* Cover Image */}
      <div className="mb-8">
        <CoverImagePicker value={coverImage} onChange={setCoverImage} />
      </div>

      {/* Title */}
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Post title..."
        className="text-4xl font-bold font-serif border-0 px-0 focus-visible:ring-0 placeholder:text-muted-foreground/50"
      />

      {/* Subtitle */}
      <Input
        value={subtitle}
        onChange={(e) => setSubtitle(e.target.value)}
        placeholder="Add a subtitle (optional)..."
        className="text-xl text-muted-foreground border-0 px-0 mt-2 focus-visible:ring-0 placeholder:text-muted-foreground/40"
      />

      {/* Divider */}
      <div className="h-px bg-border my-8" />

      {/* Editor */}
      {editor && (
        <>
          <EditorBubbleMenu editor={editor} />
          <SlashCommandMenu editor={editor} />
        </>
      )}
      <EditorContent editor={editor} />
    </div>
  )
}
```

Install debounce hook:

```bash
npm install use-debounce
```

---

## Step 10: Export Editor Components

Create `components/editor/index.ts`:

```typescript
export { Editor } from "./editor"
export { EditorToolbar } from "./toolbar"
export { EditorBubbleMenu } from "./bubble-menu"
export { SlashCommandMenu } from "./slash-command-menu"
export { ImageUpload } from "./image-upload"
export { CoverImagePicker } from "./cover-image-picker"
export { PostEditor } from "./post-editor"
```

---

## Rendering Content (Read-Only)

For displaying published content, create `components/posts/post-content.tsx`:

```typescript
"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import Highlight from "@tiptap/extension-highlight"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight"
import HorizontalRule from "@tiptap/extension-horizontal-rule"
import { common, createLowlight } from "lowlight"

const lowlight = createLowlight(common)

interface PostContentProps {
  content: any
}

export function PostContent({ content }: PostContentProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        horizontalRule: false,
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: { class: "text-primary underline" },
      }),
      Image.configure({
        HTMLAttributes: { class: "rounded-lg max-w-full my-8" },
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight,
      TaskList,
      TaskItem,
      CodeBlockLowlight.configure({ lowlight }),
      HorizontalRule,
    ],
    content,
    editable: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-lg dark:prose-invert max-w-none prose-headings:font-serif",
      },
    },
  })

  if (!editor) {
    return <div className="animate-pulse h-96 bg-muted rounded-lg" />
  }

  return <EditorContent editor={editor} />
}
```

---

## Verification Checklist

- [ ] Editor renders without errors
- [ ] Text formatting works (bold, italic, underline, etc.)
- [ ] Headings work (H1-H4)
- [ ] Lists work (bullet, numbered, task)
- [ ] Blockquotes work
- [ ] Code blocks have syntax highlighting
- [ ] Slash command menu appears on "/"
- [ ] Bubble menu appears on text selection
- [ ] Images can be inserted via URL
- [ ] Image upload works (after Agent 13)
- [ ] Cover image picker works
- [ ] Autosave works with debounce
- [ ] Content can be serialized to JSON
- [ ] Read-only render works

---

## Files Created

```
components/editor/
├── editor.tsx
├── toolbar.tsx
├── bubble-menu.tsx
├── slash-command-menu.tsx
├── image-upload.tsx
├── cover-image-picker.tsx
├── post-editor.tsx
└── index.ts
components/posts/
└── post-content.tsx
stores/
└── editor-store.ts
```

---

## Next Steps

With the editor complete, the following agents can proceed:
- **Agent 05**: Post Management (uses PostEditor)
- **Agent 06**: Reader Experience (uses PostContent)
