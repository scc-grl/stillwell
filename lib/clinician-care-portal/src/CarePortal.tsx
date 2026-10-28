import { useEffect, useRef, useState } from 'react';
import { ProofOfConceptBanner } from './ProofOfConceptBanner';
import { Link, useLocation } from 'wouter';
import { useAuth, useClerk, useUser } from '@clerk/react';
import { useQueryClient } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import {
  getGetAccountTypeQueryKey,
  getGetClinicianProfileQueryKey,
  useGetAccountType,
  useGetClinicianProfile,
} from '@workspace/api-client-react';
import markUrl from '@workspace/stillwell-design-system/brand/stillwell-mark.svg';
import { Button } from '@workspace/stillwell-design-system/components/ui/button';
import { Card } from '@workspace/stillwell-design-system/components/ui/card';
import { Skeleton } from '@workspace/stillwell-design-system/components/ui/skeleton';
import { AcceptedInviteToast, spendAcceptedReceipt } from './AcceptedInviteToast';
import { removeCare, useCarePatients, useCareRequests, useFullJournal } from './queries';
import { ToastProvider } from './toast';
import { Sidebar } from './Sidebar';
import { InviteDialog } from './InviteDialog';
import { JournalError, JournalSkeleton, PatientJournal } from './PatientJournal';
import { DayView } from './DayView';
import { isCalendarDay } from './format';

/** Private clinical pages are never indexed and never carry patient metadata. */
function usePrivatePage() {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
}

/** Follows the OS colour scheme live; .dark is scoped to the portal root only. */
function useOsDark(): boolean {
  const [dark, setDark] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => setDark(event.matches);
    setDark(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  // Radix dialogs/menus portal to <body>, outside the portal root, so the
  // document carries .dark only while this portal is mounted and the OS is dark.
  // The previous state is restored on exit; patient pages are unaffected.
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains('dark');
    root.classList.toggle('dark', dark || hadDark);
    return () => { root.classList.toggle('dark', hadDark); };
  }, [dark]);
  return dark;
}

function Header({ name }: { name: string }) {
  const { signOut } = useClerk();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');

  async function onSignOut() {
    setError('');
    removeCare(queryClient);
    queryClient.clear();
    spendAcceptedReceipt();
    try {
      await signOut({ redirectUrl: '/clinicians' });
    } catch {
      setError('You couldn’t be signed out. Try again.');
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-3 md:px-6">
        <Link href="/clinician/portal" className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full font-serif text-xl font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Stillwell clinician portal" data-testid="link-portal-home">
          <img src={markUrl} alt="" className="size-9" width="36" height="36" />
          <span>stillwell</span>
        </Link>
        <div className="flex min-w-0 items-center gap-1 sm:gap-2">
          <a href="/clinicians/profile" title={name} className="inline-flex min-h-11 min-w-0 max-w-32 items-center rounded-full px-2 text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-xs sm:px-3" data-testid="link-clinician-profile"><span className="truncate">{name}</span></a>
          <Button variant="ghost" onClick={() => void onSignOut()} data-testid="button-sign-out">Sign out</Button>
        </div>
      </div>
      {error ? <p role="alert" className="mx-auto max-w-7xl px-4 pb-3 text-sm text-destructive md:px-6">{error}</p> : null}
      <ProofOfConceptBanner />
    </header>
  );
}

function PortalSkeleton() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:flex-row md:px-6" aria-label="Loading your patients" data-testid="status-portal-loading">
      <Skeleton className="h-80 w-full rounded-2xl md:w-72 md:shrink-0" />
      <div className="flex-1"><JournalSkeleton /></div>
    </div>
  );
}

function EmptyState({ onInvite }: { onInvite: () => void }) {
  return (
    <Card className="flex flex-col items-center gap-4 px-6 py-14 text-center shadow-none" data-testid="status-no-patients">
      <span className="grid size-14 place-items-center rounded-full bg-secondary text-secondary-foreground"><Users className="size-6" aria-hidden="true" /></span>
      <h1 className="font-serif text-3xl font-medium text-foreground">No patients yet</h1>
      <p className="max-w-md leading-7 text-muted-foreground">
        When a patient shares their journal with you, they’ll appear here. You can also invite a patient you already see; nothing is shared until they agree.
      </p>
      <Button variant="outline" onClick={onInvite} data-testid="button-empty-invite">Invite a patient</Button>
    </Card>
  );
}

function Detail({ patientId, date, onRemoved }: { patientId: string; date?: string; onRemoved: () => void }) {
  const journal = useFullJournal(patientId);
  if (journal.isLoading) return <JournalSkeleton />;
  if (journal.isError || !journal.data) return <JournalError onRetry={() => void journal.refetch()} />;
  if (date !== undefined) {
    if (!isCalendarDay(date)) {
      return <Card className="p-6 shadow-none"><p className="text-foreground">This day isn’t available.</p></Card>;
    }
    return <DayView data={journal.data} date={date} />;
  }
  return <PatientJournal data={journal.data} onRemoved={onRemoved} />;
}

function Portal({ patientId, date, name }: { patientId?: string; date?: string; name: string }) {
  const [, setLocation] = useLocation();
  const patients = useCarePatients();
  const requests = useCareRequests();
  const [inviting, setInviting] = useState(false);
  const requestsRef = useRef<HTMLElement>(null);

  if (patients.isLoading || requests.isLoading) return <PortalSkeleton />;
  if (patients.isError || requests.isError || !patients.data || !requests.data) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <JournalError onRetry={() => { void patients.refetch(); void requests.refetch(); }} />
      </div>
    );
  }

  const { active, former } = patients.data;
  const pending = requests.data.items.filter((item) => item.status === 'pending');
  const owned = patientId ? [...active, ...former].some((patient) => patient.id === patientId) : false;
  const empty = !active.length && !former.length;

  const onRemoved = () => {
    const next = [...active, ...former].find((patient) => patient.id !== patientId);
    setLocation(next ? `/clinician/patients/${next.id}` : '/clinician/portal', { replace: true });
  };

  let main;
  if (patientId && owned) main = <Detail key={patientId} patientId={patientId} date={date} onRemoved={onRemoved} />;
  else if (patientId) {
    main = (
      <Card className="space-y-4 p-6 shadow-none" data-testid="status-not-in-list">
        <p className="text-foreground">This journal isn’t in your list.</p>
        <Button asChild variant="outline"><Link href="/clinician/portal">Back to your patients</Link></Button>
      </Card>
    );
  } else if (empty) main = <EmptyState onInvite={() => setInviting(true)} />;
  else {
    main = (
      <Card className="p-6 shadow-none" data-testid="status-choose-patient">
        <h1 className="font-serif text-2xl font-medium text-foreground">Your patients</h1>
        <p className="mt-2 text-muted-foreground">Choose a patient to read their journal.</p>
      </Card>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:flex-row md:items-start md:px-6">
      <aside className="w-full md:w-72 md:shrink-0" aria-label={`Patients of ${name}`}>
        <Sidebar active={active} former={former} requests={pending} selectedId={patientId ?? null}
          onInvite={() => setInviting(true)} requestsRef={requestsRef} />
      </aside>
      <main className="w-full min-w-0 flex-1">{main}</main>
      <InviteDialog open={inviting} onOpenChange={setInviting} requests={pending}
        onSeeRequests={() => window.setTimeout(() => requestsRef.current?.focus(), 0)} />
    </div>
  );
}

/**
 * Canonical clinician care portal at /clinician/portal and
 * /clinician/patients/:id(/days/:date), rendered inside the website router,
 * Clerk session and query client. :id is the clinician's own care-link id.
 */
export default function CarePortal({ patientId, date }: { patientId?: string; date?: string }) {
  usePrivatePage();
  const dark = useOsDark();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const account = useGetAccountType({ query: { queryKey: getGetAccountTypeQueryKey(), enabled: isLoaded && Boolean(isSignedIn), retry: false } });
  const clinician = account.data?.accountType === 'clinician';
  const profile = useGetClinicianProfile({ query: { queryKey: getGetClinicianProfileQueryKey(), enabled: clinician, retry: false } });

  useEffect(() => {
    if (isLoaded && !isSignedIn) window.location.assign('/clinicians/sign-in');
    if (account.data?.accountType === 'patient') window.location.assign('/dashboard');
  }, [isLoaded, isSignedIn, account.data?.accountType]);

  const name = profile.data?.profile?.displayName || user?.fullName || 'Your account';

  let body;
  if (!isLoaded || !isSignedIn || account.isLoading || (account.data && !clinician)) body = <PortalSkeleton />;
  else if (account.isError || !account.data) {
    body = <div className="mx-auto max-w-xl px-4 py-10"><JournalError onRetry={() => void account.refetch()} /></div>;
  } else body = <Portal patientId={patientId} date={date} name={name} />;

  return (
    <ToastProvider>
      <div className={`${dark ? 'dark ' : ''}min-h-[100dvh] overflow-x-hidden bg-background text-foreground`} style={{ colorScheme: dark ? 'dark' : 'light' }} data-testid="care-portal-root">
        {clinician ? <Header name={name} /> : null}
        {body}
        {clinician ? <AcceptedInviteToast /> : null}
      </div>
    </ToastProvider>
  );
}
