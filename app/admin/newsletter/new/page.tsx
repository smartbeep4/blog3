"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import Placeholder from "@tiptap/extension-placeholder"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ArrowLeft, Loader2, Save, Send, TestTube } from "lucide-react"
import NextLink from "next/link"
import { toast } from "sonner"

export default function NewNewsletterPage() {
  const router = useRouter()
  const [subject, setSubject] = useState("")
  const [testEmail, setTestEmail] = useState("")
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [savedNewsletterId, setSavedNewsletterId] = useState<string | null>(
    null
  )

  // Fetch subscriber count
  const { data: stats } = useQuery({
    queryKey: ["admin", "newsletter", "stats"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/newsletter/send`)
      if (!res.ok) throw new Error("Failed to fetch stats")
      return res.json()
    },
  })

  // Editor setup
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image,
      Placeholder.configure({
        placeholder: "Write your newsletter content here...",
      }),
    ],
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[300px] p-4",
      },
    },
  })

  // Create newsletter mutation
  const createNewsletter = useMutation({
    mutationFn: async () => {
      const content = editor?.getJSON() || { type: "doc", content: [] }

      const res = await fetch("/api/admin/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, content }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error)
      }

      return res.json()
    },
    onSuccess: (data) => {
      setSavedNewsletterId(data.data.id)
      toast.success("Newsletter saved as draft")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  // Send test email mutation
  const sendTestEmail = useMutation({
    mutationFn: async (newsletterId: string) => {
      const res = await fetch("/api/admin/newsletter/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newsletterId, testEmail }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error)
      }

      return res.json()
    },
    onSuccess: (data) => {
      toast.success(data.message)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  // Send newsletter mutation
  const sendNewsletter = useMutation({
    mutationFn: async (newsletterId: string) => {
      const res = await fetch("/api/admin/newsletter/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newsletterId }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error)
      }

      return res.json()
    },
    onSuccess: (data) => {
      toast.success(data.message)
      router.push("/admin/newsletter")
    },
    onError: (error: Error) => {
      toast.error(error.message)
      setShowSendDialog(false)
    },
  })

  const handleSave = async () => {
    if (!subject.trim()) {
      toast.error("Please enter a subject")
      return
    }
    createNewsletter.mutate()
  }

  const handleSendTest = async () => {
    if (!testEmail.trim()) {
      toast.error("Please enter a test email address")
      return
    }

    if (!savedNewsletterId) {
      // Save first, then send test
      const content = editor?.getJSON() || { type: "doc", content: [] }

      try {
        const res = await fetch("/api/admin/newsletter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject, content }),
        })

        if (!res.ok) {
          const error = await res.json()
          throw new Error(error.error)
        }

        const data = await res.json()
        setSavedNewsletterId(data.data.id)
        sendTestEmail.mutate(data.data.id)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save")
      }
    } else {
      sendTestEmail.mutate(savedNewsletterId)
    }
  }

  const handleSendToAll = () => {
    if (!savedNewsletterId) {
      toast.error("Please save the newsletter first")
      return
    }
    setShowSendDialog(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <NextLink href="/admin/newsletter">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </NextLink>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">New Newsletter</h1>
            <p className="text-muted-foreground">
              Create and send a newsletter to {stats?.verifiedSubscribers || 0}{" "}
              subscribers
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={createNewsletter.isPending || !subject.trim()}
          >
            {createNewsletter.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Draft
          </Button>
          <Button
            onClick={handleSendToAll}
            disabled={!savedNewsletterId || sendNewsletter.isPending}
          >
            {sendNewsletter.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Send to All
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Subject</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter newsletter subject..."
                className="text-lg"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-hidden rounded-lg border">
                <EditorContent editor={editor} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Send Test Email</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="testEmail">Email Address</Label>
                <Input
                  id="testEmail"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                />
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleSendTest}
                disabled={sendTestEmail.isPending || !testEmail.trim()}
              >
                {sendTestEmail.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <TestTube className="mr-2 h-4 w-4" />
                )}
                Send Test
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tips</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-2 text-sm">
              <p>1. Write a compelling subject line that encourages opens.</p>
              <p>
                2. Keep your newsletter focused on one main topic or
                announcement.
              </p>
              <p>
                3. Send a test email to yourself before sending to all
                subscribers.
              </p>
              <p>
                4. The best days to send newsletters are Tuesday and Thursday.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Send Confirmation Dialog */}
      <AlertDialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Newsletter</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to send this newsletter to{" "}
              <strong>{stats?.verifiedSubscribers || 0}</strong> verified
              subscribers. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                savedNewsletterId && sendNewsletter.mutate(savedNewsletterId)
              }
            >
              {sendNewsletter.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Send Newsletter"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
