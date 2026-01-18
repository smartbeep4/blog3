import { create } from "zustand"
import type { JSONContent } from "@tiptap/react"

export interface EditorState {
  // Content fields
  title: string
  subtitle: string
  content: JSONContent | null
  coverImage: string | null

  // Post settings
  isPremium: boolean
  categories: string[]
  tags: string[]

  // SEO fields
  metaTitle: string
  metaDescription: string

  // Editor state
  isSaving: boolean
  lastSaved: Date | null
  isDirty: boolean

  // Post ID (for editing existing posts)
  postId: string | null

  // Actions
  setTitle: (title: string) => void
  setSubtitle: (subtitle: string) => void
  setContent: (content: JSONContent | null) => void
  setCoverImage: (coverImage: string | null) => void
  setIsPremium: (isPremium: boolean) => void
  setCategories: (categories: string[]) => void
  setTags: (tags: string[]) => void
  setMetaTitle: (metaTitle: string) => void
  setMetaDescription: (metaDescription: string) => void
  setIsSaving: (isSaving: boolean) => void
  setLastSaved: (lastSaved: Date | null) => void
  setIsDirty: (isDirty: boolean) => void
  setPostId: (postId: string | null) => void

  // Bulk actions
  initializePost: (data: Partial<EditorState>) => void
  resetEditor: () => void
  markAsSaved: () => void
}

const initialState = {
  title: "",
  subtitle: "",
  content: null,
  coverImage: null,
  isPremium: false,
  categories: [],
  tags: [],
  metaTitle: "",
  metaDescription: "",
  isSaving: false,
  lastSaved: null,
  isDirty: false,
  postId: null,
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
  setMetaTitle: (metaTitle) => set({ metaTitle, isDirty: true }),
  setMetaDescription: (metaDescription) =>
    set({ metaDescription, isDirty: true }),
  setIsSaving: (isSaving) => set({ isSaving }),
  setLastSaved: (lastSaved) => set({ lastSaved }),
  setIsDirty: (isDirty) => set({ isDirty }),
  setPostId: (postId) => set({ postId }),

  initializePost: (data) =>
    set({
      ...initialState,
      ...data,
      isDirty: false,
      lastSaved: null,
    }),

  resetEditor: () => set(initialState),

  markAsSaved: () =>
    set({
      isSaving: false,
      isDirty: false,
      lastSaved: new Date(),
    }),
}))

// Helper function to get word count from Tiptap JSON content
export function getWordCount(content: JSONContent | null): number {
  if (!content) return 0

  let text = ""

  function extractText(node: JSONContent): void {
    if (node.text) {
      text += node.text + " "
    }
    if (node.content) {
      node.content.forEach(extractText)
    }
  }

  extractText(content)

  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length
}

// Helper function to calculate reading time (assuming 200 words per minute)
export function getReadingTime(content: JSONContent | null): number {
  const wordCount = getWordCount(content)
  return Math.max(1, Math.ceil(wordCount / 200))
}

// Helper function to generate excerpt from content
export function generateExcerpt(
  content: JSONContent | null,
  maxLength: number = 160
): string {
  if (!content) return ""

  let text = ""

  function extractText(node: JSONContent): void {
    if (text.length >= maxLength) return
    if (node.text) {
      text += node.text + " "
    }
    if (node.content) {
      node.content.forEach(extractText)
    }
  }

  extractText(content)

  text = text.trim()
  if (text.length > maxLength) {
    text = text.substring(0, maxLength).trim() + "..."
  }

  return text
}
