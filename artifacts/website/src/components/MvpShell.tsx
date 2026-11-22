import { Link, useLocation } from "wouter";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Brand } from "@/components/PublicSite";

export function MvpShell({ children }: { children: import("react").ReactNode }) {
  const [location] = useLocation();
  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/dashboard/journal", label: "Journal" },
    { href: "/dashboard/account", label: "Account" },
  ];
  return <div className="stillwell min-h-[100dvh]">
    <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-background focus:p-3">Skip to content</a>
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
        <Brand journal/>
        <nav aria-label="Patient navigation" className="flex flex-wrap gap-1">
          {links.map(({ href, label }) => <Button key={href} asChild variant={location === href ? "secondary" : "ghost"} className="min-h-12">
            <Link href={href} aria-current={location === href ? "page" : undefined}>{label}</Link>
          </Button>)}
        </nav>
      </div>
    </header>
    <main id="main" className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-8 sm:py-10">{children}</main>
    <footer className="border-t border-border px-4 py-6 text-center text-base text-muted-foreground">
      <Link href="/privacy" className="underline underline-offset-4">Privacy</Link>
      <span className="px-3">·</span>
      <Link href="/contact" className="underline underline-offset-4">Contact</Link>
    </footer>
  </div>;
}

