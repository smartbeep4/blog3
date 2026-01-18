# 11 - Admin Dashboard

## Overview

You are responsible for implementing the admin dashboard, including user management, site settings, moderation tools, and admin-specific functionality.

---

## Prerequisites

- Database schema implemented (Agent 02)
- Authentication implemented (Agent 03)
- All other features implemented

---

## Admin Features

1. Site-wide analytics overview
2. User management (roles, ban)
3. Content moderation
4. Site settings configuration
5. Subscriber management
6. Newsletter management

---

## Step 1: Create Admin Layout

Create `app/admin/layout.tsx`:

```typescript
import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/guards"
import { AdminSidebar } from "@/components/admin/admin-sidebar"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdmin()

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 p-8 ml-64">
        {children}
      </main>
    </div>
  )
}
```

---

## Step 2: Create Admin Sidebar

Create `components/admin/admin-sidebar.tsx`:

```typescript
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  FileText,
  MessageSquare,
  Mail,
  Settings,
  CreditCard,
  BarChart3,
  ArrowLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/posts", label: "Posts", icon: FileText },
  { href: "/admin/comments", label: "Comments", icon: MessageSquare },
  { href: "/admin/subscribers", label: "Subscribers", icon: CreditCard },
  { href: "/admin/newsletter", label: "Newsletter", icon: Mail },
  { href: "/admin/settings", label: "Settings", icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-muted/30">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <h2 className="font-bold text-lg">Admin</h2>
          <p className="text-sm text-muted-foreground">Manage your site</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const isActive = item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t p-4">
          <Button variant="ghost" size="sm" asChild className="w-full">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </aside>
  )
}
```

---

## Step 3: Create Admin Overview Page

Create `app/admin/page.tsx`:

```typescript
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FileText, MessageSquare, CreditCard } from "lucide-react"
import Link from "next/link"

export const metadata = {
  title: "Admin Overview",
}

export default async function AdminPage() {
  const [users, posts, comments, subscribers] = await Promise.all([
    prisma.user.count(),
    prisma.post.count({ where: { status: "PUBLISHED" } }),
    prisma.comment.count(),
    prisma.subscription.count({
      where: {
        tier: "PAID",
        stripeCurrentPeriodEnd: { gt: new Date() },
      },
    }),
  ])

  const stats = [
    { title: "Total Users", value: users, icon: Users, href: "/admin/users" },
    { title: "Published Posts", value: posts, icon: FileText, href: "/admin/posts" },
    { title: "Comments", value: comments, icon: MessageSquare, href: "/admin/comments" },
    { title: "Paid Subscribers", value: subscribers, icon: CreditCard, href: "/admin/subscribers" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Overview</h1>
        <p className="text-muted-foreground">
          Welcome to the admin dashboard
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:border-primary transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

---

## Step 4: Create Users Management API

Create `app/api/admin/users/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions, hasRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user || !hasRole(session.user.role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "20")
  const search = searchParams.get("search")
  const role = searchParams.get("role")

  const where: any = {}

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ]
  }

  if (role) {
    where.role = role
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        subscription: {
          select: { tier: true },
        },
        _count: {
          select: { posts: true, comments: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({
    data: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      subscription: user.subscription?.tier || "FREE",
      postsCount: user._count.posts,
      commentsCount: user._count.comments,
      createdAt: user.createdAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}
```

Create `app/api/admin/users/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions, hasRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const updateUserSchema = z.object({
  role: z.enum(["READER", "AUTHOR", "EDITOR", "ADMIN"]).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user || !hasRole(session.user.role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Prevent self-demotion
  if (params.id === session.user.id) {
    return NextResponse.json(
      { error: "Cannot modify your own role" },
      { status: 400 }
    )
  }

  try {
    const body = await request.json()
    const { role } = updateUserSchema.parse(body)

    const user = await prisma.user.update({
      where: { id: params.id },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    })

    return NextResponse.json({ data: user })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user || !hasRole(session.user.role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Prevent self-deletion
  if (params.id === session.user.id) {
    return NextResponse.json(
      { error: "Cannot delete your own account" },
      { status: 400 }
    )
  }

  await prisma.user.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ message: "User deleted" })
}
```

---

## Step 5: Create Users Management Page

Create `app/admin/users/page.tsx`:

```typescript
"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MoreHorizontal, Search } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { toast } from "sonner"

const roleColors = {
  READER: "secondary",
  AUTHOR: "outline",
  EDITOR: "default",
  ADMIN: "destructive",
} as const

export default function UsersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", page, search, roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      })
      if (search) params.set("search", search)
      if (roleFilter !== "all") params.set("role", roleFilter)

      const res = await fetch(`/api/admin/users?${params}`)
      if (!res.ok) throw new Error("Failed to fetch users")
      return res.json()
    },
  })

  const updateRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error)
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
      toast.success("Role updated")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground">Manage user accounts and roles</p>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="READER">Reader</SelectItem>
            <SelectItem value="AUTHOR">Author</SelectItem>
            <SelectItem value="EDITOR">Editor</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Subscription</TableHead>
              <TableHead>Posts</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data?.map((user: any) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar || ""} />
                      <AvatarFallback>
                        {user.name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={roleColors[user.role as keyof typeof roleColors]}>
                    {user.role.toLowerCase()}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.subscription === "PAID" ? "default" : "secondary"}>
                    {user.subscription.toLowerCase()}
                  </Badge>
                </TableCell>
                <TableCell>{user.postsCount}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(user.createdAt)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          updateRole.mutate({ userId: user.id, role: "READER" })
                        }
                      >
                        Set as Reader
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          updateRole.mutate({ userId: user.id, role: "AUTHOR" })
                        }
                      >
                        Set as Author
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          updateRole.mutate({ userId: user.id, role: "EDITOR" })
                        }
                      >
                        Set as Editor
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          updateRole.mutate({ userId: user.id, role: "ADMIN" })
                        }
                      >
                        Set as Admin
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
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
          <span className="flex items-center px-4 text-sm text-muted-foreground">
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
    </div>
  )
}
```

---

## Step 6: Create Site Settings API

Create `app/api/admin/settings/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions, hasRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: "default" },
  })

  if (!settings) {
    // Create default settings
    const defaultSettings = await prisma.siteSettings.create({
      data: { id: "default" },
    })
    return NextResponse.json({ data: defaultSettings })
  }

  return NextResponse.json({ data: settings })
}

const updateSettingsSchema = z.object({
  siteName: z.string().min(1).max(100).optional(),
  siteDescription: z.string().max(500).optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  twitterHandle: z.string().max(50).optional().nullable(),
  facebookUrl: z.string().url().optional().nullable(),
  instagramUrl: z.string().url().optional().nullable(),
  linkedinUrl: z.string().url().optional().nullable(),
  monthlyPrice: z.number().int().min(0).optional(),
  yearlyPrice: z.number().int().min(0).optional(),
  commentsEnabled: z.boolean().optional(),
  likesEnabled: z.boolean().optional(),
})

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user || !hasRole(session.user.role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = updateSettingsSchema.parse(body)

    const settings = await prisma.siteSettings.upsert({
      where: { id: "default" },
      create: { id: "default", ...data },
      update: data,
    })

    return NextResponse.json({ data: settings })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    )
  }
}
```

---

## Step 7: Create Settings Page

Create `app/admin/settings/page.tsx`:

```typescript
"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

const settingsSchema = z.object({
  siteName: z.string().min(1, "Site name is required"),
  siteDescription: z.string().optional(),
  primaryColor: z.string(),
  accentColor: z.string(),
  twitterHandle: z.string().optional(),
  facebookUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  monthlyPrice: z.number().int().min(0),
  yearlyPrice: z.number().int().min(0),
  commentsEnabled: z.boolean(),
  likesEnabled: z.boolean(),
})

type SettingsFormData = z.infer<typeof settingsSchema>

export default function SettingsPage() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings")
      if (!res.ok) throw new Error("Failed to fetch settings")
      return res.json()
    },
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    values: data?.data,
  })

  const updateSettings = useMutation({
    mutationFn: async (formData: SettingsFormData) => {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error)
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] })
      toast.success("Settings saved")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <form onSubmit={handleSubmit((data) => updateSettings.mutate(data))}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Site Settings</h1>
            <p className="text-muted-foreground">
              Configure your blog settings
            </p>
          </div>
          <Button type="submit" disabled={!isDirty || updateSettings.isPending}>
            {updateSettings.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Save Changes
          </Button>
        </div>

        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="siteName">Site Name</Label>
              <Input {...register("siteName")} />
              {errors.siteName && (
                <p className="text-sm text-destructive">{errors.siteName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteDescription">Site Description</Label>
              <Textarea {...register("siteDescription")} rows={3} />
            </div>
          </CardContent>
        </Card>

        {/* Branding */}
        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    {...register("primaryColor")}
                    className="w-16 h-10 p-1"
                  />
                  <Input {...register("primaryColor")} className="flex-1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accentColor">Accent Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    {...register("accentColor")}
                    className="w-16 h-10 p-1"
                  />
                  <Input {...register("accentColor")} className="flex-1" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Social Links */}
        <Card>
          <CardHeader>
            <CardTitle>Social Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="twitterHandle">Twitter Handle</Label>
                <Input {...register("twitterHandle")} placeholder="@username" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facebookUrl">Facebook URL</Label>
                <Input {...register("facebookUrl")} placeholder="https://facebook.com/..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagramUrl">Instagram URL</Label>
                <Input {...register("instagramUrl")} placeholder="https://instagram.com/..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                <Input {...register("linkedinUrl")} placeholder="https://linkedin.com/..." />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="monthlyPrice">Monthly Price (cents)</Label>
                <Input
                  type="number"
                  {...register("monthlyPrice", { valueAsNumber: true })}
                />
                <p className="text-sm text-muted-foreground">
                  ${((watch("monthlyPrice") || 0) / 100).toFixed(2)}/month
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearlyPrice">Yearly Price (cents)</Label>
                <Input
                  type="number"
                  {...register("yearlyPrice", { valueAsNumber: true })}
                />
                <p className="text-sm text-muted-foreground">
                  ${((watch("yearlyPrice") || 0) / 100).toFixed(2)}/year
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="commentsEnabled">Comments</Label>
                <p className="text-sm text-muted-foreground">
                  Allow comments on posts
                </p>
              </div>
              <Switch
                checked={watch("commentsEnabled")}
                onCheckedChange={(checked) => setValue("commentsEnabled", checked, { shouldDirty: true })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="likesEnabled">Likes</Label>
                <p className="text-sm text-muted-foreground">
                  Allow likes on posts
                </p>
              </div>
              <Switch
                checked={watch("likesEnabled")}
                onCheckedChange={(checked) => setValue("likesEnabled", checked, { shouldDirty: true })}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
```

---

## Verification Checklist

- [ ] Admin layout with sidebar loads
- [ ] Overview page shows stats
- [ ] Users list with search and filter
- [ ] Role changes work
- [ ] Settings page loads
- [ ] Settings can be saved
- [ ] Only admins can access /admin routes
- [ ] Navigation works between pages

---

## Files Created

```
app/admin/
├── layout.tsx
├── page.tsx
├── users/page.tsx
├── settings/page.tsx
└── [other pages as needed]
app/api/admin/
├── users/
│   ├── route.ts
│   └── [id]/route.ts
└── settings/route.ts
components/admin/
└── admin-sidebar.tsx
```
