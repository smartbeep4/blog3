import Link from "next/link"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="bg-muted/30 min-h-screen">
      {/* Simple header with logo */}
      <header className="absolute top-0 right-0 left-0 px-6 py-4">
        <Link href="/" className="inline-flex items-center gap-2">
          <span className="text-xl font-bold">BlogPlatform</span>
        </Link>
      </header>

      {/* Auth content */}
      <main>{children}</main>

      {/* Simple footer */}
      <footer className="text-muted-foreground absolute right-0 bottom-0 left-0 px-6 py-4 text-center text-sm">
        <p>
          &copy; {new Date().getFullYear()} BlogPlatform. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
