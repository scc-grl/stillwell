import "@workspace/stillwell-design-system/styles.css";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/stillwell-design-system/components/ui/card";
import { Badge } from "@workspace/stillwell-design-system/components/ui/badge";
import stillwellMark from "@workspace/stillwell-design-system/brand/stillwell-mark.svg";

const journalScreenshot = "/__mockup/images/clinician-landing-journal-illustration.jpg";
const clinicianUrl = "https://stillwell-care.com/clinicians/";

/** Design-only companion preview for the requested clinician landing page section. */
export function ClinicianLanding() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <a className="flex min-h-11 items-center gap-3 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={clinicianUrl} aria-label="Stillwell clinician portal">
            <img src={stillwellMark} alt="" className="size-9" />
            <span className="font-serif text-xl font-semibold">stillwell</span>
          </a>
          <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-4 text-sm">
            <a className="min-h-11 py-3 text-muted-foreground hover:text-foreground" href="#today">Your account</a>
            <a className="min-h-11 py-3 text-muted-foreground hover:text-foreground" href="#planned">What’s planned</a>
            <a className="min-h-11 py-3 text-muted-foreground hover:text-foreground" href="#contact">Contact</a>
          </nav>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="rounded-full border-accent bg-accent text-accent-foreground">Proof-of-concept</Badge>
            <Button variant="outline" asChild><a href="https://stillwell-care.com/clinicians/sign-in">Sign in</a></Button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-2 lg:items-center">
          <div className="space-y-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">For clinicians, programs &amp; researchers</p>
            <h1 className="max-w-2xl font-serif text-4xl font-medium leading-tight sm:text-5xl">A clearer view of what a patient chooses to share.</h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground">An early Stillwell clinician portal concept alongside a private, self-guided recovery journal. Patients stay in control of what they share.</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild><a href="https://stillwell-care.com/clinicians/join">Create a clinician account</a></Button>
              <Button variant="outline" asChild><a href="https://stillwell-care.com/clinicians/sign-in">Sign in</a></Button>
            </div>
          </div>
          <Card className="overflow-hidden rounded-3xl border-border bg-card shadow-none">
            <CardHeader>
              <Badge variant="outline" className="w-fit rounded-full">Illustrative journal view</Badge>
              <CardTitle className="font-serif">A patient-reported check-in</CardTitle>
              <CardDescription>Example layout only. The person shown is fictional.</CardDescription>
            </CardHeader>
            <CardContent>
              <img
                src={journalScreenshot}
                alt="Design preview of a fictional patient's read-only Stillwell journal: dated entries, symptom descriptions, a patient note and a visible safety reminder."
                className="mx-auto max-h-96 w-full rounded-2xl border border-border object-cover object-top"
                loading="lazy"
              />
              <p className="mt-3 text-xs leading-5 text-muted-foreground">Fictional patient · illustrative design preview</p>
            </CardContent>
          </Card>
        </section>

        <section id="today" className="scroll-mt-24 bg-secondary/40 px-5 py-14 sm:px-8 sm:py-16">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">A prototype, in context</p>
              <h2 className="max-w-3xl font-serif text-3xl font-medium sm:text-4xl">What your account does today — and what’s still planned</h2>
              <p className="max-w-3xl leading-7 text-muted-foreground">The journal image above is an illustration of a read-only view, not a real patient record.</p>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <Card className="rounded-3xl border-border bg-card shadow-none" data-testid="clinician-account-today">
                <CardHeader>
                  <CardTitle className="font-serif">What your account does today</CardTitle>
                  <CardDescription>For patients who choose to connect with a clinician they already see.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
                  <p>Read the journal entries, symptom ratings, routines, notes and focus areas the patient chose to share.</p>
                  <p>See dated, patient-reported entries. You can’t edit the patient’s journal.</p>
                </CardContent>
              </Card>
              <Card id="planned" className="scroll-mt-24 rounded-3xl border-border bg-card shadow-none" data-testid="clinician-features-planned">
                <CardHeader>
                  <CardTitle className="font-serif">What’s still planned</CardTitle>
                  <CardDescription>These are not available in the prototype today.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
                  <p>Finding and matching with clinicians by location or care area.</p>
                  <p>Licence verification, partnership intake and research-study listings.</p>
                  <p>A directory or workflow that connects clinicians and patients who haven’t already chosen to share.</p>
                </CardContent>
              </Card>
            </div>
            <p className="max-w-4xl text-sm leading-6 text-muted-foreground">Clinician identities are not verified. The portal is an early proof-of-concept; its design and available tools may change.</p>
          </div>
        </section>

        <section id="contact" className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-14 sm:px-8 sm:py-16 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h2 className="font-serif text-3xl font-medium">A careful first step</h2>
            <p className="max-w-xl leading-7 text-muted-foreground">Explore the clinician prototype and sign in through Stillwell when you’re ready.</p>
          </div>
          <Button asChild><a href={clinicianUrl}>Explore the clinician portal</a></Button>
        </section>
      </main>
      <footer className="border-t border-border px-5 py-6 text-sm text-muted-foreground sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <span>Stillwell clinician portal · design preview</span>
          <a className="min-h-11 py-3 underline-offset-4 hover:text-foreground hover:underline" href="https://stillwell-care.com/clinicians/privacy">Draft privacy notice</a>
        </div>
      </footer>
    </div>
  );
}
