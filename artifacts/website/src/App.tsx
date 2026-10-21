import { useEffect, useRef, useState, type ReactNode } from "react";
import { ClerkProvider, SignIn, SignUp, useClerk, useUser } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Activity, ArrowRight, CalendarDays, CircleAlert, Leaf, Menu, ShieldCheck, Sparkles } from "lucide-react";
import { Link, Redirect, Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import { getGetAccountTypeQueryKey, useCompleteAccountRegistration, useCreateAccountRegistrationIntent, useGetAccountType } from "@workspace/api-client-react";
import type { AccountType } from "@workspace/api-client-react";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import AccountTypeChoicePage from "@/components/AccountTypeChoicePage";
import AuthPageShell from "@/components/AuthPageShell";
import DashboardPage from "@/pages/DashboardPage";
import PrivacyPage from "@/pages/PrivacyPage";
import QuizPage from "@/pages/QuizPage";
import PublicInfoPage from "@/pages/PublicInfoPage";
import UnsubscribePage from "@/pages/UnsubscribePage";
import { clearClinicianSetupDraft } from "@/pages/PartnersPages";
import { PublicLayout } from "@/components/PublicSite";
import { clearDraft, readDraft } from "@/lib/recovery";
import { clearAccountChoice, clearRegistrationIntent, readAccountChoice, readRegistrationIntent, storeRegistrationIntent } from "@/lib/account";
import { trackEvent } from "@/lib/analytics";
import InviteRoute from "@/pages/InvitePage";
import RequestRoute from "@/pages/RequestPage";
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
    fontFamily: "'DM Sans', sans-serif",
    borderRadius: "1rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#fbfaf5] rounded-[24px] w-[440px] max-w-full overflow-hidden border border-[#dce3d8]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#29463b] font-semibold",
    headerSubtitle: "text-[#718077]",
    socialButtonsBlockButtonText: "text-[#405849] font-medium",
    formFieldLabel: "text-[#405849] font-medium",
    footerActionLink: "text-[#345849] font-semibold",
    footerActionText: "text-[#718077]",
    dividerText: "text-[#81877c]",
    identityPreviewEditButton: "text-[#345849]",
    formFieldSuccessText: "text-[#4f765c]",
    alertText: "text-[#854c43]",
    logoBox: "hidden",
    socialButtonsBlockButton: "rounded-xl border-[#dce3d8] bg-[#fffefa] hover:bg-[#f2f4ed]",
    formButtonPrimary: "rounded-full bg-[#345849] hover:bg-[#28493b] text-[#fbfaf5]",
    formFieldInput: "rounded-xl border-[#dce3d8] bg-[#fffefa] text-[#29463b]",
    footerAction: "border-t border-[#e5e9e0]",
    dividerLine: "bg-[#e2e6dc]",
    alert: "rounded-xl",
    otpCodeFieldInput: "border-[#dce3d8] text-[#29463b]",
    formFieldRow: "mb-4",
    main: "text-[#29463b]",
  },
};

function Landing() {
  return <PublicLayout>
    <main id="main">
      <section className="mx-auto grid max-w-[1240px] items-center gap-10 px-5 pb-16 pt-10 sm:px-8 sm:pb-20 sm:pt-14 lg:grid-cols-[1fr_.92fr] lg:gap-14 lg:px-12 lg:pb-24 lg:pt-16">
        <div className="reveal relative z-[1]"><div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#cfdbcf] bg-[#edf1e8] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.15em] text-[#587364]"><Sparkles size={13}/> Care for the in-between</div>
          <h1 className="display max-w-[650px] text-[clamp(3rem,7vw,5.7rem)] font-medium leading-[.99] tracking-[-.058em] text-[#29453a]">Recovery can feel <span className="italic text-[#7b8f7d]">less</span> like guesswork.</h1>
          <p className="mt-7 max-w-[520px] text-[16px] leading-[1.8] text-[#56665d] sm:text-[17px]">A private, self-guided journal for concussion recovery—and lingering post-concussive symptoms. Notice what changes, choose gentle routines, and bring your own reflections to a clinician if you want.</p>
          <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center"><Link href="/quiz" onClick={() => trackEvent("recovery_quiz_started", { entry_point: "hero" })} className="group inline-flex min-h-[52px] items-center gap-5 rounded-full bg-[#345849] px-6 py-3 text-[14px] font-semibold text-[#fffdf8] transition-colors hover:bg-[#28493b]">Start a private journal<span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 transition-transform group-hover:translate-x-0.5"><ArrowRight size={15}/></span></Link><a href="#how" className="inline-flex min-h-11 items-center gap-2 px-1 py-3 text-[13px] font-medium text-[#567164] hover:text-[#29453a]">See how it works <ArrowRight size={14}/></a></div>
          <div className="mt-8 flex items-center gap-3 text-[12px] text-[#718077]"><ShieldCheck size={16} className="text-[#6b8978]"/> Your experience is optional, personal, and user-led.</div>
        </div>
        <div className="reveal-late relative mx-auto w-full max-w-[580px] lg:ml-auto"><div className="hero-art relative aspect-[1.07/1] overflow-hidden rounded-[47%_47%_43%_43%/42%_42%_51%_51%] sm:aspect-[1.12/1]"><div className="grain pointer-events-none absolute inset-0"/><div className="absolute left-[13%] top-[13%] h-[74%] w-[74%] rounded-full border border-white/45"/><div className="absolute left-[22%] top-[21%] h-[58%] w-[58%] rounded-full border border-white/55"/><div className="absolute left-[34%] top-[33%] h-[34%] w-[34%] rounded-full bg-[#f2e9d8]/80 shadow-[0_20px_60px_rgba(70,91,72,.12)]"/><div className="absolute left-[42%] top-[39%] h-[24%] w-[24%] rounded-full border border-[#738b78]/70"/><span className="absolute left-[43%] top-[18%] h-3 w-3 rounded-full bg-[#bf765f]"/><span className="absolute right-[20%] top-[44%] h-2 w-2 rounded-full bg-[#557568]"/><span className="absolute bottom-[25%] left-[21%] h-2.5 w-2.5 rounded-full bg-[#c89965]"/><div className="absolute left-[17%] top-[10%] flex items-center gap-2 rounded-full border border-white/80 bg-[#fbfaf4]/85 px-3.5 py-2 text-[11px] font-medium text-[#486457] shadow-lg backdrop-blur-sm"><span className="h-1.5 w-1.5 rounded-full bg-[#78917c]"/> Care, at your pace</div><div className="absolute bottom-[10%] right-[11%] max-w-[205px] rounded-[20px] border border-white/70 bg-[#fbfaf4]/90 p-4 shadow-xl backdrop-blur-sm"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#829083]">A steadier next step</p><p className="display mt-1.5 text-[21px] leading-[1.15] tracking-[-.035em] text-[#355345]">Built around what matters to you.</p></div><span className="absolute bottom-[13%] left-[8%] text-[10px] uppercase tracking-[.17em] text-[#61786b]">One day at a time</span></div><div className="absolute -bottom-7 left-[13%] hidden h-12 w-12 items-center justify-center rounded-full border border-[#d8ded2] bg-[#f5f4ed] text-[#6b8674] sm:flex"><Leaf size={19}/></div></div>
      </section>
      <section className="border-y border-[#e0e4db] bg-[#edeFE7]"><div className="mx-auto grid max-w-[1240px] gap-8 px-5 py-7 sm:grid-cols-3 sm:gap-5 sm:px-8 lg:px-12">{[[ShieldCheck,"Your pace","No streaks, targets, or pressure to fill every day."],[Leaf,"Your choices","Track only the routines and symptoms you choose."],[Menu,"Your record","Edit or delete entries whenever you need."]].map(([Icon,title,text])=>{const I=Icon as typeof ShieldCheck;return <div key={title as string} className="flex items-start gap-3"><span className="mt-0.5 text-[#6e8877]"><I size={19}/></span><div><p className="text-[13px] font-semibold text-[#354c40]">{title as string}</p><p className="mt-1 text-[12px] leading-5 text-[#718077]">{text as string}</p></div></div>})}</div></section>
      <section id="journal" className="mx-auto grid max-w-[1240px] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:gap-20 lg:px-12 lg:py-24"><div><p className="eyebrow">The journal</p><h2 className="display mt-3 text-[clamp(2.4rem,5vw,3.8rem)] leading-[1.04] tracking-[-.05em] text-[#29453a]">Some days don’t fit in a straight line.</h2><p className="mt-5 max-w-[420px] text-sm leading-7 text-[#68766d]">A concussion can leave changes that linger. A simple day-by-day record can make it easier to notice what feels different without turning recovery into another task to complete.</p></div><div className="grid gap-4 sm:grid-cols-2"><article className="rounded-[24px] border border-[#dce3d8] bg-[#fbfaf5] p-6"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e6ede4] text-[#68816e]"><Activity size={18}/></span><h3 className="display mt-5 text-[24px] text-[#355345]">Notice what changes</h3><p className="mt-2 text-xs leading-6 text-[#758077]">Optional symptom ratings and a few lines in your own words. Leave any category blank, any day.</p></article><article className="rounded-[24px] border border-[#dce3d8] bg-[#fbfaf5] p-6"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e6ede4] text-[#68816e]"><CalendarDays size={18}/></span><h3 className="display mt-5 text-[24px] text-[#355345]">Keep a useful history</h3><p className="mt-2 text-xs leading-6 text-[#758077]">One entry per day. Revisit or remove it whenever you choose. There are no missed days to make up.</p></article><article className="rounded-[24px] border border-[#dce3d8] bg-[#fbfaf5] p-6 sm:col-span-2"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e6ede4] text-[#68816e]"><ShieldCheck size={18}/></span><h3 className="display mt-5 text-[24px] text-[#355345]">Useful with or without a clinician</h3><p className="mt-2 max-w-[720px] text-xs leading-6 text-[#758077]">Use Stillwell independently, or invite a clinician you already know to read your journal. Sharing is opt-in and read-only, and you can stop at any time.</p></article></div></section>
      <section id="how" className="bg-[#e7ede5]"><div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[.75fr_1.25fr] lg:gap-16 lg:px-12 lg:py-24"><div><p className="eyebrow">A clear, considered start</p><h2 className="display mt-3 max-w-[430px] text-[clamp(2.4rem,5vw,3.7rem)] leading-[1.04] tracking-[-.05em] text-[#29453a]">A little more room to find your own rhythm.</h2><p className="mt-5 text-sm leading-7 text-[#64736a]">Nothing here tells you what your recovery should look like. The journal follows what you choose to notice.</p></div><div className="grid gap-0 sm:grid-cols-3">{[{num:"01",title:"Choose what matters",body:"Pick a support style and personal routine areas. Change them later."},{num:"02",title:"Start with today",body:"Reflect on symptoms and daily activities only if it feels useful."},{num:"03",title:"Return when you want",body:"Your private history stays editable, with simple controls to delete."}].map((item,i)=><article key={item.num} className={`border-t border-[#cbd7cb] py-6 sm:border-l sm:border-t-0 sm:px-5 sm:py-2 ${i===0?"sm:border-l-0 sm:pl-0":""}`}><span className="display text-[30px] text-[#a4b4a4]">{item.num}</span><h3 className="mt-4 text-sm font-semibold leading-6 text-[#344d40]">{item.title}</h3><p className="mt-2 text-xs leading-6 text-[#758078]">{item.body}</p></article>)}</div></div></section>
      <section className="mx-auto grid max-w-[1240px] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:px-12 lg:py-24"><div className="relative overflow-hidden rounded-[28px] bg-[#d4e0d5] p-6 sm:p-8"><div className="absolute -left-16 -top-20 h-64 w-64 rounded-full border border-white/70"/><div className="absolute bottom-[-90px] right-[-50px] h-[290px] w-[290px] rounded-full bg-[#f1ead8]/70"/><div className="relative rounded-[21px] border border-white/80 bg-[#fbfaf5]/95 p-6 shadow-lg"><p className="eyebrow">A sample, not an instruction</p><h3 className="display mt-2 text-[27px] text-[#355345]">The day, with room to adjust</h3><div className="mt-6 space-y-4">{[["Morning","Choose what feels possible; leave space around it."],["Midday","Pause before your energy runs low."],["Later","Notice what helped. Decide what to keep."]].map(([time,text],i)=><div key={time} className="flex gap-3"><div className="flex w-5 shrink-0 flex-col items-center"><span className={`mt-1 h-2 w-2 rounded-full ${i===1?"bg-[#c18a68]":"bg-[#78917b]"}`}/>{i<2&&<span className="mt-1 h-8 w-px bg-[#dce4d8]"/>}</div><div><p className="text-xs font-semibold text-[#435c4e]">{time}</p><p className="mt-1 text-[11px] leading-5 text-[#7b867c]">{text}</p></div></div>)}</div></div><p className="relative mt-4 text-right text-[10px] text-[#6d8071]">A reflection, not a prescribed routine.</p></div><div><p className="eyebrow">Everyday support, shaped around you</p><h2 className="display mt-3 max-w-[500px] text-[clamp(2.4rem,5vw,3.8rem)] leading-[1.03] tracking-[-.05em] text-[#29453a]">Support your routines, not a checklist.</h2><p className="mt-5 max-w-[470px] text-sm leading-7 text-[#65746a]">Keep track of the routines that matter to you: food and hydration, clinician-cleared low-risk movement, an optional quiet pause, or pacing reflections. No supplement recommendations, activity prescriptions, or per-person medical algorithms.</p></div></section>
      <section id="boundaries" className="mx-auto max-w-[1240px] px-5 pb-10 sm:px-8 lg:px-12"><div className="rounded-[28px] border border-[#e2d5c6] bg-[#f3eee4] p-6 sm:p-9"><div className="flex gap-4"><span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#d9c9b7] text-[#a2715c]"><CircleAlert size={18}/></span><div><p className="text-sm font-semibold text-[#554b42]">Clear boundaries are part of good care.</p><p className="mt-2 max-w-[900px] text-xs leading-6 text-[#777066]">Stillwell is an educational recovery journal for adults, not a diagnostic tool, treatment prescription, or substitute for medical advice. It is not for a new head injury, urgent symptoms, or emergency care. If symptoms are worsening, contact a clinician. For severe or rapidly worsening symptoms, seek emergency care now or call your local emergency number. If you work with a clinician, bring your reflections to discussions at any stage of recovery. This app does not provide clinical consultations.</p></div></div></div></section>
      <section className="px-5 pb-20 pt-8 sm:px-8 lg:px-12 lg:pb-24"><div className="relative mx-auto max-w-[1240px] overflow-hidden rounded-[30px] bg-[#355747] px-6 py-10 text-[#f8f7f0] sm:px-10 sm:py-12 lg:px-14"><div className="absolute -right-16 -top-32 h-[350px] w-[350px] rounded-full border border-white/10"/><div className="relative grid gap-8 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#c3d2c3]">A thoughtful place to begin</p><h2 className="display mt-3 max-w-[620px] text-[clamp(2.2rem,5vw,3.5rem)] leading-[1.04] tracking-[-.045em]">Let today be enough to start.</h2><p className="mt-4 max-w-[520px] text-sm leading-6 text-[#d8e1d7]">Create a private space for what you want to remember. Skip what you don’t.</p></div><Link href="/quiz" onClick={() => trackEvent("recovery_quiz_started", { entry_point: "footer" })} className="inline-flex min-h-[50px] items-center justify-between gap-7 rounded-full bg-[#f5f3e9] px-5 text-[13px] font-semibold text-[#355747] hover:bg-white">Start your journal <ArrowRight size={16}/></Link></div></div></section>
    </main>
  </PublicLayout>;
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
    return <Redirect to={accountTypeQuery.data.accountType === "clinician" ? "/clinicians/dashboard" : "/dashboard"}/>;
  }
  return children;
}

function PrivateDashboard() {
  return <AccountTypeGate required="patient"><DashboardPage/></AccountTypeGate>;
}

function QuizRoute() {
  return <AccountTypeGate required="patient" allowSignedOut><QuizPage/></AccountTypeGate>;
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
          setLocation(accountType === "clinician" ? "/clinicians/dashboard" : "/dashboard", { replace: true });
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
      setLocation(isPatient ? "/dashboard" : "/clinicians/dashboard", { replace: true });
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
  return <AuthPageShell eyebrow="Your notes, when you need them" title="A softer place to return to."
    description="Sign in to revisit your Stillwell journal, routines, and reflections."
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
    description: "Create a private patient account. Any consented quiz setup in this tab is sent only after you sign in.",
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
  useEffect(() => {
    const metadata: Record<string, { title: string; description: string }> = {
      "/clinician/sign-in": { title: "Clinician sign in", description: "Sign in to the Stillwell clinician portal. Patient journal data is not available to clinician accounts." },
      "/clinician/sign-up": { title: "Clinician account", description: "Continue to the Stillwell clinician portal to create an account and private professional profile." },
      "/clinician/portal": { title: "Clinician portal", description: "Sign in to the Stillwell clinician portal. Patient journal data is not available to clinician accounts." },
      "/partners": { title: "For clinicians, programs & researchers", description: "Explore the Stillwell clinician portal. Program, research, directory, and patient-connection features are planned." },
      "/partners/join": { title: "Create a clinician account", description: "Create an account and private professional profile in the Stillwell clinician portal." },
      "/partners/request": { title: "Programs and research", description: "Program and research partnership intake is planned and not available yet." },
      "/find-your-clinician": { title: "Find your clinician", description: "A public Stillwell clinician directory is planned and not available yet." },
      "/clinicians": { title: "Stillwell clinician portal", description: "Sign in to your private clinician portal. Patient journal data is not available to clinician accounts." },
      "/admin/partners": { title: "Clinician and partner tools", description: "Partnership intake and licence verification are planned and not available yet." },
      "/sign-up/patient": { title: "Create a patient account", description: "Create a private Stillwell journal account for your own recovery notes and reflections." },
      "/sign-up": { title: "Choose your account", description: "Choose whether you are creating a Stillwell account as a patient or a clinician." },
      "/sign-in": { title: "Patient sign in", description: "Sign in to revisit your private Stillwell journal, routines, and reflections." },
      "/account/continue": { title: "Setting up your Stillwell account", description: "Confirming your Stillwell account type." },
      "/our-history": { title: "Our history", description: "Learn about the Stillwell Recovery journal and the values behind its user-led approach." },
      "/faqs": { title: "FAQs", description: "Answers about Stillwell, a private self-guided recovery journal." },
      "/contact": { title: "Contact us", description: "Contact Stillwell with questions or comments about the recovery journal." },
      "/unsubscribe": { title: "Unsubscribe from updates", description: "Remove an email address from the Stillwell community update list." },
      "/partners/health-systems-clinicians": { title: "Health systems & clinicians", description: "Placeholder information for health systems and clinicians interested in Stillwell." },
      "/partners/care-areas": { title: "Care areas", description: "Placeholder information about care areas Stillwell may describe, including diet and gut health." },
      "/partners/physiotherapy-mobility": { title: "Physiotherapy & mobility", description: "Placeholder information for organizations interested in physiotherapy and mobility." },
    };
    if (location.startsWith("/invite/") || location.startsWith("/request/")) {
      document.title = "Stillwell";
      document.querySelector('meta[name="description"]')?.setAttribute("content", "A private, self-guided journal for concussion and post-concussive recovery.");
      return;
    }
    const matchedMetadata = Object.entries(metadata).find(([path]) => location === path || location.startsWith(`${path}/`))?.[1];
    const page = matchedMetadata?.title ?? (location.startsWith("/sign-in") ? "Sign in" : location.startsWith("/sign-up") ? "Create account" :
      location === "/quiz" ? "Your starting quiz" : location === "/dashboard" ? "Your private journal" :
      location === "/privacy" ? "Privacy and data controls" : "Recovery at your pace");
    document.title = `${page} · Stillwell`;
    document.querySelector('meta[name="description"]')?.setAttribute("content",
      matchedMetadata?.description ?? (location === "/" ? "A private, self-guided journal for concussion and post-concussive recovery." :
      `${page} for your Stillwell recovery journal. Educational routines, not medical advice.`));
  }, [location]);
  return <ClerkProvider telemetry={{ disabled: true }} publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={appearance} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} localization={{
    signIn: { start: { title: "Welcome back", subtitle: "Sign in to your Stillwell account" } },
    signUp: { start: { title: "Create your Stillwell account", subtitle: "A personal place for your Stillwell experience" } },
  }} routerPush={to => setLocation(stripBase(to))} routerReplace={to => setLocation(stripBase(to), { replace: true })}>
    <QueryClientProvider client={queryClient}><ClerkCacheInvalidator/><Switch>
      <Route path="/" component={HomeRedirect}/>
      <Route path="/sign-in/*?" component={SignInPage}/>
      <Route path="/clinician/sign-in/*?"><Redirect to="/clinicians/sign-in"/></Route>
      <Route path="/account/continue" component={AccountContinuation}/>
      <Route path="/sign-up/patient/*?" component={PatientSignUpPage}/>
      <Route path="/clinician/sign-up/*?"><Redirect to="/clinicians/join"/></Route>
      <Route path="/sign-up/*?" component={SignUpPage}/>
      <Route path="/clinician/portal"><Redirect to="/clinicians/dashboard"/></Route>
      <Route path="/quiz" component={QuizRoute}/>
      <Route path="/dashboard" component={PrivateDashboard}/>
      <Route path="/invite/:token">{(params) => <InviteRoute token={params.token}/>}</Route>
      <Route path="/request/:token">{(params) => <RequestRoute token={params.token}/>}</Route>
      <Route path="/partners"><Redirect to="/clinicians"/></Route>
      <Route path="/partners/join"><Redirect to="/clinicians/join"/></Route>
      <Route path="/partners/request"><Redirect to="/clinicians"/></Route>
      <Route path="/find-your-clinician"><PublicLayout><PublicInfoPage content={{ eyebrow: "Planned", title: "Find your clinician", description: "A public clinician directory is not available yet.", placeholder: "Stillwell does not currently match or connect people with clinicians. If you already have a clinician, you can continue using your private journal and share it with them outside of Stillwell." }}/></PublicLayout></Route>
      <Route path="/admin/partners"><Redirect to="/clinicians"/></Route>
      <Route path="/privacy"><PublicLayout><PrivacyPage/></PublicLayout></Route>
      <Route path="/unsubscribe"><PublicLayout><UnsubscribePage/></PublicLayout></Route>
      <Route path="/our-history"><PublicLayout><PublicInfoPage content={{ eyebrow: "About Stillwell", title: "Our history", description: "Stillwell is a private, self-guided recovery journal made for people who want a quiet place to record their own reflections.", placeholder: "This page is a placeholder. More about the people, ideas, and history behind Stillwell will be added here." }}/></PublicLayout></Route>
      <Route path="/faqs"><PublicLayout><PublicInfoPage content={{ eyebrow: "A few helpful notes", title: "FAQs", description: "A place for clear, practical answers about using the Stillwell journal.", placeholder: "This page is a placeholder. Frequently asked questions and answers will be added here. Stillwell is an educational, user-led journal, not medical advice or emergency care." }}/></PublicLayout></Route>
      <Route path="/contact"><PublicLayout><PublicInfoPage content={{ eyebrow: "We’re here to listen", title: "Contact us", description: "For questions or comments about Stillwell, you can reach us at the placeholder address below.", placeholder: "PLACEHOLDER CONTACT EMAIL: hello@stillwell.example. This address is a temporary placeholder and is not a confirmed support channel." }}/></PublicLayout></Route>
      <Route path="/partners/health-systems-clinicians"><PublicLayout><PublicInfoPage content={{ eyebrow: "Partner with Stillwell", title: "Health systems & clinicians", description: "Placeholder information for health systems, clinicians, and organizations exploring whether a user-led journal may be relevant to their work.", placeholder: "This page is a placeholder. Details about potential organizational conversations and the Stillwell journal will be added here.", partner: true }}/></PublicLayout></Route>
      <Route path="/partners/care-areas"><PublicLayout><PublicInfoPage content={{ eyebrow: "Partner with Stillwell", title: "Care areas, including diet & gut health", description: "Placeholder information about areas Stillwell may describe in educational journal content.", placeholder: "Diet and gut health are areas to describe here, not advice, recommendations, or treatment guidance.", partner: true }}/></PublicLayout></Route>
      <Route path="/partners/physiotherapy-mobility"><PublicLayout><PublicInfoPage content={{ eyebrow: "Partner with Stillwell", title: "Physiotherapy & mobility", description: "Placeholder information for organizations interested in physiotherapy and mobility as topics in a recovery journal.", placeholder: "This page is a placeholder. More information about how these topics may be described in Stillwell will be added here.", partner: true }}/></PublicLayout></Route>
      <Route><div className="min-h-[100dvh] bg-[#f5f4ed] p-10 text-center"><p className="eyebrow">Page not found</p><h1 className="display mt-3 text-4xl text-[#29463b]">Let’s find our way back.</h1><Link href="/" className="mt-6 inline-flex rounded-full bg-[#345849] px-5 py-3 text-sm text-white">Back to Stillwell</Link></div></Route>
    </Switch></QueryClientProvider>
  </ClerkProvider>;
}
function App() { return <WouterRouter base={basePath}><Routes/></WouterRouter>; }

export default App;
