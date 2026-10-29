import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card } from "@workspace/stillwell-design-system/components/ui/card";
import { PublicHeader } from "@/components/PublicSite";

export default function DemoLandingPage() {
  return (
    <div className="stillwell min-h-[100dvh]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-3 focus:text-foreground">Skip to content</a>
      <PublicHeader />
      <main id="main" className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-4 py-10 sm:gap-16 sm:px-8 sm:py-14">
        <section className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
          <div className="space-y-5">
            <p className="eyebrow">Care for the in-between</p>
            <h1 className="display max-w-2xl text-5xl font-normal leading-tight sm:text-6xl">Recovery can feel less like guesswork.</h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground">Most concussion recovery happens at home, between clinic visits. Stillwell helps you notice what changes, see where you might be on the recovery roadmap, and keep your clinician in the loop.</p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Button asChild className="min-h-12 rounded-full px-6"><Link href="/sign-up">Sign up <ArrowUpRight aria-hidden="true" /></Link></Button>
              <Button asChild variant="outline" className="min-h-12 rounded-full px-6"><Link href="/demo/intake">Follow Maya's journey <ArrowRight aria-hidden="true" /></Link></Button>
            </div>
          </div>
          <div role="img" aria-label="Soft botanical colors and concentric circles" className="relative mx-auto aspect-square w-full max-w-lg">
            <div className="hero-art absolute inset-0 rounded-full" />
            <div className="grain pointer-events-none absolute inset-0" />
            <div className="absolute inset-1/4 rounded-full border border-background/70" />
            <div className="absolute inset-1/3 rounded-full border border-background/80" />
            <div className="absolute left-1/3 top-1/3 size-1/3 rounded-full bg-accent/70" />
            <div className="absolute left-1/2 top-1/2 size-1/6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/60" />
            <span className="absolute left-4 top-4 rounded-full border border-border bg-background/90 px-4 py-2 text-sm text-secondary-foreground">Care, at your pace</span>
            <div className="absolute bottom-4 right-4 max-w-56 rounded-xl border border-border bg-background/95 p-4 shadow-lg">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">A steadier next step</p>
              <p className="display mt-2 text-xl leading-tight">Built around what matters to you.</p>
            </div>
          </div>
        </section>

        <section aria-labelledby="demo-stories-heading" className="space-y-6">
          <div className="max-w-2xl space-y-3">
            <p className="eyebrow">How it works</p>
            <h2 id="demo-stories-heading" className="display text-4xl font-normal sm:text-5xl">Two people, one recovery.</h2>
            <p className="text-base leading-7 text-muted-foreground">Follow a sample patient and her sports medicine physician through Stillwell. They're made up, and so is their data. The screens are the real ones.</p>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="flex flex-col gap-5 p-6 sm:p-7">
              <div className="flex items-center gap-4">
                <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-full bg-secondary font-semibold text-primary">MJ</span>
                <div><h3 className="display text-2xl">Maya J.</h3><p className="text-sm text-muted-foreground">Patient · college soccer player, 20</p></div>
              </div>
              <p className="text-sm leading-6">Maya took a head-to-head hit in a match on Saturday. By day 3 she has headaches most of the day, screens wear her out, and she doesn't know what's safe. She wants to get back on the field, safely.</p>
              <ol className="space-y-2 text-sm leading-6">
                <li className="flex gap-3"><strong className="text-primary">1</strong>Tells Stillwell her story, in her own words</li>
                <li className="flex gap-3"><strong className="text-primary">2</strong>Sees where she might be on the recovery roadmap</li>
                <li className="flex gap-3"><strong className="text-primary">3</strong>Checks in each day and shares her journal with Ray</li>
              </ol>
              <Button asChild className="mt-auto min-h-12 w-fit rounded-full px-6"><Link href="/demo/intake">Follow her journey <ArrowRight aria-hidden="true" /></Link></Button>
            </Card>
            <Card className="flex flex-col gap-5 p-6 sm:p-7">
              <div className="flex items-center gap-4">
                <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-full bg-accent/60 font-semibold text-accent-foreground">RF</span>
                <div><h3 className="display text-2xl">Ray F.</h3><p className="text-sm text-muted-foreground">Clinician · sports medicine physician</p></div>
              </div>
              <p className="text-sm leading-6">Ray sees many patients, each at a different point in recovery. Symptoms come and go between visits, so he needs to know who to check in with, and when.</p>
              <ol className="space-y-2 text-sm leading-6">
                <li className="flex gap-3"><strong className="text-primary">1</strong>Sees each patient's intake summary and roadmap stage</li>
                <li className="flex gap-3"><strong className="text-primary">2</strong>Spots patterns, like sleep slipping, before the next visit</li>
                <li className="flex gap-3"><strong className="text-primary">3</strong>Reads the journal and replies to Maya</li>
              </ol>
              <Button asChild variant="outline" className="mt-auto min-h-12 w-fit rounded-full px-6"><Link href="/demo/intake?persona=ray">Follow his journey <ArrowRight aria-hidden="true" /></Link></Button>
            </Card>
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-5 rounded-xl bg-foreground p-6 text-background sm:p-8">
          <div className="space-y-2"><h2 className="display text-3xl font-normal">Ready to start your own?</h2><p className="text-sm leading-6 text-background/80">Your journal is private unless you invite a clinician.</p></div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="secondary" className="min-h-12 rounded-full px-6"><Link href="/sign-up">Sign up</Link></Button>
            <Button asChild variant="outline" className="min-h-12 rounded-full border-background/40 px-6 text-background"><Link href="/clinicians/">I'm a clinician</Link></Button>
          </div>
        </section>
        <p className="text-sm leading-6 text-muted-foreground">Stillwell is not a diagnosis tool. It can't diagnose or treat a concussion; please see a medical provider for that. Not for a new head injury or an emergency.</p>
      </main>
    </div>
  );
}
