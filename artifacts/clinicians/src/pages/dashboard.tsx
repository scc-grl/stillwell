import { useEffect, useMemo } from 'react';
import { ArrowRight, BookOpen, Check, CircleUserRound, Edit3, Mail, ShieldCheck } from 'lucide-react';
import { useAuth, useUser } from '@clerk/react';
import { Link, useLocation } from 'wouter';
import { Button } from '@workspace/stillwell-design-system/components/ui/button';
import { Card, CardContent } from '@workspace/stillwell-design-system/components/ui/card';
import { useAccountType, useClinicianProfile } from '@/hooks/use-clinician-account';
import { sendPatientToDashboard } from '@/lib/config';
import { Footer, PortalHeader } from '@/components/portal-shell';
import { useOwnCarePatients } from '@/components/accepted-invite-toast';

export default function DashboardPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user, isLoaded: isUserLoaded } = useUser();
  const [, setLocation] = useLocation();
  const account = useAccountType(isLoaded && Boolean(isSignedIn));
  const clinician = isSignedIn && account.data?.accountType === 'clinician';
  const profile = useClinicianProfile(Boolean(clinician));
  const carePatients = useOwnCarePatients(Boolean(clinician));
  const connectedCount = carePatients.data?.active.length ?? 0;

  useEffect(() => {
    if (isLoaded && !isSignedIn) setLocation('/sign-in');
    if (account.data?.accountType === 'patient') sendPatientToDashboard();
    // The care portal now lives at the canonical website URL.
    if (account.data?.accountType === 'clinician') window.location.replace('/clinician/portal');
  }, [isLoaded, isSignedIn, account.data?.accountType, setLocation]);

  const savedProfile = profile.data?.profile;
  const completion = useMemo(() => {
    if (!savedProfile) return 0;
    return [
      Boolean(savedProfile.firstName && savedProfile.lastName),
      Boolean(savedProfile.profession),
      Boolean(savedProfile.licenseNumber || savedProfile.licenseRegion),
      Boolean(savedProfile.practiceType === 'individual' || savedProfile.practiceName),
      Boolean(savedProfile.location),
      Boolean(savedProfile.areas?.length),
    ].filter(Boolean).length;
  }, [savedProfile]);

  if (!isLoaded || (isSignedIn && (account.isLoading || account.data?.accountType === 'clinician'))) {
    return (
      <main className="min-h-[100dvh] animate-pulse space-y-5 bg-background px-6 py-12" aria-label="Loading clinician dashboard" data-testid="status-dashboard-loading">
        <div className="mx-auto h-10 max-w-7xl rounded-full bg-secondary" />
        <div className="mx-auto h-44 max-w-7xl rounded-3xl bg-secondary" />
        <div className="mx-auto h-60 max-w-7xl rounded-3xl bg-secondary" />
      </main>
    );
  }
  if (!isSignedIn) return null;
  if (account.isError || profile.isError) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-background p-6">
        <div className="max-w-md text-center">
          <p role="alert" className="text-destructive" data-testid="status-dashboard-error">We couldn’t load your account details.</p>
          <Button className="mt-4" onClick={() => { void account.refetch(); void profile.refetch(); }} data-testid="button-dashboard-retry">
            Try again
          </Button>
        </div>
      </main>
    );
  }
  if (account.data?.accountType !== 'clinician') return null;

  const email = user?.primaryEmailAddress?.emailAddress ?? 'Email unavailable';
  const progress = Math.round((completion / 6) * 100);

  return (
    <div className="min-h-[100dvh] bg-background">
      <PortalHeader dashboard />
      <main className="mx-auto max-w-7xl px-6 py-10 md:py-14">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-secondary-foreground">Step 4 of 4 · Your clinician home</p>
            <h1 className="mt-3 font-serif text-4xl leading-tight text-foreground md:text-5xl">
              {savedProfile?.firstName ? `Welcome, ${savedProfile.firstName}.` : 'Welcome to your Stillwell account.'}
            </h1>
            <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
              Your professional space is ready. Patients can choose to share
              their journal with you, read-only.
            </p>
          </div>
          <Button asChild variant="outline" data-testid="button-dashboard-edit-profile">
            <Link href="/profile">
              <Edit3 aria-hidden="true" /> {savedProfile ? 'Edit profile' : 'Complete profile'}
            </Link>
          </Button>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-border shadow-none">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <p className="text-sm font-semibold text-secondary-foreground">Profile progress</p>
                  <h2 className="mt-2 font-serif text-3xl text-foreground">{completion} of 6 details</h2>
                </div>
                <span className="rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground" data-testid="text-profile-completion-percent">
                  {progress}% complete
                </span>
              </div>
              <div
                className="mt-5 h-2 overflow-hidden rounded-full bg-secondary"
                role="progressbar"
                aria-label="Profile completion"
                aria-valuemin={0}
                aria-valuemax={6}
                aria-valuenow={completion}
                data-testid="progress-profile-completion"
              >
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  ['Name', Boolean(savedProfile?.firstName && savedProfile?.lastName)],
                  ['Profession', Boolean(savedProfile?.profession)],
                  ['Licence details', Boolean(savedProfile?.licenseNumber || savedProfile?.licenseRegion)],
                  ['Practice type', Boolean(savedProfile?.practiceType)],
                  ['Location', Boolean(savedProfile?.location)],
                  ['Areas of work', Boolean(savedProfile?.areas?.length)],
                ].map(([label, complete], index) => (
                  <div key={label as string} className="flex min-h-11 items-center gap-3 text-sm" data-testid={`status-profile-item-${index}`}>
                    <span className={`grid h-6 w-6 place-items-center rounded-full ${complete ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground'}`}>
                      {complete ? <Check size={14} aria-hidden="true" /> : <span className="text-xs">{index + 1}</span>}
                    </span>
                    <span className={complete ? 'font-medium text-foreground' : 'text-muted-foreground'}>{label as string}</span>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-xs leading-5 text-muted-foreground">
                Licence information is informational only and has not been verified.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-none">
            <CardContent className="p-6 md:p-8">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-secondary-foreground"><CircleUserRound size={20} aria-hidden="true" /></span>
                <div>
                  <p className="text-sm font-semibold text-secondary-foreground">Your account</p>
                  <h2 className="font-serif text-2xl text-foreground">Private by design</h2>
                </div>
              </div>
              <div className="mt-6 flex items-start gap-3 rounded-2xl bg-secondary/60 p-4">
                <Mail size={18} className="mt-0.5 shrink-0 text-secondary-foreground" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account email</p>
                  <p className="mt-1 break-all text-sm font-medium text-foreground" data-testid="text-account-email">
                    {isUserLoaded ? email : 'Loading email…'}
                  </p>
                </div>
              </div>
              <p className="mt-5 text-sm leading-6 text-muted-foreground">
                Your professional details are visible only in your account.
                Listing and new-patient preferences are private and do not
                create a public profile.
              </p>
              <Link href="/profile" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline" data-testid="link-dashboard-profile">
                Review your profile <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-5 border-border bg-card shadow-none">
          <CardContent className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between md:p-8">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground"><BookOpen size={21} aria-hidden="true" /></span>
              <div>
                {connectedCount > 0 ? (
                  <>
                    <h2 className="font-serif text-2xl text-foreground" data-testid="text-connected-journals">
                      {connectedCount === 1 ? '1 patient journal is connected' : `${connectedCount} patient journals are connected`}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                      Your connection is saved. A journal viewer is coming in the next
                      phase; this portal doesn’t display patient entries yet.
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="font-serif text-2xl text-foreground">No patient journals are connected</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                      When a patient shares their journal with you, the connection
                      will appear here. This portal doesn’t display patient entries yet.
                    </p>
                  </>
                )}
              </div>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted-foreground">
              <ShieldCheck size={16} aria-hidden="true" /> Private workspace
            </span>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
