import { useEffect, useRef } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '@clerk/react';
import { useLocation } from 'wouter';
import { Button } from '@workspace/stillwell-design-system/components/ui/button';
import { Card, CardContent } from '@workspace/stillwell-design-system/components/ui/card';
import { useAccountType, useClinicianProfile, useCompleteRegistration } from '@/hooks/use-clinician-account';
import { sendPatientToDashboard } from '@/lib/config';
import { Brand } from '@/components/portal-shell';
import { pendingInviteReturnPath } from '@/lib/care-link';

/** A pending patient invite wins over the normal next step. */
function returnToInvite(): boolean {
  const path = pendingInviteReturnPath();
  if (!path) return false;
  window.location.assign(path);
  return true;
}

export default function ContinuePage() {
  const { isLoaded, isSignedIn } = useAuth();
  const [, setLocation] = useLocation();
  const account = useAccountType(isLoaded && Boolean(isSignedIn));
  const token = window.sessionStorage.getItem('stillwell.registrationToken');
  const profile = useClinicianProfile(Boolean(isSignedIn && !token && account.data?.accountType === 'clinician'));
  const complete = useCompleteRegistration();
  const mutateRef = useRef(complete.mutate);
  const routed = useRef(false);
  mutateRef.current = complete.mutate;

  useEffect(() => {
    if (isLoaded && !isSignedIn) setLocation('/sign-in');
  }, [isLoaded, isSignedIn, setLocation]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !token || routed.current) return;
    routed.current = true;
    mutateRef.current(
      { data: { registrationToken: token } },
      {
        onSuccess: (result) => {
          if (returnToInvite()) return;
          if (result.accountType === 'patient') sendPatientToDashboard();
          else setLocation('/profile');
        },
        onError: () => {
          routed.current = false;
        },
      },
    );
  }, [isLoaded, isSignedIn, token, setLocation]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || token || !account.data || routed.current) return;
    if (pendingInviteReturnPath()) {
      routed.current = true;
      returnToInvite();
      return;
    }
    if (account.data.accountType === 'patient') {
      routed.current = true;
      sendPatientToDashboard();
      return;
    }
    if (!profile.isLoading && profile.data) {
      routed.current = true;
      setLocation(profile.data.profile ? '/dashboard' : '/profile');
    }
  }, [isLoaded, isSignedIn, token, account.data, profile.data, profile.isLoading, setLocation]);

  const retry = () => {
    routed.current = false;
    if (token) {
      mutateRef.current(
        { data: { registrationToken: token } },
        {
          onSuccess: (result) => {
            if (returnToInvite()) return;
            if (result.accountType === 'patient') sendPatientToDashboard();
            else setLocation('/profile');
          },
        },
      );
    } else {
      void account.refetch();
      void profile.refetch();
    }
  };

  const failed = account.isError || profile.isError || complete.isError;

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-background px-6 py-12">
      <div className="w-full max-w-xl">
        <div className="mb-8 flex justify-center"><Brand /></div>
        <Card className="border-border shadow-none">
          <CardContent className="p-7 text-center md:p-10">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-secondary text-secondary-foreground">
              <ShieldCheck size={24} aria-hidden="true" />
            </div>
            <h1 className="mt-5 font-serif text-3xl text-foreground">Setting up your Stillwell account</h1>
            <p className="mt-3 leading-7 text-muted-foreground">
              We’re confirming your account type and preparing the right next
              step. Your account remains private.
            </p>
            {failed ? (
              <>
                <p role="alert" className="mt-5 text-sm text-destructive" data-testid="status-account-continue-error">
                  We couldn’t complete setup. Please try again.
                </p>
                <Button className="mt-5" onClick={retry} data-testid="button-account-continue-retry">
                  Try again <ArrowRight aria-hidden="true" />
                </Button>
              </>
            ) : (
              <p role="status" className="mt-6 text-sm font-semibold text-secondary-foreground" data-testid="status-account-continue-loading">
                Confirming your account…
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
