"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, CreditCard, Mail, Users, CheckCircle } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface PaidSubscriber {
  id: string
  name: string
  email: string
  avatar: string | null
  subscription: {
    tier: string
    stripeCurrentPeriodEnd: string | null
    createdAt: string
  }
}

interface NewsletterSubscriber {
  id: string
  email: string
  isVerified: boolean
  createdAt: string
  userId: string | null
}

export default function SubscribersPage() {
  const [paidPage, setPaidPage] = useState(1)
  const [newsletterPage, setNewsletterPage] = useState(1)

  // Fetch paid subscribers
  const { data: paidData, isLoading: paidLoading } = useQuery({
    queryKey: ["admin", "subscribers", "paid", paidPage],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/subscribers?type=paid&page=${paidPage}&limit=20`
      )
      if (!res.ok) throw new Error("Failed to fetch paid subscribers")
      return res.json()
    },
  })

  // Fetch newsletter subscribers
  const { data: newsletterData, isLoading: newsletterLoading } = useQuery({
    queryKey: ["admin", "subscribers", "newsletter", newsletterPage],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/subscribers?type=newsletter&page=${newsletterPage}&limit=20`
      )
      if (!res.ok) throw new Error("Failed to fetch newsletter subscribers")
      return res.json()
    },
  })

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ["admin", "subscribers", "stats"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/newsletter/send`)
      if (!res.ok) throw new Error("Failed to fetch stats")
      return res.json()
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Subscribers</h1>
        <p className="text-muted-foreground">
          Manage paid and newsletter subscribers
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Paid Subscribers
            </CardTitle>
            <CreditCard className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {paidData?.pagination?.total ?? "-"}
            </div>
            <p className="text-muted-foreground text-xs">
              Active subscriptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Newsletter Subscribers
            </CardTitle>
            <Mail className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalSubscribers ?? "-"}
            </div>
            <p className="text-muted-foreground text-xs">Total signups</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Verified Emails
            </CardTitle>
            <CheckCircle className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.verifiedSubscribers ?? "-"}
            </div>
            <p className="text-muted-foreground text-xs">
              Confirmed subscribers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              New This Week
            </CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.recentSubscribers ?? "-"}
            </div>
            <p className="text-muted-foreground text-xs">Last 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="paid" className="space-y-4">
        <TabsList>
          <TabsTrigger value="paid">Paid Subscribers</TabsTrigger>
          <TabsTrigger value="newsletter">Newsletter Subscribers</TabsTrigger>
        </TabsList>

        {/* Paid Subscribers Tab */}
        <TabsContent value="paid">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Subscribed</TableHead>
                  <TableHead>Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paidLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : paidData?.data?.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-muted-foreground h-32 text-center"
                    >
                      No paid subscribers yet
                    </TableCell>
                  </TableRow>
                ) : (
                  paidData?.data?.map((subscriber: PaidSubscriber) => (
                    <TableRow key={subscriber.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={subscriber.avatar || ""} />
                            <AvatarFallback>
                              {subscriber.name?.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{subscriber.name}</p>
                            <p className="text-muted-foreground text-sm">
                              {subscriber.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="default">
                          {subscriber.subscription.tier.toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(subscriber.subscription.createdAt)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {subscriber.subscription.stripeCurrentPeriodEnd
                          ? formatDate(
                              subscriber.subscription.stripeCurrentPeriodEnd
                            )
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {paidData?.pagination && paidData.pagination.totalPages > 1 && (
            <div className="mt-4 flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaidPage((p) => Math.max(1, p - 1))}
                disabled={paidPage === 1}
              >
                Previous
              </Button>
              <span className="text-muted-foreground flex items-center px-4 text-sm">
                Page {paidPage} of {paidData.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaidPage((p) => p + 1)}
                disabled={paidPage >= paidData.pagination.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Newsletter Subscribers Tab */}
        <TabsContent value="newsletter">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Subscribed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {newsletterLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : newsletterData?.data?.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-muted-foreground h-32 text-center"
                    >
                      No newsletter subscribers yet
                    </TableCell>
                  </TableRow>
                ) : (
                  newsletterData?.data?.map(
                    (subscriber: NewsletterSubscriber) => (
                      <TableRow key={subscriber.id}>
                        <TableCell className="font-medium">
                          {subscriber.email}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              subscriber.isVerified ? "default" : "secondary"
                            }
                          >
                            {subscriber.isVerified ? "Verified" : "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {subscriber.userId ? (
                            <Badge variant="outline">Has Account</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(subscriber.createdAt)}
                        </TableCell>
                      </TableRow>
                    )
                  )
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {newsletterData?.pagination &&
            newsletterData.pagination.totalPages > 1 && (
              <div className="mt-4 flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewsletterPage((p) => Math.max(1, p - 1))}
                  disabled={newsletterPage === 1}
                >
                  Previous
                </Button>
                <span className="text-muted-foreground flex items-center px-4 text-sm">
                  Page {newsletterPage} of{" "}
                  {newsletterData.pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewsletterPage((p) => p + 1)}
                  disabled={
                    newsletterPage >= newsletterData.pagination.totalPages
                  }
                >
                  Next
                </Button>
              </div>
            )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
