"use client";

import { useState } from "react";
import { toast } from "sonner";

interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
}

type UploadType = "avatar" | "coverImage" | "postImage";

export function useUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = async (
    file: File,
    type: UploadType = "postImage",
  ): Promise<UploadResult | null> => {
    setIsUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      // Simulate progress (Cloudinary doesn't provide real progress)
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const result = await response.json();
      return result;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to upload file";
      toast.error(message);
      return null;
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  const deleteFile = async (publicId: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `/api/upload/${encodeURIComponent(publicId)}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        throw new Error("Failed to delete file");
      }

      return true;
    } catch {
      toast.error("Failed to delete file");
      return false;
    }
  };

  return {
    upload,
    deleteFile,
    isUploading,
    progress,
  };
}
