// Re-export Prisma types for convenience
export type {
  User,
  Post,
  Comment,
  Category,
  Tag,
  Like,
  Bookmark,
  Subscription,
  PostView,
  Newsletter,
  SiteSettings,
} from "@prisma/client";

export { Role, PostStatus, SubscriptionTier } from "@prisma/client";

// Extended types with relations
import type { User, Post, Comment, Category, Tag } from "@prisma/client";

export type UserPublic = Pick<User, "id" | "name" | "avatar" | "bio">;

export type PostWithAuthor = Post & {
  author: UserPublic;
};

export type PostWithDetails = Post & {
  author: UserPublic;
  categories: Category[];
  tags: Tag[];
  _count: {
    comments: number;
    likes: number;
    views: number;
  };
};

export type PostCard = Pick<
  Post,
  | "id"
  | "slug"
  | "title"
  | "subtitle"
  | "excerpt"
  | "coverImage"
  | "publishedAt"
  | "readingTime"
  | "isPremium"
> & {
  author: UserPublic;
  _count: {
    likes: number;
  };
};

export type CommentWithAuthor = Comment & {
  author: UserPublic;
  _count: {
    likes: number;
  };
};

export type CommentWithReplies = CommentWithAuthor & {
  replies: CommentWithAuthor[];
};

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Form types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface PostFormData {
  title: string;
  subtitle?: string;
  content: unknown; // Tiptap JSON
  coverImage?: string;
  categories: string[];
  tags: string[];
  isPremium: boolean;
  metaTitle?: string;
  metaDescription?: string;
}

// Editor types
export interface EditorState {
  content: unknown;
  title: string;
  subtitle: string;
  coverImage: string | null;
  isSaving: boolean;
  lastSaved: Date | null;
}

// Subscription types
export type SubscriptionTierType = "FREE" | "PAID";

export interface SubscriptionStatus {
  tier: SubscriptionTierType;
  isActive: boolean;
  expiresAt: Date | null;
}
