"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import {
  Loader2,
  Plus,
  MoreHorizontal,
  Send,
  Trash2,
  Eye,
  Mail,
  Users,
  MousePointer,
} from "lucide-react"
import { formatDate } from "@/lib/utils"
import { toast } from "sonner"

interface Newsletter {
  id: string
  subject: string
  sentAt: string | null
  createdAt: string
  updatedAt: string
  recipientCount: number
  openCount: number
  clickCount: number
}

export default function NewsletterPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [sendId, setSendId] = useState<string | null>(null)

  // Fetch newsletters
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "newsletters", page],
    queryFn: async () => {
      const res = await fetch(`/api/admin/newsletter?page=${page}&limit=10`)
      if (!res.ok) throw new Error("Failed to fetch newsletters")
      return res.json()
    },
  })

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ["admin", "newsletter", "stats"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/newsletter/send`)
      if (!res.ok) throw new Error("Failed to fetch stats")
      return res.json()
    },
  })

  // Send newsletter mutation
  const sendNewsletter = useMutation({
    mutationFn: async (newsletterId: string) => {
      const res = await fetch(`/api/admin/newsletter/send`, {
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
      queryClient.invalidateQueries({ queryKey: ["admin", "newsletters"] })
      toast.success(data.message)
      setSendId(null)
    },
    onError: (error: Error) => {
      toast.error(error.message)
      setSendId(null)
    },
  })

  // Delete newsletter mutation
  const deleteNewsletter = useMutation({
    mutationFn: async (newsletterId: string) => {
      const res = await fetch(`/api/admin/newsletter?id=${newsletterId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error)
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "newsletters"] })
      toast.success("Newsletter deleted")
      setDeleteId(null)
    },
    onError: (error: Error) => {
      toast.error(error.message)
      setDeleteId(null)
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Newsletter</h1>
          <p className="text-muted-foreground">
            Create and send newsletters to subscribers
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/newsletter/new">
            <Plus className="mr-2 h-4 w-4" />
            New Newsletter
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total Subscribers
            </CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.verifiedSubscribers ?? "-"}
            </div>
            <p className="text-muted-foreground text-xs">Verified emails</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Newsletters Sent
            </CardTitle>
            <Mail className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.data?.filter((n: Newsletter) => n.sentAt).length ?? "-"}
            </div>
            <p className="text-muted-foreground text-xs">Total campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total Opens
            </CardTitle>
            <MousePointer className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.data?.reduce(
                (sum: number, n: Newsletter) => sum + n.openCount,
                0
              ) ?? "-"}
            </div>
            <p className="text-muted-foreground text-xs">
              Across all newsletters
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Newsletters Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Subject</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Recipients</TableHead>
              <TableHead>Opens</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                </TableCell>
              </TableRow>
            ) : data?.data?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground h-32 text-center"
                >
                  No newsletters yet.{" "}
                  <Link
                    href="/admin/newsletter/new"
                    className="text-primary hover:underline"
                  >
                    Create your first newsletter
                  </Link>
                </TableCell>
              </TableRow>
            ) : (
              data?.data?.map((newsletter: Newsletter) => (
                <TableRow key={newsletter.id}>
                  <TableCell>
                    <p className="line-clamp-1 font-medium">
                      {newsletter.subject}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={newsletter.sentAt ? "default" : "secondary"}
                    >
                      {newsletter.sentAt ? "Sent" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {newsletter.sentAt ? newsletter.recipientCount : "-"}
                  </TableCell>
                  <TableCell>
                    {newsletter.sentAt ? newsletter.openCount : "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(newsletter.sentAt || newsletter.createdAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/newsletter/${newsletter.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Link>
                        </DropdownMenuItem>
                        {!newsletter.sentAt && (
                          <>
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/admin/newsletter/${newsletter.id}/edit`}
                              >
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setSendId(newsletter.id)}
                            >
                              <Send className="mr-2 h-4 w-4" />
                              Send Now
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteId(newsletter.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-muted-foreground flex items-center px-4 text-sm">
            Page {page} of {data.pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= data.pagination.totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Send Confirmation Dialog */}
      <AlertDialog open={!!sendId} onOpenChange={() => setSendId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Newsletter</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to send this newsletter to all{" "}
              {stats?.verifiedSubscribers || 0} verified subscribers? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => sendId && sendNewsletter.mutate(sendId)}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Newsletter</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this newsletter? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteNewsletter.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteNewsletter.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
