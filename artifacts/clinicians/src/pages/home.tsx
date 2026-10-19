import { useEffect } from 'react';
import { ArrowDown, ArrowRight, Check, Clock3, LockKeyhole, MoveUpRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '@clerk/react';
import { Link, useLocation } from 'wouter';
import { Button } from '@workspace/stillwell-design-system/components/ui/button';
import { Card, CardContent } from '@workspace/stillwell-design-system/components/ui/card';
import { useAccountType } from '@/hooks/use-clinician-account';
import { sendPatientToDashboard } from '@/lib/config';
import { Footer, PortalHeader } from '@/components/portal-shell';

const steps = [
  ['01', 'Choose your role', 'Tell us whether you practise independently or as a clinic.'],
  ['02', 'Create your account', 'Sign up with your email and verify your address.'],
  ['03', 'Add your practice', 'Save professional details and the areas you support.'],
  ['04', 'Review any time', 'Return whenever you want to update your private profile.'],
];

const planned = [
  ['A patient invites you', 'Patient invitations and in-app journal sharing are planned, but not active yet.'],
  ['You’re matched with patients', 'A future directory may help people find clinicians by location and areas of support. Matching is not active today.'],
];

function Eyebrow({ children, light = false }: { children: string; light?: boolean }) {
  return (
    <p className={`flex items-center gap-2 text-sm font-semibold uppercase tracking-widest ${light ? 'text-primary-foreground/75' : 'text-secondary-foreground'}`}>
      <span className={`h-px w-6 ${light ? 'bg-primary-foreground/75' : 'bg-primary'}`} aria-hidden="true" />
      {children}
    </p>
  );
}

function TrendIllustration() {
  return (
    <Card className="overflow-hidden border-border bg-card shadow-none">
      <CardContent className="p-0">
        <div className="flex items-start justify-between gap-4 px-6 pt-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              A future view
            </p>
            <h2 className="mt-2 font-serif text-xl text-foreground">
              Seven-day symptom trend
            </h2>
          </div>
          <span className="rounded-full bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground">
            Illustration only
          </span>
        </div>
        <div className="mx-6 mt-5 rounded-2xl border border-border bg-background p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Symptom intensity</span>
            <span>Example layout · no patient data</span>
          </div>
          <svg
            viewBox="0 0 420 150"
            role="img"
            aria-label="Illustration of seven bars showing an example symptom trend across a week. This is not patient data."
            className="mt-4 h-36 w-full"
            preserveAspectRatio="none"
            data-testid="illustration-symptom-trend"
          >
            {[38, 68, 98, 128].map((y) => (
              <line key={y} x1="12" y1={y} x2="408" y2={y} stroke="hsl(var(--border))" strokeWidth="1" />
            ))}
            {[7, 6, 6.5, 4.5, 5, 3.5, 3].map((value, index) => {
              const height = value * 11;
              return (
                <rect
                  key={index}
                  x={22 + index * 56}
                  y={128 - height}
                  width="30"
                  height={height}
                  rx="6"
                  fill="hsl(var(--chart-1))"
                />
              );
            })}
          </svg>
          <div className="grid grid-cols-7 text-center text-xs text-muted-foreground">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
        </div>
        <div className="mx-6 mb-6 mt-4 flex gap-3 rounded-2xl bg-secondary p-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-card text-secondary-foreground">
            <LockKeyhole aria-hidden="true" size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">A note for a visit</p>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              “What I’d like to remember to talk about…”
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
  const { isLoaded, isSignedIn } = useAuth();
  const accountType = useAccountType(isLoaded && Boolean(isSignedIn));
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !accountType.data) return;
    if (accountType.data.accountType === 'patient') {
      sendPatientToDashboard();
    } else {
      setLocation('/dashboard');
    }
  }, [isLoaded, isSignedIn, accountType.data, setLocation]);

  if (!isLoaded || (isSignedIn && (accountType.isLoading || (!accountType.data && !accountType.isError)))) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-background p-6">
        <p className="text-sm text-muted-foreground" role="status" data-testid="status-home-loading">
          Preparing your Stillwell account…
        </p>
      </main>
    );
  }
  if (isSignedIn) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-background p-6">
        <div className="text-center">
          <p role="alert" className="text-sm text-destructive" data-testid="status-account-type-error">
            We couldn’t check your account type. Please try again.
          </p>
          <Button className="mt-4" onClick={() => accountType.refetch()} data-testid="button-retry-account-type">
            Try again
          </Button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <PortalHeader />

      <main>
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-20 pt-12 md:grid-cols-2 md:gap-16 md:pb-28 md:pt-20">
          <div>
            <div className="mb-5">
              <Eyebrow>For clinicians, programs & researchers</Eyebrow>
            </div>
            <h1 className="max-w-3xl font-serif text-5xl font-medium leading-tight tracking-tight text-foreground md:text-6xl">
              Grow your practice, support your athletes, advance the research.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
              Stillwell is a private recovery journal for concussion and
              post-concussive symptoms. Clinician accounts are for private
              professional profiles; patient journal sharing and matching are
              planned, not active.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="default" className="w-full sm:w-auto" data-testid="button-hero-create-account">
                <Link href="/join">Create a clinician account <ArrowRight aria-hidden="true" /></Link>
              </Button>
              <Button asChild variant="outline" size="default" className="w-full sm:w-auto" data-testid="button-hero-sign-in">
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </div>
            <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck size={17} aria-hidden="true" />
              A private professional account. No patient journals are connected.
            </p>
          </div>
          <TrendIllustration />
        </section>

        <section className="bg-secondary/60 py-20 md:py-24" aria-labelledby="planned-connect-title">
          <div className="mx-auto max-w-7xl px-6">
            <div className="max-w-2xl">
              <Eyebrow>Planned</Eyebrow>
              <h2 id="planned-connect-title" className="mt-3 font-serif text-4xl leading-tight text-foreground">
                Two ways to connect.
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                We’re shaping these possibilities thoughtfully. Neither is
                available in the portal today.
              </p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {planned.map(([title, body]) => (
                <Card key={title} className="border-border shadow-none">
                  <CardContent className="flex gap-4 p-6 md:p-8">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground">
                      {title === 'A patient invites you' ? <LockKeyhole aria-hidden="true" /> : <MoveUpRight aria-hidden="true" />}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-serif text-2xl text-foreground">{title}</h3>
                        <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">Planned</span>
                      </div>
                      <p className="mt-3 leading-7 text-muted-foreground">{body}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20 md:py-24" aria-labelledby="steps-title">
          <div className="grid gap-12 md:grid-cols-[0.8fr_1.2fr]">
            <div>
              <Eyebrow>Getting set up</Eyebrow>
              <h2 id="steps-title" className="mt-3 font-serif text-4xl leading-tight text-foreground">Four short steps to your clinician account.</h2>
              <p className="mt-4 leading-7 text-muted-foreground">Create your account at your own pace. You can come back to your profile later.</p>
              <Link href="/join" className="mt-6 inline-flex min-h-11 items-center gap-2 font-semibold text-primary underline-offset-4 hover:underline" data-testid="link-steps-join">
                Get started <ArrowDown size={16} aria-hidden="true" />
              </Link>
            </div>
            <ol className="grid gap-4 sm:grid-cols-2">
              {steps.map(([number, title, description]) => (
                <li key={number}>
                  <Card className="h-full border-border shadow-none">
                    <CardContent className="p-6">
                      <span className="text-sm font-semibold tracking-widest text-secondary-foreground">{number}</span>
                      <h3 className="mt-4 font-serif text-xl text-foreground">{title}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="bg-card py-20 md:py-24" aria-labelledby="today-title">
          <div className="mx-auto max-w-7xl px-6">
            <div className="max-w-2xl">
              <Eyebrow>Clear about today</Eyebrow>
              <h2 id="today-title" className="mt-3 font-serif text-4xl leading-tight text-foreground">What your account does today — and what’s still planned.</h2>
            </div>
            <div className="mt-9 grid gap-5 md:grid-cols-2">
              <Card className="border-border bg-secondary/60 shadow-none">
                <CardContent className="p-6 md:p-8">
                  <h3 className="flex items-center gap-3 font-serif text-2xl text-foreground"><Check size={22} aria-hidden="true" /> Available today</h3>
                  <ul className="mt-5 space-y-4 text-sm leading-6 text-muted-foreground">
                    <li className="flex gap-3"><Check size={17} className="mt-1 shrink-0 text-primary" aria-hidden="true" /> Create a secure clinician account and private professional profile.</li>
                    <li className="flex gap-3"><Check size={17} className="mt-1 shrink-0 text-primary" aria-hidden="true" /> Review and update your profile details at any time.</li>
                    <li className="flex gap-3"><Check size={17} className="mt-1 shrink-0 text-primary" aria-hidden="true" /> See clearly that no patient journals are connected.</li>
                  </ul>
                </CardContent>
              </Card>
              <Card className="border-border shadow-none">
                <CardContent className="p-6 md:p-8">
                  <h3 className="flex items-center gap-3 font-serif text-2xl text-foreground"><Clock3 size={22} aria-hidden="true" /> Still planned</h3>
                  <ul className="mt-5 space-y-4 text-sm leading-6 text-muted-foreground">
                    <li className="flex gap-3"><Clock3 size={17} className="mt-1 shrink-0" aria-hidden="true" /> Patient journal sharing and clinician connections.</li>
                    <li className="flex gap-3"><Clock3 size={17} className="mt-1 shrink-0" aria-hidden="true" /> Public profile directory, invitations, and notifications.</li>
                    <li className="flex gap-3"><Clock3 size={17} className="mt-1 shrink-0" aria-hidden="true" /> Licence verification, research tools, and programme partnerships.</li>
                  </ul>
                  <p className="mt-5 border-t border-border pt-4 text-sm leading-6 text-muted-foreground">
                    These features are not active. Your profile preferences do
                    not publish your information.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20 md:py-24" aria-labelledby="work-title">
          <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr]">
            <div>
              <Eyebrow>Who it’s for</Eyebrow>
              <h2 id="work-title" className="mt-3 font-serif text-4xl text-foreground">Three ways to work with Stillwell.</h2>
            </div>
            <div className="space-y-3">
              {[
                ['Clinicians & practices', 'Create a clinician account today.', 'Available'],
                ['Athletic & university programs', 'A future way to learn about working together.', 'Coming later'],
                ['University research teams', 'Responsible research participation is being explored.', 'Coming later'],
              ].map(([title, description, status]) => (
                <Card key={title} className="border-border shadow-none">
                  <CardContent className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{title}</h3>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
                    </div>
                    <span className="w-fit rounded-full bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground">{status}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-20 md:pb-24" aria-labelledby="community-title">
          <div className="rounded-3xl bg-primary px-7 py-10 text-primary-foreground md:px-12 md:py-14">
              <Eyebrow light>A community of professionals</Eyebrow>
            <div className="mt-4 grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <h2 id="community-title" className="max-w-2xl font-serif text-4xl leading-tight">People should be able to build a recovery team that fits them.</h2>
                <p className="mt-4 max-w-2xl leading-7 text-primary-foreground/80">A person’s support may include different professionals over time. Stillwell is a private journal today; in-app clinician connections and shared support are planned, not active.</p>
              </div>
              <Button asChild variant="secondary" size="default" data-testid="button-community-join">
                <Link href="/join">Create an account <ArrowRight aria-hidden="true" /></Link>
              </Button>
            </div>
          </div>
          <p className="mt-5 text-xs leading-5 text-muted-foreground">
            Profile details are private in the portal. Licence information is
            informational and is not verified. Listing and availability
            preferences do not create a public directory listing.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
