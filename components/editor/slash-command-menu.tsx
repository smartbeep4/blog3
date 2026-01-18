"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { type Editor } from "@tiptap/react"
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Image as ImageIcon,
  Minus,
  CheckSquare,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useUpload } from "@/hooks/use-upload"

interface SlashCommandMenuProps {
  editor: Editor
  onAddImage: (url: string) => void
}

interface Command {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  action: () => void
}

export function SlashCommandMenu({
  editor,
  onAddImage,
}: SlashCommandMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const menuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { upload } = useUpload()

  const handleImageUpload = useCallback(async () => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      const result = await upload(file, "postImage")
      if (result) {
        onAddImage(result.url)
      }

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      setIsOpen(false)
    },
    [upload, onAddImage]
  )

  const commands: Command[] = [
    {
      title: "Heading 1",
      description: "Large section heading",
      icon: Heading1,
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      title: "Heading 2",
      description: "Medium section heading",
      icon: Heading2,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      title: "Heading 3",
      description: "Small section heading",
      icon: Heading3,
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      title: "Bullet List",
      description: "Create a simple bullet list",
      icon: List,
      action: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      title: "Numbered List",
      description: "Create a numbered list",
      icon: ListOrdered,
      action: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      title: "Task List",
      description: "Create a checklist",
      icon: CheckSquare,
      action: () => editor.chain().focus().toggleTaskList().run(),
    },
    {
      title: "Quote",
      description: "Capture a quote",
      icon: Quote,
      action: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      title: "Code Block",
      description: "Add a code snippet",
      icon: Code,
      action: () => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      title: "Image",
      description: "Upload an image",
      icon: ImageIcon,
      action: handleImageUpload,
    },
    {
      title: "Divider",
      description: "Visually divide blocks",
      icon: Minus,
      action: () => editor.chain().focus().setHorizontalRule().run(),
    },
  ]

  const filteredCommands = commands.filter((command) =>
    command.title.toLowerCase().includes(query.toLowerCase())
  )

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        )
      }

      if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        )
      }

      if (e.key === "Enter") {
        e.preventDefault()
        if (filteredCommands[selectedIndex]) {
          // Delete the slash and any query text
          editor
            .chain()
            .focus()
            .deleteRange({
              from: editor.state.selection.from - query.length - 1,
              to: editor.state.selection.from,
            })
            .run()
          filteredCommands[selectedIndex].action()
          setIsOpen(false)
          setQuery("")
        }
      }

      if (e.key === "Escape") {
        setIsOpen(false)
        setQuery("")
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, filteredCommands, selectedIndex, editor, query])

  // Listen for "/" key to open menu
  useEffect(() => {
    const handleSlash = () => {
      const { state } = editor
      const { selection } = state
      const { $from } = selection

      // Get the text before cursor in current block
      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset)

      // Check if the last character is "/"
      if (textBefore.endsWith("/")) {
        // Get cursor position for menu placement
        const coords = editor.view.coordsAtPos(selection.from)
        const editorRect = editor.view.dom.getBoundingClientRect()

        setPosition({
          top: coords.bottom - editorRect.top + 8,
          left: coords.left - editorRect.left,
        })
        setIsOpen(true)
        setQuery("")
        setSelectedIndex(0)
      } else if (isOpen) {
        // Update query as user types after "/"
        const slashIndex = textBefore.lastIndexOf("/")
        if (slashIndex !== -1) {
          setQuery(textBefore.slice(slashIndex + 1))
          setSelectedIndex(0)
        } else {
          setIsOpen(false)
          setQuery("")
        }
      }
    }

    editor.on("update", handleSlash)
    return () => {
      editor.off("update", handleSlash)
    }
  }, [editor, isOpen])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setQuery("")
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  if (!isOpen || filteredCommands.length === 0) {
    return (
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    )
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <div
        ref={menuRef}
        className="bg-background absolute z-50 w-72 rounded-lg border shadow-lg"
        style={{ top: position.top, left: position.left }}
      >
        <div className="p-2">
          <p className="text-muted-foreground px-2 pb-2 text-xs font-medium">
            Basic blocks
          </p>
          <div className="space-y-1">
            {filteredCommands.map((command, index) => (
              <button
                key={command.title}
                type="button"
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors",
                  index === selectedIndex ? "bg-muted" : "hover:bg-muted/50"
                )}
                onClick={() => {
                  // Delete the slash and any query text
                  editor
                    .chain()
                    .focus()
                    .deleteRange({
                      from: editor.state.selection.from - query.length - 1,
                      to: editor.state.selection.from,
                    })
                    .run()
                  command.action()
                  setIsOpen(false)
                  setQuery("")
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="bg-background flex h-10 w-10 items-center justify-center rounded-md border">
                  <command.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">{command.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {command.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
