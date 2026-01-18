"use client";

import { useUpload } from "@/hooks/use-upload";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";
import { useRef } from "react";

interface AvatarUploadProps {
  value?: string | null;
  onChange: (url: string) => void;
  name?: string;
}

export function AvatarUpload({ value, onChange, name }: AvatarUploadProps) {
  const { upload, isUploading } = useUpload();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await upload(file, "avatar");
    if (result) {
      onChange(result.url);
    }
  };

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
  );
}
