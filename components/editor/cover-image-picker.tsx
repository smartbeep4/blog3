"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { useUpload } from "@/hooks/use-upload"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ImageIcon, X, Upload, Loader2 } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface CoverImagePickerProps {
  value: string | null
  onChange: (url: string | null) => void
  className?: string
}

export function CoverImagePicker({
  value,
  onChange,
  className,
}: CoverImagePickerProps) {
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
      const result = await upload(file, "coverImage")

      if (result) {
        onChange(result.url)
      }

      // Cleanup preview
      URL.revokeObjectURL(previewUrl)
      setPreview(null)
    },
    [upload, onChange]
  )

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
    noClick: !!value, // Disable click when there's already an image
  })

  const handleRemove = () => {
    onChange(null)
  }

  // Show current image
  if (value) {
    return (
      <div
        {...getRootProps()}
        className={cn(
          "group relative aspect-[21/9] overflow-hidden rounded-xl",
          className
        )}
      >
        <input {...getInputProps()} />
        <Image
          src={value}
          alt="Cover image"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/40" />
        <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              open()
            }}
          >
            <Upload className="mr-2 h-4 w-4" />
            Change
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              handleRemove()
            }}
          >
            <X className="mr-2 h-4 w-4" />
            Remove
          </Button>
        </div>
      </div>
    )
  }

  // Show preview while uploading
  if (preview || isUploading) {
    return (
      <div
        className={cn(
          "bg-muted relative aspect-[21/9] overflow-hidden rounded-xl",
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
          <Loader2 className="h-10 w-10 animate-spin" />
          <Progress value={progress} className="w-40" />
          <p className="text-muted-foreground text-sm">
            Uploading cover image...
          </p>
        </div>
      </div>
    )
  }

  // Show dropzone
  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative aspect-[21/9] cursor-pointer rounded-xl border-2 border-dashed transition-all",
        isDragActive
          ? "border-primary bg-primary/5 scale-[1.02]"
          : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
        className
      )}
    >
      <input {...getInputProps()} />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        {isDragActive ? (
          <>
            <Upload className="text-primary h-12 w-12" />
            <p className="text-primary text-lg font-medium">
              Drop the cover image here
            </p>
          </>
        ) : (
          <>
            <ImageIcon className="text-muted-foreground h-12 w-12" />
            <div className="text-center">
              <p className="text-muted-foreground text-base font-medium">
                Add a cover image
              </p>
              <p className="text-muted-foreground/70 text-sm">
                Drag and drop or click to upload
              </p>
              <p className="text-muted-foreground/50 mt-1 text-xs">
                Recommended: 1200x630 pixels for optimal display
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
