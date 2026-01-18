"use client";

import { ImageUploader } from "./image-uploader";
import { Label } from "@/components/ui/label";

interface CoverImagePickerProps {
  value?: string | null;
  onChange: (url: string | null) => void;
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
  );
}
