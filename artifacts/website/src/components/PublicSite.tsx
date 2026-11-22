import type { ReactNode } from "react";
import { Link } from "wouter";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import stillwellMark from "@workspace/stillwell-design-system/brand/stillwell-mark.svg";

export function Brand({ inverted = false, large = false, journal = false, testId = "link-stillwell-home" }: { inverted?: boolean; large?: boolean; journal?: boolean; testId?: string }) {
  return <Link href="/" aria-label="Stillwell home" data-testid={testId} className={journal
    ? `brand-lockup min-h-12${inverted ? " brand-lockup-inverted" : ""}${large ? " brand-lockup-large" : ""}`
    : `flex min-h-12 items-center gap-3 ${inverted ? "text-primary-foreground" : "text-foreground"}`}>
    {journal
      ? <><img src={stillwellMark} alt="" aria-hidden="true" className="brand-lockup-mark"/><span className="brand-lockup-wordmark">stillwell</span></>
      : <><span className="brand-mark" aria-hidden="true"/><span className="display text-[21px] font-semibold tracking-[-.04em]">stillwell</span></>}
  </Link>;
}

export function PublicHeader() {
  return <header className="border-b border-border bg-background">
    <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
      <Brand journal testId="link-header-stillwell-home"/>
      <nav aria-label="Public navigation" className="flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" className="min-h-12"><Link href="/privacy">Privacy</Link></Button>
        <Button asChild variant="ghost" className="min-h-12"><Link href="/contact">Contact</Link></Button>
        <Button asChild variant="outline" className="min-h-12"><Link href="/sign-in">Sign in</Link></Button>
      </nav>
    </div>
  </header>;
}

export function PublicFooter() {
  return <footer className="border-t border-border px-4 py-7 text-center text-base text-muted-foreground">
    <Link href="/privacy" className="underline underline-offset-4">Privacy</Link>
    <span className="px-3">·</span>
    <Link href="/contact" className="underline underline-offset-4">Contact</Link>
  </footer>;
}

export function PublicLayout({ children }: { children: ReactNode }) {
  return <div className="stillwell min-h-[100dvh]">
    <a href="#main" data-testid="link-skip-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-background focus:p-3">Skip to content</a>
    <PublicHeader/>
    {children}
    <PublicFooter/>
  </div>;
}
