import { useEffect, useRef, useState, type ReactNode } from "react";
import { ClerkProvider, SignIn, SignUp, useClerk, useUser } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Link, Redirect, Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import { getGetAccountTypeQueryKey, useCompleteAccountRegistration, useCreateAccountRegistrationIntent, useGetAccountType } from "@workspace/api-client-react";
import type { AccountType } from "@workspace/api-client-react";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import AccountTypeChoicePage from "@/components/AccountTypeChoicePage";
import AuthPageShell from "@/components/AuthPageShell";
import { MvpPatientPage, AccountDeletedPage } from "@/pages/MvpPatientPages";
import { MvpDoctorPortalPage, MvpDoctorPatientPage } from "@/pages/MvpDoctorPages";
import PrivacyPage from "@/pages/PrivacyPage";
import PatientIntakePage from "@/pages/PatientIntakePage";
import UnsubscribePage from "@/pages/UnsubscribePage";
import { clearClinicianSetupDraft } from "@/pages/PartnersPages";
import { PublicLayout } from "@/components/PublicSite";
import { WebsiteThemeProvider } from "@/components/WebsiteTheme";
import { clearDraft, readDraft } from "@/lib/recovery";
import { clearAccountChoice, clearRegistrationIntent, readRegistrationIntent, storeRegistrationIntent } from "@/lib/account";
import InviteRoute from "@/pages/InvitePage";
import { careMemory, pendingLink } from "@/lib/care-link";

const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
function stripBase(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}
if (!clerkPubKey) throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 15_000 } } });
const appearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  variables: {
    colorPrimary: "#345849",
    colorForeground: "#29463b",
    colorMutedForeground: "#718077",
    colorDanger: "#a64f43",
    colorBackground: "#fbfaf5",
    colorInput: "#fffefa",
    colorInputForeground: "#29463b",
    colorNeutral: "#dce3d8",
    fontFamily: "'Atkinson Hyperlegible Next', sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-card text-card-foreground rounded-xl w-[440px] max-w-full overflow-hidden border border-border",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-foreground font-semibold",
    headerSubtitle: "text-graphite",
    socialButtonsBlockButtonText: "text-foreground font-medium",
    formFieldLabel: "text-graphite font-medium",
    footerActionLink: "text-primary font-semibold",
    footerActionText: "text-graphite",
    dividerText: "text-graphite",
    identityPreviewEditButton: "text-primary",
    formFieldSuccessText: "text-primary",
    alertText: "text-notice-foreground",
    logoBox: "hidden",
    socialButtonsBlockButton: "rounded-xl border-border bg-field hover:bg-secondary",
    formButtonPrimary: "rounded-full bg-primary hover:bg-primary/90 text-primary-foreground",
    formFieldInput: "rounded-xl border-border bg-field text-foreground",
    footerAction: "border-t border-[#e5e9e0]",
    dividerLine: "bg-border",
    alert: "rounded-xl",
    otpCodeFieldInput: "border-border text-foreground",
    formFieldRow: "mb-4",
    main: "text-foreground",
  },
};

function Landing() {
  return (
    <PublicLayout>
      <main id="main" className="mx-auto grid min-h-[70dvh] max-w-5xl content-center gap-6 px-4 py-16 sm:px-8">
        <p className="eyebrow">A private concussion recovery notebook</p>
        <h1 className="display max-w-3xl text-5xl font-medium leading-tight sm:text-7xl">Recovery, one day at a time.</h1>
        <p className="max-w-2xl text-lg leading-8 text-muted-foreground">Keep a private daily record, follow your live six-stage roadmap, and invite a doctor to review your scores if you choose. Your written notes stay private.</p>
        <div className="flex flex-wrap items-center gap-4">
          <Button asChild className="min-h-12"><Link href="/sign-up/patient">Start your recovery <ArrowRight aria-hidden="true"/></Link></Button>
          <Link href="/sign-in" className="min-h-12 inline-flex items-center px-3 text-base font-semibold underline underline-offset-4">Sign in</Link>
        </div>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground">Stillwell offers general recovery information, not medical advice or emergency care.</p>
      </main>
    </PublicLayout>
  );
}

function HomeRedirect() {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return <div className="min-h-[100dvh] bg-[#f5f4ed] p-8"><div className="mx-auto h-8 max-w-4xl animate-pulse rounded-xl bg-[#e8ece3]"/></div>;
  return isSignedIn ? <Redirect to="/account/continue"/> : <Landing/>;
}

function RoleCheckStatus({ children }: { children: ReactNode }) {
  return <main className="stillwell flex min-h-[100dvh] items-center justify-center bg-background px-5 py-12 text-center">
    <div className="max-w-md">{children}</div>
  </main>;
}

function AccountTypeGate({
  required,
  children,
  allowSignedOut = false,
  signedOutTo = "/",
}: {
  required: AccountType;
  children: ReactNode;
  allowSignedOut?: boolean;
  signedOutTo?: string;
}) {
  const { isLoaded, isSignedIn } = useUser();
  const accountTypeQuery = useGetAccountType({ query: { queryKey: getGetAccountTypeQueryKey(), enabled: isLoaded && Boolean(isSignedIn) } });

  if (!isLoaded) return <RoleCheckStatus><div className="mx-auto h-8 w-40 animate-pulse rounded-xl bg-secondary"/></RoleCheckStatus>;
  if (!isSignedIn) return allowSignedOut ? children : <Redirect to={signedOutTo}/>;
  if (accountTypeQuery.isError) return <RoleCheckStatus>
    <p className="text-sm leading-6 text-muted-foreground">We couldn’t confirm your account type right now.</p>
    <Button className="mt-5" variant="outline" onClick={() => void accountTypeQuery.refetch()}>Try again</Button>
  </RoleCheckStatus>;
  if (accountTypeQuery.isPending || !accountTypeQuery.data) return <RoleCheckStatus><div className="mx-auto h-8 w-40 animate-pulse rounded-xl bg-secondary"/></RoleCheckStatus>;
  if (accountTypeQuery.data.accountType !== required) {
    return <Redirect to={accountTypeQuery.data.accountType === "clinician" ? "/clinician/portal" : "/dashboard"}/>;
  }
  return children;
}

function PrivateDashboard() {
  const [location] = useLocation();
  const { user } = useUser();
  const section = location === "/dashboard/journal" ? "journal"
    : location === "/dashboard/account" ? "account"
      : location === "/dashboard/invite-doctor" ? "invite" : "dashboard";
  return <AccountTypeGate required="patient"><MvpPatientPage key={user?.id ?? "signed-out"} section={section}/></AccountTypeGate>;
}

function PrivateDoctorPatient({ id }: { id: string }) {
  const { user } = useUser();
  return <AccountTypeGate required="clinician" signedOutTo="/sign-in"><MvpDoctorPatientPage key={`${user?.id ?? "signed-out"}:${id}`} id={id}/></AccountTypeGate>;
}

function AccountContinuation() {
  const { isLoaded, isSignedIn } = useUser();
  const [, setLocation] = useLocation();
  const [registrationToken, setRegistrationToken] = useState(readRegistrationIntent);
  const [retryVersion, setRetryVersion] = useState(0);
  const [registrationError, setRegistrationError] = useState(false);
  const registrationAttempted = useRef(false);
  const completion = useCompleteAccountRegistration();
  const accountTypeQuery = useGetAccountType({
    query: { queryKey: getGetAccountTypeQueryKey(), enabled: isLoaded && Boolean(isSignedIn) && !registrationToken },
  });

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLocation("/sign-in", { replace: true });
      return;
    }
    if (registrationToken) {
      if (registrationAttempted.current) return;
      registrationAttempted.current = true;
      completion.mutate({ data: { registrationToken } }, {
        onSuccess: ({ accountType }) => {
          clearRegistrationIntent();
          clearAccountChoice();
          setRegistrationToken(null);
          const linkPath = pendingLink.returnPath();
          if (linkPath && !(accountType === "patient" && readDraft())) { setLocation(linkPath, { replace: true }); return; }
          setLocation(accountType === "clinician" ? "/clinician/portal" : "/dashboard/intake", { replace: true });
        },
        onError: () => setRegistrationError(true),
      });
      return;
    }
    if (accountTypeQuery.data) {
      clearAccountChoice();
      // A pending care link wins, except a patient with a quiz draft finishes setup first.
      const linkPath = pendingLink.returnPath();
      const isPatient = accountTypeQuery.data.accountType === "patient";
      if (linkPath && !(isPatient && readDraft())) { setLocation(linkPath, { replace: true }); return; }
      setLocation(isPatient ? "/dashboard" : "/clinician/portal", { replace: true });
    }
  }, [isLoaded, isSignedIn, registrationToken, retryVersion, completion.mutate, accountTypeQuery.data, setLocation]);

  if (registrationError) return <RoleCheckStatus>
    <h1 className="display text-2xl text-foreground">We couldn’t finish account setup</h1>
    <p className="mt-3 text-sm leading-6 text-muted-foreground">Your account is safe. Please retry so we can confirm the account type you chose.</p>
    <Button className="mt-5" onClick={() => {
      registrationAttempted.current = false;
      setRegistrationError(false);
      setRetryVersion(value => value + 1);
    }}>Try again</Button>
  </RoleCheckStatus>;
  if (accountTypeQuery.isError && !registrationToken) return <RoleCheckStatus>
    <p className="text-sm leading-6 text-muted-foreground">We couldn’t confirm your account type right now.</p>
    <Button className="mt-5" variant="outline" onClick={() => void accountTypeQuery.refetch()}>Try again</Button>
  </RoleCheckStatus>;
  return <RoleCheckStatus><div className="mx-auto h-8 w-40 animate-pulse rounded-xl bg-secondary"/></RoleCheckStatus>;
}

function SignInPage() {
  const [prefillEmail] = useState(() => pendingLink.email("request"));
  return <AuthPageShell eyebrow="Your recovery, when you need it" title="A softer place to return to."
    description="Sign in to revisit your private Stillwell recovery notebook."
    crossLinkLabel="Are you a clinician? Sign in to the clinician portal" crossLinkHref="/clinicians/sign-in">
    <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`}
      forceRedirectUrl={`${basePath}/account/continue`} initialValues={prefillEmail ? { emailAddress: prefillEmail } : undefined}/>
  </AuthPageShell>;
}

function AccountCreationPage({ accountType, path }: { accountType: AccountType; path: string }) {
  const createIntent = useCreateAccountRegistrationIntent();
  const [attempt, setAttempt] = useState(0);
  const [ready, setReady] = useState(false);
  const [storageFailed, setStorageFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setReady(false);
    setStorageFailed(false);
    createIntent.mutate({ data: { accountType } }, {
      onSuccess: ({ registrationToken }) => {
        if (!active) return;
        if (!storeRegistrationIntent(registrationToken)) {
          setStorageFailed(true);
          return;
        }
        setReady(true);
      },
      onError: () => {
        if (active) setStorageFailed(true);
      },
    });
    return () => { active = false; };
  }, [accountType, attempt]);

  const isClinician = accountType === "clinician";
  const signInUrl = isClinician ? "/clinicians/sign-in" : `${basePath}/sign-in`;
  const signUpUrl = `${basePath}${path}`;
  const shellProps = isClinician ? {
    eyebrow: "Stillwell for clinicians",
    title: "A separate account for clinicians.",
    description: "Create a clinician account for the Stillwell portal. Clinician accounts are self-identified and not yet verified.",
    crossLinkLabel: "Already have a clinician account? Sign in",
    crossLinkHref: "/clinicians/sign-in",
  } : {
    eyebrow: "Begin with your own words",
    title: "Your recovery. Your record.",
    description: "Create a private patient account. Intake begins with consent, and you choose whether to share a story.",
    crossLinkLabel: "Already have an account? Sign in",
    crossLinkHref: "/sign-in",
  };

  return <AuthPageShell {...shellProps}>
    {ready ? <SignUp routing="path" path={signUpUrl} signInUrl={signInUrl}
      forceRedirectUrl={`${basePath}/account/continue`}/> : <div className="py-8 text-center">
      <p role={storageFailed ? "alert" : "status"} className="text-sm leading-6 text-muted-foreground">
        {storageFailed
          ? "We couldn’t prepare a secure account-type handoff. Please try again."
          : "Preparing your account setup…"}
      </p>
      {storageFailed && <Button className="mt-5" variant="outline" onClick={() => setAttempt(value => value + 1)}>Try again</Button>}
    </div>}
    {!isClinician && <div className="mt-4 text-center">
      <Link href="/" onClick={() => { clearDraft(); clearRegistrationIntent(); clearAccountChoice(); }}
        className="text-xs font-medium text-muted-foreground underline decoration-border underline-offset-4">
        Cancel setup and return home
      </Link>
    </div>}
  </AuthPageShell>;
}

function SignUpPage() {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return <RoleCheckStatus><div className="mx-auto h-8 w-40 animate-pulse rounded-xl bg-secondary"/></RoleCheckStatus>;
  if (isSignedIn) return <Redirect to="/account/continue"/>;
  if (readDraft()) return <AccountCreationPage accountType="patient" path="/sign-up"/>;
  return <AccountTypeChoicePage/>;
}

function PatientSignUpPage() {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return <RoleCheckStatus><div className="mx-auto h-8 w-40 animate-pulse rounded-xl bg-secondary"/></RoleCheckStatus>;
  if (isSignedIn) return <Redirect to="/account/continue"/>;
  return <AccountCreationPage accountType="patient" path="/sign-up/patient"/>;
}

function ClerkCacheInvalidator() {
  const { addListener } = useClerk();
  const cache = useQueryClient();
  const lastId = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    readDraft();
    return addListener(({ user }) => {
    const nextId = user?.id ?? null;
    if (lastId.current !== undefined && lastId.current !== nextId) {
      cache.clear();
      pendingLink.reconcile(lastId.current, nextId);
      careMemory.clearAll();
      const draft = readDraft();
      if (!(lastId.current === null && nextId && draft && !draft.ownerId)) clearDraft();
      const startingClinicianSignup = lastId.current === null && Boolean(nextId) && Boolean(readRegistrationIntent());
      if (!startingClinicianSignup) clearClinicianSetupDraft();
    }
    lastId.current = nextId;
    });
  }, [addListener, cache]);
  return null;
}
function Routes() {
  const [location, setLocation] = useLocation();
  const themeEnabled = !location.startsWith("/clinicians") && !location.startsWith("/invite/");
  useEffect(() => {
    const metadata: Record<string, { title: string; description: string }> = {
      "/sign-up/patient": { title: "Create a patient account", description: "Create a private Stillwell journal account for your own recovery notes and reflections." },
      "/sign-up": { title: "Choose your account", description: "Choose whether you are creating a Stillwell account as a patient or a clinician." },
      "/sign-in": { title: "Patient sign in", description: "Sign in to revisit your private Stillwell journal, routines, and reflections." },
      "/dashboard/journal": { title: "Your journal", description: "Record a private daily check-in and review the entries you chose to keep." },
      "/dashboard/account": { title: "Your account", description: "Manage your Stillwell account, privacy, and recovery-data controls." },
      "/dashboard/intake": { title: "Start your recovery", description: "Begin with consent, then share your story if you choose." },
      "/dashboard": { title: "Your dashboard", description: "Review your Stillwell journal progress, chosen routine, and care team." },
      "/dashboard/invite-doctor": { title: "Invite your doctor", description: "Share recovery scores and stage history with an invited doctor. Journal notes stay private." },
      "/account/continue": { title: "Setting up your Stillwell account", description: "Confirming your Stillwell account type." },
      "/contact": { title: "Contact Stillwell", description: "Contact information for Stillwell." },
      "/privacy": { title: "Privacy and data controls", description: "Review privacy information and data controls." },
    };
    if (location.startsWith("/invite/") || location === "/clinician/portal" || location.startsWith("/clinician/patients/")) { document.title = "Stillwell"; return; }
    const matchedMetadata = Object.entries(metadata).find(([path]) => location === path || location.startsWith(`${path}/`))?.[1];
    const page = matchedMetadata?.title ?? (location.startsWith("/sign-in") ? "Sign in" : location.startsWith("/sign-up") ? "Create account" : "Recovery at your pace");
    document.title = `${page} · Stillwell`;
    document.querySelector('meta[name="description"]')?.setAttribute("content",
      matchedMetadata?.description ?? "A private concussion recovery notebook. General information, not medical advice.");
  }, [location]);
  return <ClerkProvider telemetry={{ disabled: true }} publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={appearance} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} localization={{
    signIn: { start: { title: "Welcome back", subtitle: "Sign in to your Stillwell account" } },
    signUp: { start: { title: "Create your Stillwell account", subtitle: "A personal place for your Stillwell experience" } },
  }} routerPush={to => setLocation(stripBase(to))} routerReplace={to => setLocation(stripBase(to), { replace: true })}>
     <QueryClientProvider client={queryClient}><ClerkCacheInvalidator/>
        <WebsiteThemeProvider enabled={themeEnabled}>
       <Switch>
      <Route path="/" component={HomeRedirect}/>
      <Route path="/sign-in/*?" component={SignInPage}/>
      <Route path="/account/continue" component={AccountContinuation}/>
      <Route path="/sign-up/patient/*?" component={PatientSignUpPage}/>
      <Route path="/sign-up/*?" component={SignUpPage}/>
      <Route path="/clinician/portal"><AccountTypeGate required="clinician" signedOutTo="/sign-in"><MvpDoctorPortalPage/></AccountTypeGate></Route>
      <Route path="/clinician/patients/:id">{(params) => <PrivateDoctorPatient id={params.id}/>}</Route>
      <Route path="/dashboard/intake"><AccountTypeGate required="patient"><PatientIntakePage/></AccountTypeGate></Route>
      <Route path="/dashboard" component={PrivateDashboard}/>
      <Route path="/dashboard/journal" component={PrivateDashboard}/>
      <Route path="/dashboard/account" component={PrivateDashboard}/>
      <Route path="/dashboard/invite-doctor" component={PrivateDashboard}/>
      <Route path="/invite/:token">{(params) => <InviteRoute token={params.token}/>}</Route>
      <Route path="/privacy"><PublicLayout><PrivacyPage/></PublicLayout></Route>
      <Route path="/unsubscribe"><PublicLayout><UnsubscribePage/></PublicLayout></Route>
      <Route path="/contact"><PublicLayout><main id="main" className="mx-auto min-h-[60dvh] max-w-3xl space-y-4 px-4 py-16 sm:px-8"><p className="eyebrow">Contact</p><h1 className="display text-4xl">Stay in touch with Stillwell.</h1><p className="text-base leading-7 text-muted-foreground">A confirmed contact channel is not available yet. We will update this page when one is ready.</p></main></PublicLayout></Route>
      <Route path="/account-deleted" component={AccountDeletedPage}/>
      <Route path="/demo"><Redirect to="/"/></Route>
      <Route path="/demo/intake"><Redirect to="/"/></Route>
      <Route path="/quiz"><Redirect to="/"/></Route>
      <Route path="/partners"><Redirect to="/"/></Route>
      <Route path="/partners/join"><Redirect to="/"/></Route>
      <Route path="/partners/request"><Redirect to="/"/></Route>
      <Route path="/find-your-clinician"><Redirect to="/"/></Route>
      <Route path="/admin/partners"><Redirect to="/"/></Route>
      <Route path="/our-history"><Redirect to="/"/></Route>
      <Route path="/faqs"><Redirect to="/"/></Route>
      <Route path="/request/:token"><Redirect to="/"/></Route>
      <Route path="/partners/:path*"><Redirect to="/"/></Route>
      <Route path="/clinician/sign-in/*?"><Redirect to="/sign-in"/></Route>
      <Route path="/clinician/sign-up/*?"><Redirect to="/sign-up/patient"/></Route>
      <Route><main className="stillwell flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-4 text-center"><p className="eyebrow">Page not found</p><h1 className="display text-4xl">Let’s find our way back.</h1><Button asChild className="min-h-12"><Link href="/">Back to Stillwell</Link></Button></main></Route>
       </Switch>
       </WebsiteThemeProvider>
     </QueryClientProvider>
  </ClerkProvider>;
}
function App() { return <WouterRouter base={basePath}><Routes/></WouterRouter>; }

export default App;
