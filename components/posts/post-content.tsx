import { cn } from "@/lib/utils";

interface PostContentProps {
  html: string;
  className?: string;
}

export function PostContent({ html, className }: PostContentProps) {
  return (
    <div
      className={cn(
        "prose prose-lg prose-slate dark:prose-invert max-w-none",
        // Headings
        "prose-headings:font-serif prose-headings:tracking-tight",
        "prose-h1:text-4xl prose-h1:mb-4",
        "prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-4",
        "prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-3",
        // Paragraphs
        "prose-p:text-lg prose-p:leading-relaxed prose-p:mb-6",
        // Links
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        // Lists
        "prose-ul:my-6 prose-ol:my-6",
        "prose-li:text-lg prose-li:leading-relaxed",
        // Blockquotes
        "prose-blockquote:border-l-4 prose-blockquote:border-primary",
        "prose-blockquote:pl-6 prose-blockquote:italic",
        "prose-blockquote:not-italic prose-blockquote:font-normal",
        // Code
        "prose-code:text-sm prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded",
        "prose-pre:bg-muted prose-pre:border",
        // Images
        "prose-img:rounded-lg prose-img:my-8",
        // Figures
        "prose-figure:my-8",
        "prose-figcaption:text-center prose-figcaption:text-sm prose-figcaption:text-muted-foreground",
        // HR
        "prose-hr:my-12",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
