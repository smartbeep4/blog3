"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useUpload } from "@/hooks/use-upload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ImageIcon, X, Upload, Loader2 } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  type?: "avatar" | "coverImage" | "postImage";
  className?: string;
  aspectRatio?: "square" | "video" | "auto";
}

export function ImageUploader({
  value,
  onChange,
  type = "postImage",
  className,
  aspectRatio = "auto",
}: ImageUploaderProps) {
  const { upload, isUploading, progress } = useUpload();
  const [preview, setPreview] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      // Create preview
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);

      // Upload
      const result = await upload(file, type);

      if (result) {
        onChange(result.url);
      }

      // Cleanup preview
      URL.revokeObjectURL(previewUrl);
      setPreview(null);
    },
    [upload, type, onChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
  });

  const handleRemove = () => {
    onChange(null);
  };

  const aspectRatioClass = {
    square: "aspect-square",
    video: "aspect-video",
    auto: "min-h-[200px]",
  }[aspectRatio];

  // Show current image
  if (value) {
    return (
      <div
        className={cn(
          "relative rounded-lg overflow-hidden",
          aspectRatioClass,
          className,
        )}
      >
        <Image src={value} alt="Uploaded image" fill className="object-cover" />
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
    );
  }

  // Show preview while uploading
  if (preview || isUploading) {
    return (
      <div
        className={cn(
          "relative rounded-lg overflow-hidden bg-muted",
          aspectRatioClass,
          className,
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
          <p className="text-sm text-muted-foreground">Uploading...</p>
        </div>
      </div>
    );
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
        className,
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
  );
}
