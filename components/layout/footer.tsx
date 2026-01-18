import Link from "next/link";
import { Container } from "./container";
import { SubscribeForm } from "@/components/newsletter/subscribe-form";

export function Footer() {
  const currentYear = new Date().getFullYear();

  const links = {
    product: [
      { href: "/", label: "Home" },
      { href: "/search", label: "Explore" },
      { href: "/subscribe", label: "Subscribe" },
    ],
    company: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  };

  return (
    <footer className="border-t bg-muted/30">
      <Container className="py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="text-xl font-bold font-serif">
              {process.env.NEXT_PUBLIC_APP_NAME || "Blog"}
            </Link>
            <p className="mt-4 text-muted-foreground max-w-sm">
              A modern blogging platform for writers and readers. Share your
              stories with the world.
            </p>
            <div className="mt-6">
              <p className="text-sm font-medium mb-3">Subscribe to updates</p>
              <SubscribeForm className="max-w-sm" />
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-medium mb-4">Product</h3>
            <ul className="space-y-2">
              {links.product.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-medium mb-4">Company</h3>
            <ul className="space-y-2">
              {links.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t">
          <p className="text-center text-sm text-muted-foreground">
            {currentYear} {process.env.NEXT_PUBLIC_APP_NAME || "Blog"}. All
            rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
}
