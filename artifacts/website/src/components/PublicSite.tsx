import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowUpRight, Instagram, Menu, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useSubscribeNewsletter } from "@workspace/api-client-react";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Input } from "@workspace/stillwell-design-system/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import stillwellMark from "@workspace/stillwell-design-system/brand/stillwell-mark.svg";
import { SiteButton } from "@/components/SiteComponents";
import { ThemeToggle } from "@/components/WebsiteTheme";

const subscriptionSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(254, "Email address is too long."),
});
type SubscriptionValues = z.infer<typeof subscriptionSchema>;

export function Brand({ inverted = false, large = false, journal = false, testId = "link-stillwell-home" }: { inverted?: boolean; large?: boolean; journal?: boolean; testId?: string }) {
  return <Link href="/" aria-label="Stillwell home" data-testid={testId} className={journal
    ? `brand-lockup${inverted ? " brand-lockup-inverted" : ""}${large ? " brand-lockup-large" : ""}`
    : `flex items-center gap-3 ${inverted ? "text-primary-foreground" : "text-foreground"}`}>
    {journal
      ? <><img src={stillwellMark} alt="" aria-hidden="true" className="brand-lockup-mark" /><span className="brand-lockup-wordmark">stillwell</span></>
      : <><span className="brand-mark" aria-hidden="true" /><span className="display text-[21px] font-semibold tracking-[-.04em]">stillwell</span></>}
  </Link>;
}

export function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [location] = useLocation();
  const closeMenu = () => setMenuOpen(false);
  const howActive = location.startsWith("/demo");
  const resourceActive = location.startsWith("/faqs");
  const navClass = (active: boolean) => `site-nav-link min-h-11 inline-flex items-center ${active ? "site-nav-active" : ""}`;
  return <header className="sticky top-0 z-50 border-b border-border bg-background/95 shadow-sm backdrop-blur-sm">
    <div className="mx-auto flex max-w-[1240px] items-center justify-between px-5 py-3 sm:px-8 lg:px-12 lg:py-4">
      <Brand journal testId="link-header-stillwell-home"/>
      <nav className="hidden items-center gap-6 text-sm font-semibold text-graphite lg:flex" aria-label="Main navigation">
        <a data-testid="link-nav-care" href="/clinicians/" className={navClass(location.startsWith("/clinicians") || location.startsWith("/find-your-clinician"))}>Find Care</a>
        <Link data-testid="link-nav-resources" href="/faqs" className={navClass(resourceActive)}>Resource Library</Link>
        <Link data-testid="link-nav-how-it-works" href="/demo" className={navClass(howActive)}>How it works</Link>
      </nav>
      <div className="hidden items-center gap-3 lg:flex">
        <ThemeToggle testId="button-theme-toggle-desktop"/>
        <Link data-testid="link-sign-in" href="/sign-in" className="px-3 py-2 text-sm font-semibold text-graphite hover:text-primary">Sign in</Link>
        <SiteButton asChild><Link data-testid="link-begin-journal" href="/quiz">Start your intake <ArrowUpRight size={15}/></Link></SiteButton>
      </div>
      <Button type="button" variant="outline" size="icon" data-testid="button-mobile-menu" className="rounded-full text-primary lg:hidden" onClick={() => setMenuOpen(value => !value)} aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="mobile-public-navigation">{menuOpen ? <X size={18}/> : <Menu size={18}/>}</Button>
    </div>
    {menuOpen && <nav id="mobile-public-navigation" className="grid gap-1 border-t border-border bg-background px-5 py-3 lg:hidden" aria-label="Mobile navigation">
      <a data-testid="link-mobile-find-care" onClick={closeMenu} href="/clinicians/" className="rounded-lg px-3 py-3 text-sm text-secondary-foreground hover:bg-secondary">Find Care</a>
      <Link data-testid="link-mobile-resource-library" onClick={closeMenu} href="/faqs" className={`rounded-lg px-3 py-3 text-sm text-secondary-foreground hover:bg-secondary ${resourceActive ? "site-nav-active" : ""}`}>Resource Library</Link>
      <Link data-testid="link-mobile-how-it-works" onClick={closeMenu} href="/demo" className={`rounded-lg px-3 py-3 text-sm text-secondary-foreground hover:bg-secondary ${howActive ? "site-nav-active" : ""}`}>How it works</Link>
      <div className="flex items-center justify-between px-3 py-1"><ThemeToggle testId="button-theme-toggle-mobile"/><Link data-testid="link-mobile-sign-in" onClick={closeMenu} href="/sign-in" className="min-h-11 inline-flex items-center px-3 text-sm font-semibold text-secondary-foreground">Sign in</Link></div>
      <SiteButton asChild className="w-full"><Link data-testid="link-mobile-begin-journal" onClick={closeMenu} href="/quiz">Start your intake <ArrowUpRight size={16}/></Link></SiteButton>
    </nav>}
  </header>;
}

function NewsletterForm() {
  const subscribe = useSubscribeNewsletter();
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const form = useForm<SubscriptionValues>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: { email: "" },
  });
  const onSubmit = (values: SubscriptionValues) => {
    setFeedback(null);
    subscribe.mutate({ data: { email: values.email.trim() } }, {
      onSuccess: () => {
        form.reset({ email: "" });
        setFeedback({ kind: "success", message: "You’re subscribed. Thank you for joining us." });
      },
      onError: () => setFeedback({ kind: "error", message: "We couldn’t subscribe you just now. Please try again." }),
    });
  };
  return <div>
    <p className="text-sm leading-6 text-graphite">Occasional notes from Stillwell, for the community around a more personal recovery journal.</p>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]" noValidate>
        <FormField control={form.control} name="email" render={({ field }) => <FormItem className="space-y-1.5">
          <FormLabel className="sr-only">Email address</FormLabel>
          <FormControl><Input {...field} type="email" autoComplete="email" placeholder="Your email address" data-testid="input-newsletter-email" aria-label="Email address" disabled={subscribe.isPending} className="border-border bg-background text-foreground placeholder:text-muted-foreground"/></FormControl>
          <FormDescription className="sr-only">Enter your email to receive occasional Stillwell updates.</FormDescription>
          <FormMessage data-testid="status-newsletter-validation" className="text-foreground"/>
        </FormItem>}/>
        <Button type="submit" size="sm" disabled={subscribe.isPending} data-testid="button-newsletter-subscribe" className="min-h-12 bg-background text-primary hover:bg-secondary">{subscribe.isPending ? "Subscribing…" : "Subscribe"}</Button>
      </form>
    </Form>
    {feedback && <p data-testid="status-newsletter-feedback" role={feedback.kind === "error" ? "alert" : "status"} aria-live={feedback.kind === "error" ? "assertive" : "polite"} className={`mt-3 rounded-xl px-3 py-2 text-xs ${feedback.kind === "success" ? "bg-secondary text-secondary-foreground" : "border border-notice-border bg-notice text-notice-foreground"}`}>{feedback.message}</p>}
  </div>;
}

export function PublicFooter() {
  return <footer className="public-footer border-t border-border bg-tile-clay text-foreground">
    <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-12 sm:grid-cols-2 sm:px-8 lg:grid-cols-4 lg:gap-8 lg:px-12 lg:py-14">
      <section aria-labelledby="footer-about"><h2 id="footer-about" className="text-xs font-semibold uppercase tracking-[.12em] text-foreground">About Stillwell</h2><ul className="mt-4 space-y-3 text-sm text-graphite"><li><Link data-testid="link-footer-history" href="/our-history" className="hover:underline">About Us</Link></li><li><Link data-testid="link-footer-faqs" href="/faqs" className="hover:underline">FAQs</Link></li><li><Link data-testid="link-footer-contact" href="/contact" className="hover:underline">Contact us</Link></li></ul></section>
      <section aria-labelledby="footer-partners"><h2 id="footer-partners" className="text-xs font-semibold uppercase tracking-[.12em] text-foreground">Partner with Stillwell</h2><ul className="mt-4 space-y-3 text-sm text-graphite"><li><Link data-testid="link-footer-clinicians" href="/clinicians/" className="hover:underline">For clinicians</Link></li><li><Link data-testid="link-footer-clinician-sign-up" href="/clinicians/join" className="hover:underline">Athletic Programs</Link></li><li><Link data-testid="link-footer-directory" href="/find-your-clinician" className="hover:underline">Find your clinician (planned)</Link></li></ul></section>
      <section aria-labelledby="footer-community"><h2 id="footer-community" className="text-xs font-semibold uppercase tracking-[.12em] text-foreground">Join the Stillwell community</h2><div className="mt-4"><NewsletterForm/></div></section>
      <section aria-labelledby="footer-connect"><h2 id="footer-connect" className="text-xs font-semibold uppercase tracking-[.12em] text-foreground">Connect with Stillwell</h2><a data-testid="link-instagram-placeholder" href="https://www.instagram.com/stillwell_placeholder/" target="_blank" rel="noreferrer noopener" aria-label="Stillwell on Instagram (placeholder link; replace with official account)" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-graphite px-4 py-2 text-sm text-graphite transition-colors hover:bg-background/50"><Instagram size={17}/>Instagram <ArrowUpRight size={14}/></a><p className="mt-3 max-w-[230px] text-xs leading-5 text-graphite">Placeholder social link; replace with the official Stillwell Instagram URL.</p></section>
    </div>
    <div className="border-t border-graphite/30 bg-tile-clay">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-4 px-5 py-6 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12">
        <Brand journal large testId="link-footer-stillwell-home"/>
        <nav className="flex flex-wrap gap-4 text-sm text-graphite" aria-label="Footer navigation">
          <Link data-testid="link-footer-self-recovery" href="/quiz" className="hover:underline">Self Recovery</Link>
          <a data-testid="link-footer-find-care" href="/clinicians/" className="hover:underline">Find Care</a>
          <Link data-testid="link-footer-resource-library" href="/faqs" className="hover:underline">Resource Library</Link>
          <Link data-testid="link-footer-how-it-works" href="/demo" className="hover:underline">How it works</Link>
          <Link data-testid="link-footer-privacy" href="/privacy" className="hover:underline">Privacy</Link>
          <Link data-testid="link-footer-clinician-portal" href="/clinicians/" className="hover:underline">For clinicians</Link>
          <Link data-testid="link-footer-directory" href="/find-your-clinician" className="hover:underline">Find your clinician (planned)</Link>
          <Link data-testid="link-footer-sign-in" href="/sign-in" className="hover:underline">Sign in</Link>
        </nav>
        <p className="text-xs text-graphite">© {new Date().getFullYear()} Stillwell</p>
      </div>
    </div>
  </footer>;
}

export function PublicLayout({ children }: { children: ReactNode }) {
  return <div className="stillwell min-h-[100dvh]">
    <a href="#main" data-testid="link-skip-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-background focus:px-4 focus:py-3 focus:text-foreground">Skip to content</a>
    <PublicHeader/>
    {children}
    <PublicFooter/>
  </div>;
}
