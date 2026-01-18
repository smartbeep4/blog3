import Link from "next/link";
import Image from "next/image";
import { formatDate } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface PostCardProps {
  post: {
    slug: string;
    title: string;
    subtitle?: string | null;
    excerpt?: string | null;
    coverImage?: string | null;
    publishedAt: Date | string;
    readingTime?: number | null;
    isPremium: boolean;
    author: {
      name: string;
      avatar?: string | null;
    };
    categories?: { name: string; slug: string }[];
  };
  variant?: "default" | "compact" | "featured";
}

export function PostCard({ post, variant = "default" }: PostCardProps) {
  if (variant === "featured") {
    return (
      <Link href={`/${post.slug}`} className="group block">
        <article className="relative overflow-hidden rounded-xl">
          {/* Cover Image */}
          <div className="relative aspect-[16/9] bg-muted">
            {post.coverImage ? (
              <Image
                src={post.coverImage}
                alt={post.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 1200px"
                priority
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-6xl font-serif text-muted-foreground/50">
                  {post.title[0]}
                </span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          </div>

          {/* Content Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            {post.categories?.[0] && (
              <Badge className="mb-3">{post.categories[0].name}</Badge>
            )}

            <h2 className="text-2xl md:text-4xl font-bold font-serif text-white mb-2 group-hover:underline decoration-2 underline-offset-4">
              {post.title}
            </h2>

            {post.subtitle && (
              <p className="text-lg text-white/80 mb-4 line-clamp-2">
                {post.subtitle}
              </p>
            )}

            <div className="flex items-center gap-3 text-sm text-white/70">
              <Avatar className="h-8 w-8 border-2 border-white/20">
                <AvatarImage src={post.author.avatar || ""} />
                <AvatarFallback className="text-xs">
                  {post.author.name?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span>{post.author.name}</span>
              <span>-</span>
              <span>{formatDate(post.publishedAt)}</span>
              {post.readingTime && (
                <>
                  <span>-</span>
                  <span>{post.readingTime} min read</span>
                </>
              )}
              {post.isPremium && <Lock className="h-4 w-4 ml-1" />}
            </div>
          </div>
        </article>
      </Link>
    );
  }

  if (variant === "compact") {
    return (
      <Link href={`/${post.slug}`} className="group flex gap-4">
        {post.coverImage && (
          <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden">
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              className="object-cover"
              sizes="80px"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium line-clamp-2 group-hover:text-primary transition-colors">
            {post.title}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {formatDate(post.publishedAt)}
          </p>
        </div>
      </Link>
    );
  }

  // Default variant
  return (
    <Link href={`/${post.slug}`} className="group block">
      <article className="space-y-4">
        {/* Cover Image */}
        {post.coverImage && (
          <div className="relative aspect-[16/10] rounded-lg overflow-hidden bg-muted">
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 400px"
            />
            {post.isPremium && (
              <div className="absolute top-3 right-3">
                <Badge variant="secondary" className="gap-1">
                  <Lock className="h-3 w-3" />
                  Premium
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="space-y-2">
          {post.categories?.[0] && (
            <Badge variant="secondary" className="text-xs">
              {post.categories[0].name}
            </Badge>
          )}

          <h2 className="text-xl font-bold font-serif group-hover:text-primary transition-colors line-clamp-2">
            {post.title}
          </h2>

          {post.excerpt && (
            <p className="text-muted-foreground line-clamp-2">{post.excerpt}</p>
          )}

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Avatar className="h-6 w-6">
              <AvatarImage src={post.author.avatar || ""} />
              <AvatarFallback className="text-xs">
                {post.author.name?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span>{post.author.name}</span>
            <span>-</span>
            <span>{formatDate(post.publishedAt)}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
