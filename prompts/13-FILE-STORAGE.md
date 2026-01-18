# 13 - File Storage (Cloudinary)

## Overview

You are responsible for implementing file upload and storage using Cloudinary's free tier for images, avatars, and cover photos.

---

## Prerequisites

- Project setup complete (Agent 01)
- Cloudinary account created

---

## Cloudinary Free Tier Limits

- **25 GB storage**
- **25 GB bandwidth/month**
- **25,000 transformations/month**

These limits are generous for a blog platform.

---

## Step 1: Install Cloudinary SDK

```bash
npm install cloudinary
```

---

## Step 2: Create Cloudinary Client

Create `lib/cloudinary.ts`:

```typescript
import { v2 as cloudinary } from "cloudinary"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export { cloudinary }

// Upload options for different use cases
export const uploadOptions = {
  avatar: {
    folder: "blog/avatars",
    transformation: [
      { width: 200, height: 200, crop: "fill", gravity: "face" },
      { quality: "auto", fetch_format: "auto" },
    ],
  },
  coverImage: {
    folder: "blog/covers",
    transformation: [
      { width: 1200, height: 630, crop: "fill" },
      { quality: "auto", fetch_format: "auto" },
    ],
  },
  postImage: {
    folder: "blog/posts",
    transformation: [
      { width: 1400, crop: "limit" },
      { quality: "auto", fetch_format: "auto" },
    ],
  },
}

// Generate optimized URL for display
export function getOptimizedUrl(
  publicId: string,
  options: {
    width?: number
    height?: number
    crop?: string
  } = {}
): string {
  return cloudinary.url(publicId, {
    secure: true,
    transformation: [
      {
        width: options.width,
        height: options.height,
        crop: options.crop || "fill",
      },
      { quality: "auto", fetch_format: "auto" },
    ],
  })
}

// Delete an image by public ID
export async function deleteImage(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId)
  } catch (error) {
    console.error("Failed to delete image:", error)
  }
}

// Extract public ID from Cloudinary URL
export function getPublicIdFromUrl(url: string): string | null {
  try {
    const match = url.match(/\/v\d+\/(.+)\.\w+$/)
    return match ? match[1] : null
  } catch {
    return null
  }
}
```

---

## Step 3: Create Upload API Route

Create `app/api/upload/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { cloudinary, uploadOptions } from "@/lib/cloudinary"

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const type = formData.get("type") as string || "postImage"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only images are allowed" },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 10MB" },
        { status: 400 }
      )
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`

    // Get upload options based on type
    const options = uploadOptions[type as keyof typeof uploadOptions] || uploadOptions.postImage

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(base64, {
      ...options,
      resource_type: "image",
    })

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    )
  }
}
```

---

## Step 4: Create Delete Image API

Create `app/api/upload/[publicId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { deleteImage } from "@/lib/cloudinary"

export async function DELETE(
  request: NextRequest,
  { params }: { params: { publicId: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Decode the public ID (it may contain slashes)
    const publicId = decodeURIComponent(params.publicId)

    await deleteImage(publicId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete error:", error)
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    )
  }
}
```

---

## Step 5: Create Image Upload Hook

Create `hooks/use-upload.ts`:

```typescript
"use client"

import { useState } from "react"
import { toast } from "sonner"

interface UploadResult {
  url: string
  publicId: string
  width: number
  height: number
}

type UploadType = "avatar" | "coverImage" | "postImage"

export function useUpload() {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const upload = async (
    file: File,
    type: UploadType = "postImage"
  ): Promise<UploadResult | null> => {
    setIsUploading(true)
    setProgress(0)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", type)

      // Simulate progress (Cloudinary doesn't provide real progress)
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90))
      }, 100)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)
      setProgress(100)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Upload failed")
      }

      const result = await response.json()
      return result
    } catch (error: any) {
      toast.error(error.message || "Failed to upload file")
      return null
    } finally {
      setIsUploading(false)
      setProgress(0)
    }
  }

  const deleteFile = async (publicId: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `/api/upload/${encodeURIComponent(publicId)}`,
        { method: "DELETE" }
      )

      if (!response.ok) {
        throw new Error("Failed to delete file")
      }

      return true
    } catch (error) {
      toast.error("Failed to delete file")
      return false
    }
  }

  return {
    upload,
    deleteFile,
    isUploading,
    progress,
  }
}
```

---

## Step 6: Create Image Upload Component

Create `components/upload/image-uploader.tsx`:

```typescript
"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { useUpload } from "@/hooks/use-upload"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ImageIcon, X, Upload, Loader2 } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface ImageUploaderProps {
  value?: string | null
  onChange: (url: string | null) => void
  type?: "avatar" | "coverImage" | "postImage"
  className?: string
  aspectRatio?: "square" | "video" | "auto"
}

export function ImageUploader({
  value,
  onChange,
  type = "postImage",
  className,
  aspectRatio = "auto",
}: ImageUploaderProps) {
  const { upload, isUploading, progress } = useUpload()
  const [preview, setPreview] = useState<string | null>(null)

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      // Create preview
      const previewUrl = URL.createObjectURL(file)
      setPreview(previewUrl)

      // Upload
      const result = await upload(file, type)

      if (result) {
        onChange(result.url)
      }

      // Cleanup preview
      URL.revokeObjectURL(previewUrl)
      setPreview(null)
    },
    [upload, type, onChange]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
  })

  const handleRemove = () => {
    onChange(null)
  }

  const aspectRatioClass = {
    square: "aspect-square",
    video: "aspect-video",
    auto: "min-h-[200px]",
  }[aspectRatio]

  // Show current image
  if (value) {
    return (
      <div className={cn("relative rounded-lg overflow-hidden", aspectRatioClass, className)}>
        <Image
          src={value}
          alt="Uploaded image"
          fill
          className="object-cover"
        />
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2"
          onClick={handleRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  // Show preview while uploading
  if (preview || isUploading) {
    return (
      <div className={cn("relative rounded-lg overflow-hidden bg-muted", aspectRatioClass, className)}>
        {preview && (
          <Image
            src={preview}
            alt="Preview"
            fill
            className="object-cover opacity-50"
          />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <Progress value={progress} className="w-32" />
          <p className="text-sm text-muted-foreground">Uploading...</p>
        </div>
      </div>
    )
  }

  // Show dropzone
  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative rounded-lg border-2 border-dashed transition-colors cursor-pointer",
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50",
        aspectRatioClass,
        className
      )}
    >
      <input {...getInputProps()} />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
        {isDragActive ? (
          <>
            <Upload className="h-8 w-8 text-primary" />
            <p className="text-sm text-primary">Drop the image here</p>
          </>
        ) : (
          <>
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">
              Drag and drop an image, or click to select
            </p>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, GIF up to 10MB
            </p>
          </>
        )}
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

Create `components/upload/cover-image-picker.tsx`:

```typescript
"use client"

import { ImageUploader } from "./image-uploader"
import { Label } from "@/components/ui/label"

interface CoverImagePickerProps {
  value?: string | null
  onChange: (url: string | null) => void
}

export function CoverImagePicker({ value, onChange }: CoverImagePickerProps) {
  return (
    <div className="space-y-2">
      <Label>Cover Image</Label>
      <ImageUploader
        value={value}
        onChange={onChange}
        type="coverImage"
        aspectRatio="video"
        className="w-full"
      />
      <p className="text-xs text-muted-foreground">
        Recommended: 1200x630 pixels for social sharing
      </p>
    </div>
  )
}
```

---

## Step 8: Create Avatar Upload Component

Create `components/upload/avatar-upload.tsx`:

```typescript
"use client"

import { useUpload } from "@/hooks/use-upload"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Camera, Loader2 } from "lucide-react"
import { useRef } from "react"

interface AvatarUploadProps {
  value?: string | null
  onChange: (url: string) => void
  name?: string
}

export function AvatarUpload({ value, onChange, name }: AvatarUploadProps) {
  const { upload, isUploading } = useUpload()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const result = await upload(file, "avatar")
    if (result) {
      onChange(result.url)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar className="h-20 w-20">
          <AvatarImage src={value || ""} />
          <AvatarFallback className="text-lg">
            {name?.slice(0, 2).toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
      </div>

      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleChange}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
        >
          <Camera className="h-4 w-4 mr-2" />
          Change Photo
        </Button>
        <p className="text-xs text-muted-foreground mt-1">
          JPG, PNG up to 10MB
        </p>
      </div>
    </div>
  )
}
```

---

## Step 9: Create Inline Image Upload for Editor

Create `components/editor/image-upload-button.tsx`:

```typescript
"use client"

import { useUpload } from "@/hooks/use-upload"
import { Button } from "@/components/ui/button"
import { ImageIcon, Loader2 } from "lucide-react"
import { useRef } from "react"

interface ImageUploadButtonProps {
  onUpload: (url: string) => void
}

export function ImageUploadButton({ onUpload }: ImageUploadButtonProps) {
  const { upload, isUploading } = useUpload()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const result = await upload(file, "postImage")
    if (result) {
      onUpload(result.url)
    }

    // Reset input
    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImageIcon className="h-4 w-4" />
        )}
      </Button>
    </>
  )
}
```

---

## Step 10: Configure Next.js for Cloudinary Images

Update `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
}

module.exports = nextConfig
```

---

## Step 11: Export Components

Create `components/upload/index.ts`:

```typescript
export { ImageUploader } from "./image-uploader"
export { CoverImagePicker } from "./cover-image-picker"
export { AvatarUpload } from "./avatar-upload"
```

---

## Environment Variables

Ensure these are set:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## Verification Checklist

- [ ] POST /api/upload uploads file to Cloudinary
- [ ] DELETE /api/upload/[publicId] deletes file
- [ ] ImageUploader component works with drag and drop
- [ ] Avatar upload works
- [ ] Cover image picker works
- [ ] Images display correctly via Next.js Image
- [ ] Upload progress shows
- [ ] Error handling works
- [ ] File size limit enforced
- [ ] File type validation works

---

## Files Created

```
lib/
└── cloudinary.ts
app/api/upload/
├── route.ts
└── [publicId]/route.ts
hooks/
└── use-upload.ts
components/upload/
├── image-uploader.tsx
├── cover-image-picker.tsx
├── avatar-upload.tsx
└── index.ts
components/editor/
└── image-upload-button.tsx
```
