import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowUpRight, Instagram, Menu, X } from "lucide-react";
import { Link } from "wouter";
import { useSubscribeNewsletter } from "@workspace/api-client-react";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Input } from "@workspace/stillwell-design-system/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const subscriptionSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(254, "Email address is too long."),
});
type SubscriptionValues = z.infer<typeof subscriptionSchema>;

export function Brand({ inverted = false }: { inverted?: boolean }) {
  return <Link href="/" aria-label="Stillwell home" data-testid="link-stillwell-home" className={`flex items-center gap-3 ${inverted ? "text-primary-foreground" : "text-foreground"}`}><span className="brand-mark"/><span className="display text-[21px] font-semibold tracking-[-.04em]">stillwell</span></Link>;
}

export function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  return <header className="sticky top-0 z-50 border-b border-border bg-background/95 shadow-sm backdrop-blur-sm">
    <div className="mx-auto flex max-w-[1240px] items-center justify-between px-5 py-3 sm:px-8 lg:px-12 lg:py-4">
      <Brand/>
      <nav className="hidden items-center gap-6 text-[12px] font-medium text-muted-foreground lg:flex" aria-label="Main navigation">
        <Link data-testid="link-nav-recovery" href="/">For people in recovery</Link><Link data-testid="link-nav-resources" href="/faqs">Resources</Link><Link data-testid="link-nav-find-clinician" href="/find-your-clinician">Find your clinician</Link><Link data-testid="link-nav-partners" href="/partners">For partners</Link>
      </nav>
      <div className="hidden items-center gap-3 lg:flex"><Link data-testid="link-sign-in" href="/sign-in" className="px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-primary">Sign in</Link><Link data-testid="link-begin-journal" href="/quiz" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-[12px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90">Begin your journal <ArrowUpRight size={15}/></Link></div>
      <button type="button" data-testid="button-mobile-menu" className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border text-primary transition-colors hover:bg-secondary lg:hidden" onClick={() => setMenuOpen(value => !value)} aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="mobile-public-navigation">{menuOpen ? <X size={18}/> : <Menu size={18}/>}</button>
    </div>
    {menuOpen && <nav id="mobile-public-navigation" className="grid gap-1 border-t border-border bg-background px-5 py-3 lg:hidden" aria-label="Mobile navigation">
      {[["For people in recovery", "/"], ["Resources", "/faqs"], ["Find your clinician", "/find-your-clinician"], ["For partners", "/partners"]].map(([label, href]) => <Link key={href} data-testid={`link-mobile-${label.toLowerCase().replaceAll(" ", "-")}`} onClick={closeMenu} href={href} className="rounded-lg px-3 py-3 text-sm text-secondary-foreground hover:bg-secondary">{label}</Link>)}
      <Link data-testid="link-mobile-sign-in" onClick={closeMenu} href="/sign-in" className="px-3 py-3 text-sm font-semibold text-secondary-foreground">Sign in</Link>
      <Link data-testid="link-mobile-begin-journal" onClick={closeMenu} href="/quiz" className="rounded-full bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground">Begin your journal</Link>
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
    <p className="text-sm leading-6 text-primary-foreground/80">Occasional notes from Stillwell, for the community around a more personal recovery journal.</p>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]" noValidate>
        <FormField control={form.control} name="email" render={({ field }) => <FormItem className="space-y-1.5">
          <FormLabel className="sr-only">Email address</FormLabel>
          <FormControl><Input {...field} type="email" autoComplete="email" placeholder="Your email address" data-testid="input-newsletter-email" aria-label="Email address" disabled={subscribe.isPending} className="border-border bg-background text-foreground placeholder:text-muted-foreground"/></FormControl>
          <FormDescription className="sr-only">Enter your email to receive occasional Stillwell updates.</FormDescription>
          <FormMessage data-testid="status-newsletter-validation" className="text-primary-foreground"/>
        </FormItem>}/>
        <Button type="submit" size="sm" disabled={subscribe.isPending} data-testid="button-newsletter-subscribe" className="bg-background text-primary hover:bg-secondary">{subscribe.isPending ? "Subscribing…" : "Subscribe"}</Button>
      </form>
    </Form>
    {feedback && <p data-testid="status-newsletter-feedback" role={feedback.kind === "error" ? "alert" : "status"} aria-live={feedback.kind === "error" ? "assertive" : "polite"} className={`mt-3 rounded-xl px-3 py-2 text-xs ${feedback.kind === "success" ? "bg-secondary text-secondary-foreground" : "border border-primary-foreground/30 bg-primary/90 text-primary-foreground"}`}>{feedback.message}</p>}
  </div>;
}

export function PublicFooter() {
  return <footer className="border-t border-border bg-primary text-primary-foreground">
    <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-12 sm:grid-cols-2 sm:px-8 lg:grid-cols-4 lg:gap-8 lg:px-12 lg:py-14">
      <section aria-labelledby="footer-about"><h2 id="footer-about" className="text-xs font-semibold uppercase tracking-[.12em] text-primary-foreground">About Stillwell</h2><ul className="mt-4 space-y-3 text-sm text-primary-foreground/85"><li><Link data-testid="link-footer-history" href="/our-history" className="hover:underline">About Us</Link></li><li><Link data-testid="link-footer-faqs" href="/faqs" className="hover:underline">FAQs</Link></li><li><Link data-testid="link-footer-contact" href="/contact" className="hover:underline">Contact us</Link></li></ul></section>
      <section aria-labelledby="footer-partners"><h2 id="footer-partners" className="text-xs font-semibold uppercase tracking-[.12em] text-primary-foreground">Partner with Stillwell</h2><ul className="mt-4 space-y-3 text-sm text-primary-foreground/85"><li><Link data-testid="link-footer-partners" href="/partners" className="hover:underline">For partners</Link></li><li><Link data-testid="link-footer-clinicians" href="/partners/join" className="hover:underline">Create a clinician account</Link></li><li><Link data-testid="link-footer-directory" href="/find-your-clinician" className="hover:underline">Find your clinician</Link></li></ul></section>
      <section aria-labelledby="footer-community"><h2 id="footer-community" className="text-xs font-semibold uppercase tracking-[.12em] text-primary-foreground/80">Join the Stillwell community</h2><div className="mt-4"><NewsletterForm/></div></section>
      <section aria-labelledby="footer-connect"><h2 id="footer-connect" className="text-xs font-semibold uppercase tracking-[.12em] text-primary-foreground">Connect with Stillwell</h2><a data-testid="link-instagram-placeholder" href="https://www.instagram.com/stillwell_placeholder/" target="_blank" rel="noreferrer noopener" aria-label="Stillwell on Instagram (placeholder link; replace with official account)" className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary-foreground/40 px-4 py-2 text-sm text-primary-foreground transition-colors hover:bg-primary-foreground/10"><Instagram size={17}/>Instagram <ArrowUpRight size={14}/></a><p className="mt-3 max-w-[230px] text-xs leading-5 text-primary-foreground/80">Placeholder social link; replace with the official Stillwell Instagram URL.</p></section>
    </div>
    <div className="border-t border-primary-foreground/20 bg-primary/95">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-4 px-5 py-6 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12">
        <Brand inverted/>
        <p data-testid="text-footer-disclaimer" className="max-w-[500px] text-[10px] leading-5 text-primary-foreground/80">An educational, user-led journal for concussion recovery. Not medical advice or emergency care.</p>
        <div className="flex flex-wrap gap-4 text-[11px] text-primary-foreground/90"><Link data-testid="link-footer-privacy" href="/privacy" className="hover:underline">Privacy</Link><Link data-testid="link-footer-clinician-portal" href="/clinician/portal" className="hover:underline">Clinician portal</Link><Link data-testid="link-footer-directory" href="/find-your-clinician" className="hover:underline">Find your clinician</Link><Link data-testid="link-footer-sign-in" href="/sign-in" className="hover:underline">Sign in</Link></div>
        <p className="text-[10px] text-primary-foreground/75">© {new Date().getFullYear()} Stillwell</p>
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
