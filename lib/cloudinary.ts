import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };

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
};

// Generate optimized URL for display
export function getOptimizedUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    crop?: string;
  } = {},
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
  });
}

// Delete an image by public ID
export async function deleteImage(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Failed to delete image:", error);
  }
}

// Extract public ID from Cloudinary URL
export function getPublicIdFromUrl(url: string): string | null {
  try {
    const match = url.match(/\/v\d+\/(.+)\.\w+$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
