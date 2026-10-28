import "@workspace/stillwell-design-system/styles.css";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/stillwell-design-system/components/ui/card";
import { Badge } from "@workspace/stillwell-design-system/components/ui/badge";
import stillwellMark from "@workspace/stillwell-design-system/brand/stillwell-mark.svg";
import { ArrowRight, BookOpenCheck, CircleAlert, LockKeyhole, UsersRound } from "lucide-react";

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
        <section id="today" className="mx-auto grid max-w-7xl gap-6 px-5 py-8 sm:px-8 sm:py-12 lg:grid-cols-[1.05fr_.95fr] lg:items-stretch">
          <div className="flex flex-col justify-between gap-8 rounded-3xl bg-primary p-6 text-primary-foreground sm:p-9">
            <div className="space-y-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/80">Your clinician workspace</p>
              <h1 className="max-w-2xl font-serif text-4xl font-medium leading-tight sm:text-5xl">A clearer view of what a patient chooses to share.</h1>
              <p className="max-w-xl text-base leading-7 text-primary-foreground/85">Review patient-reported journal entries in one place when someone chooses to connect with you. Their journal remains read-only for clinicians.</p>
            </div>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" asChild><a href="https://stillwell-care.com/clinicians/join">Create a clinician account <ArrowRight aria-hidden="true" /></a></Button>
                <Button variant="outline" className="border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10" asChild><a href="https://stillwell-care.com/clinicians/sign-in">Sign in</a></Button>
              </div>
              <p className="flex items-center gap-2 text-sm text-primary-foreground/80"><LockKeyhole aria-hidden="true" className="size-4" />Patients choose whether and when to share.</p>
            </div>
          </div>

          <Card className="overflow-hidden rounded-3xl border-border bg-card shadow-none">
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">A shared journal</p>
                <Badge variant="outline" className="rounded-full">Illustration only</Badge>
              </div>
              <CardTitle className="font-serif text-2xl">Patient-reported progress</CardTitle>
              <CardDescription>Dated check-ins and a note a patient chose to share. This is not a real patient record.</CardDescription>
            </CardHeader>
            <CardContent>
              <img
                src={journalScreenshot}
                alt="Illustrative design of a fictional patient's shared journal, with dated symptom entries, a patient note and a safety reminder."
                className="mx-auto max-h-96 w-full rounded-2xl border border-border object-cover object-top"
                loading="lazy"
              />
              <p className="mt-3 flex items-center gap-2 text-xs leading-5 text-muted-foreground"><CircleAlert aria-hidden="true" className="size-4 shrink-0" />Fictional example · no patient data</p>
            </CardContent>
          </Card>
        </section>

        <section className="bg-secondary/40 px-5 py-12 sm:px-8 sm:py-16">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">Your workspace</p>
              <h2 className="max-w-3xl font-serif text-3xl font-medium sm:text-4xl">A calm place to review what’s been shared.</h2>
              <p className="max-w-3xl leading-7 text-muted-foreground">Like the patient journal, the clinician workspace keeps information organized by person and by day. It shows only entries shared with your account.</p>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <Card className="rounded-3xl border-border bg-card shadow-none">
                <CardHeader>
                  <div className="flex size-11 items-center justify-center rounded-full bg-secondary text-primary"><UsersRound aria-hidden="true" className="size-5" /></div>
                  <CardTitle className="font-serif">Patients who choose to connect</CardTitle>
                  <CardDescription>Shared journals appear in your patient list after a patient invites you or agrees to your request.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" asChild><a href={clinicianUrl}>Open clinician portal <ArrowRight aria-hidden="true" /></a></Button>
                </CardContent>
              </Card>
              <Card className="rounded-3xl border-border bg-card shadow-none">
                <CardHeader>
                  <div className="flex size-11 items-center justify-center rounded-full bg-secondary text-primary"><BookOpenCheck aria-hidden="true" className="size-5" /></div>
                  <CardTitle className="font-serif">A read-only journal view</CardTitle>
                  <CardDescription>Review the patient-reported details they have chosen to share, including dated entries and notes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
                  <p>See their recorded symptom ratings, routines, notes and focus areas.</p>
                  <p>You can read shared entries, but you cannot edit a patient’s journal.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section id="planned" className="mx-auto max-w-7xl space-y-6 px-5 py-12 sm:px-8 sm:py-16">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">A prototype, in context</p>
            <h2 className="max-w-3xl font-serif text-3xl font-medium sm:text-4xl">Available today — and what’s still planned</h2>
            <p className="max-w-3xl leading-7 text-muted-foreground">The journal shown above is illustrative. Patient journals in the portal are real only when patients choose to share them.</p>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="rounded-3xl border-border bg-card shadow-none" data-testid="clinician-account-today">
              <CardHeader>
                <CardTitle className="font-serif">What your account does today</CardTitle>
                <CardDescription>Private clinician account tools.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
                <p>Manage your professional profile and open the patient journals shared with you.</p>
                <p>Patient journal access is read-only. Patients can stop sharing at any time.</p>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-border bg-card shadow-none" data-testid="clinician-features-planned">
              <CardHeader>
                <CardTitle className="font-serif">What’s still planned</CardTitle>
                <CardDescription>These features are not available today.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
                <p>Finding and matching with clinicians by location or care area.</p>
                <p>Licence verification, partnership intake and research-study listings.</p>
              </CardContent>
            </Card>
          </div>
          <p className="max-w-4xl text-sm leading-6 text-muted-foreground">Clinician identities are not verified. The portal is an early proof-of-concept; its design and available tools may change.</p>
        </section>

        <section id="contact" className="mx-auto flex max-w-7xl flex-col gap-5 border-t border-border px-5 py-12 sm:px-8 sm:py-16 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h2 className="font-serif text-3xl font-medium">A careful first step</h2>
            <p className="max-w-xl leading-7 text-muted-foreground">Explore the clinician workspace and sign in through Stillwell when you’re ready.</p>
          </div>
          <Button asChild><a href={clinicianUrl}>Explore the clinician portal <ArrowRight aria-hidden="true" /></a></Button>
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
