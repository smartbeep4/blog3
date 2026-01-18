"use client"

import { useEditor, EditorContent, type JSONContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import Highlight from "@tiptap/extension-highlight"
import Typography from "@tiptap/extension-typography"
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight"
import { common, createLowlight } from "lowlight"
import { useEffect, useCallback } from "react"
import { BubbleMenuComponent } from "./bubble-menu"
import { SlashCommandMenu } from "./slash-command-menu"
import { cn } from "@/lib/utils"

const lowlight = createLowlight(common)

interface EditorProps {
  content: JSONContent | null
  onChange: (content: JSONContent) => void
  placeholder?: string
  className?: string
  editable?: boolean
}

export function Editor({
  content,
  onChange,
  placeholder = "Start writing your story...",
  className,
  editable = true,
}: EditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // We use CodeBlockLowlight instead
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: "is-editor-empty",
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline underline-offset-4 cursor-pointer",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "rounded-lg max-w-full mx-auto",
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
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: "rounded-lg bg-muted p-4 font-mono text-sm",
        },
      }),
    ],
    content: content || undefined,
    editable,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-neutral dark:prose-invert max-w-none",
          "prose-headings:font-serif prose-headings:font-semibold",
          "prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl",
          "prose-p:leading-relaxed prose-p:text-foreground",
          "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
          "prose-blockquote:border-l-primary prose-blockquote:bg-muted/50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:not-italic",
          "prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none",
          "prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg",
          "prose-img:rounded-lg prose-img:shadow-md",
          "prose-ul:list-disc prose-ol:list-decimal",
          "focus:outline-none min-h-[300px]"
        ),
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON())
    },
  })

  // Sync content changes from outside
  useEffect(() => {
    if (editor && content && editor.getJSON() !== content) {
      editor.commands.setContent(content)
    }
  }, [editor, content])

  const addImage = useCallback(
    (url: string) => {
      if (editor) {
        editor.chain().focus().setImage({ src: url }).run()
      }
    },
    [editor]
  )

  if (!editor) {
    return (
      <div
        className={cn("bg-muted h-[300px] animate-pulse rounded-lg", className)}
      />
    )
  }

  return (
    <div className={cn("relative", className)}>
      <BubbleMenuComponent editor={editor} />
      <SlashCommandMenu editor={editor} onAddImage={addImage} />
      <EditorContent editor={editor} />
    </div>
  )
}

export { useEditor }
