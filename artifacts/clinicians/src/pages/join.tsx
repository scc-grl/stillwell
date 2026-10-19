import { useState } from 'react';
import { ArrowLeft, ArrowRight, Building2, UserRound } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { Button } from '@workspace/stillwell-design-system/components/ui/button';
import { Card, CardContent } from '@workspace/stillwell-design-system/components/ui/card';
import { useRegistrationIntent } from '@/hooks/use-clinician-account';
import { Footer, PortalHeader } from '@/components/portal-shell';

type PracticeType = 'individual' | 'clinic';

export default function JoinPage() {
  const [practiceType, setPracticeType] = useState<PracticeType>('individual');
  const [, setLocation] = useLocation();
  const intent = useRegistrationIntent();

  const continueToSignUp = () => {
    intent.mutate(
      { data: { accountType: 'clinician' } },
      {
        onSuccess: ({ registrationToken }) => {
          window.sessionStorage.setItem('stillwell.registrationToken', registrationToken);
          window.sessionStorage.setItem('stillwell.practiceType', practiceType);
          setLocation('/sign-up');
        },
      },
    );
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <PortalHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 md:py-20">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-secondary-foreground hover:text-foreground" data-testid="link-join-back">
          <ArrowLeft size={16} aria-hidden="true" /> Back to Stillwell
        </Link>
        <div className="mx-auto mt-8 max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-secondary-foreground">Step 1 of 4 · Choose your account</p>
          <h1 className="mt-4 font-serif text-4xl leading-tight text-foreground md:text-5xl">How do you practise?</h1>
          <p className="mx-auto mt-4 max-w-xl leading-7 text-muted-foreground">
            We’ll tailor your private professional profile to your work. Both
            options create a clinician account.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-3xl gap-4 md:grid-cols-2">
          {([
            ['individual', 'Individual clinician', 'I practise independently or as a solo professional.', UserRound],
            ['clinic', 'Clinic or practice', 'I work as part of a clinic, group, or practice.', Building2],
          ] as const).map(([value, title, description, Icon]) => (
            <button
              key={value}
              type="button"
              aria-pressed={practiceType === value}
              onClick={() => setPracticeType(value)}
              className={`min-h-44 rounded-3xl border p-6 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                practiceType === value
                  ? 'border-primary bg-secondary'
                  : 'border-border bg-card hover:bg-secondary/50'
              }`}
              data-testid={`button-practice-${value}`}
            >
              <span className="grid h-11 w-11 place-items-center rounded-full bg-background text-secondary-foreground">
                <Icon size={20} aria-hidden="true" />
              </span>
              <span className="mt-5 block font-serif text-2xl text-foreground">{title}</span>
              <span className="mt-2 block text-sm leading-6 text-muted-foreground">{description}</span>
            </button>
          ))}
        </div>

        <Card className="mx-auto mt-6 max-w-3xl border-border shadow-none">
          <CardContent className="p-5 md:p-6">
            <p className="text-sm leading-6 text-muted-foreground">
              Patient invitations are not active. This setup is only for
              clinicians and practices.
            </p>
          </CardContent>
        </Card>

        {intent.isError && (
          <p role="alert" className="mx-auto mt-5 max-w-3xl text-sm text-destructive" data-testid="status-join-error">
            We couldn’t start your account setup. Please try again.
          </p>
        )}
        <div className="mx-auto mt-7 flex max-w-3xl flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button asChild variant="outline" data-testid="button-join-cancel">
            <Link href="/">Maybe later</Link>
          </Button>
          <Button
            onClick={continueToSignUp}
            disabled={intent.isPending}
            data-testid="button-join-continue"
          >
            {intent.isPending ? 'Preparing your account…' : 'Continue to sign up'}
            {!intent.isPending && <ArrowRight aria-hidden="true" />}
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
