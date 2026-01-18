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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

const settingsSchema = z.object({
  siteName: z.string().min(1, "Site name is required"),
  siteDescription: z.string().optional().nullable(),
  logo: z.string().optional().nullable(),
  favicon: z.string().optional().nullable(),
  primaryColor: z.string(),
  accentColor: z.string(),
  twitterHandle: z.string().optional().nullable(),
  facebookUrl: z.string().optional().nullable(),
  instagramUrl: z.string().optional().nullable(),
  linkedinUrl: z.string().optional().nullable(),
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
    reset,
    formState: { errors, isDirty },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    values: data?.data
      ? {
          ...data.data,
          siteDescription: data.data.siteDescription || "",
          twitterHandle: data.data.twitterHandle || "",
          facebookUrl: data.data.facebookUrl || "",
          instagramUrl: data.data.instagramUrl || "",
          linkedinUrl: data.data.linkedinUrl || "",
          logo: data.data.logo || "",
          favicon: data.data.favicon || "",
        }
      : undefined,
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] })
      reset(data.data)
      toast.success("Settings saved successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  if (isLoading) {
    return <SettingsSkeleton />
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
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save Changes
          </Button>
        </div>

        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>Basic information about your blog</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="siteName">Site Name</Label>
              <Input {...register("siteName")} />
              {errors.siteName && (
                <p className="text-destructive text-sm">
                  {errors.siteName.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteDescription">Site Description</Label>
              <Textarea
                {...register("siteDescription")}
                rows={3}
                placeholder="A brief description of your blog..."
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="logo">Logo URL</Label>
                <Input {...register("logo")} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="favicon">Favicon URL</Label>
                <Input {...register("favicon")} placeholder="https://..." />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Branding */}
        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
            <CardDescription>Customize the look and feel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    {...register("primaryColor")}
                    className="h-10 w-16 cursor-pointer p-1"
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
                    className="h-10 w-16 cursor-pointer p-1"
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
            <CardDescription>
              Connect your social media accounts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="twitterHandle">Twitter Handle</Label>
                <Input {...register("twitterHandle")} placeholder="@username" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facebookUrl">Facebook URL</Label>
                <Input
                  {...register("facebookUrl")}
                  placeholder="https://facebook.com/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagramUrl">Instagram URL</Label>
                <Input
                  {...register("instagramUrl")}
                  placeholder="https://instagram.com/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                <Input
                  {...register("linkedinUrl")}
                  placeholder="https://linkedin.com/..."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription Pricing</CardTitle>
            <CardDescription>
              Set the prices for paid subscriptions (in cents)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="monthlyPrice">Monthly Price (cents)</Label>
                <Input
                  type="number"
                  {...register("monthlyPrice", { valueAsNumber: true })}
                />
                <p className="text-muted-foreground text-sm">
                  ${((watch("monthlyPrice") || 0) / 100).toFixed(2)}/month
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearlyPrice">Yearly Price (cents)</Label>
                <Input
                  type="number"
                  {...register("yearlyPrice", { valueAsNumber: true })}
                />
                <p className="text-muted-foreground text-sm">
                  ${((watch("yearlyPrice") || 0) / 100).toFixed(2)}/year
                  {watch("yearlyPrice") && watch("monthlyPrice") && (
                    <span className="ml-2 text-green-600">
                      (Save{" "}
                      {Math.round(
                        (1 -
                          watch("yearlyPrice") / (watch("monthlyPrice") * 12)) *
                          100
                      )}
                      %)
                    </span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
            <CardDescription>Toggle site features on or off</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="commentsEnabled" className="font-medium">
                  Comments
                </Label>
                <p className="text-muted-foreground text-sm">
                  Allow comments on posts
                </p>
              </div>
              <Switch
                checked={watch("commentsEnabled")}
                onCheckedChange={(checked) =>
                  setValue("commentsEnabled", checked, { shouldDirty: true })
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="likesEnabled" className="font-medium">
                  Likes
                </Label>
                <p className="text-muted-foreground text-sm">
                  Allow likes on posts
                </p>
              </div>
              <Switch
                checked={watch("likesEnabled")}
                onCheckedChange={(checked) =>
                  setValue("likesEnabled", checked, { shouldDirty: true })
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  )
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-2 h-4 w-60" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
