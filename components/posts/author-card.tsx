import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

interface AuthorCardProps {
  author: {
    id: string
    name: string
    avatar?: string | null
    bio?: string | null
  }
}

export function AuthorCard({ author }: AuthorCardProps) {
  return (
    <div className="flex flex-col items-start gap-6 sm:flex-row">
      <Link href={`/author/${author.id}`}>
        <Avatar className="h-16 w-16">
          <AvatarImage src={author.avatar || ""} />
          <AvatarFallback className="text-lg">
            {author.name?.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Link>

      <div className="flex-1">
        <p className="text-muted-foreground mb-1 text-sm">Written by</p>
        <Link
          href={`/author/${author.id}`}
          className="text-xl font-bold hover:underline"
        >
          {author.name}
        </Link>
        {author.bio && (
          <p className="text-muted-foreground mt-2 line-clamp-3">
            {author.bio}
          </p>
        )}
        <Button variant="outline" size="sm" className="mt-4" asChild>
          <Link href={`/author/${author.id}`}>View Profile</Link>
        </Button>
      </div>
    </div>
  )
}
