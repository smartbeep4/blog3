"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { useUpload } from "@/hooks/use-upload"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ImageIcon, X, Upload, Loader2 } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface ImageUploadProps {
  onUpload: (url: string) => void
  className?: string
}

export function ImageUpload({ onUpload, className }: ImageUploadProps) {
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
      const result = await upload(file, "postImage")

      if (result) {
        onUpload(result.url)
      }

      // Cleanup preview
      URL.revokeObjectURL(previewUrl)
      setPreview(null)
    },
    [upload, onUpload]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
  })

  // Show preview while uploading
  if (preview || isUploading) {
    return (
      <div
        className={cn(
          "bg-muted relative aspect-video overflow-hidden rounded-lg",
          className
        )}
      >
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
          <p className="text-muted-foreground text-sm">Uploading...</p>
        </div>
      </div>
    )
  }

  // Show dropzone
  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative aspect-video cursor-pointer rounded-lg border-2 border-dashed transition-colors",
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50",
        className
      )}
    >
      <input {...getInputProps()} />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
        {isDragActive ? (
          <>
            <Upload className="text-primary h-8 w-8" />
            <p className="text-primary text-sm">Drop the image here</p>
          </>
        ) : (
          <>
            <ImageIcon className="text-muted-foreground h-8 w-8" />
            <p className="text-muted-foreground text-center text-sm">
              Drag and drop an image, or click to select
            </p>
            <p className="text-muted-foreground text-xs">
              PNG, JPG, GIF up to 10MB
            </p>
          </>
        )}
      </div>
    </div>
  )
}

interface EditorImageProps {
  src: string
  alt?: string
  onRemove?: () => void
  className?: string
}

export function EditorImage({
  src,
  alt,
  onRemove,
  className,
}: EditorImageProps) {
  return (
    <div className={cn("group relative", className)}>
      <div className="relative aspect-video overflow-hidden rounded-lg">
        <Image src={src} alt={alt || "Image"} fill className="object-cover" />
      </div>
      {onRemove && (
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
