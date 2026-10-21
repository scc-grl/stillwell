import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useClerk, useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Briefcase, CheckCheck, Clock3, CloudOff, Link2Off, Mail, MailOpen, Users, XCircle } from "lucide-react";
import {
  getGetAccountTypeQueryKey,
  getGetMyCareTeamQueryKey,
  getGetRecoveryQueryKey,
  getPreviewCareRequestQueryKey,
  getReviewCareRequestQueryKey,
  useGetAccountType,
  useGetRecovery,
  usePreviewCareRequest,
  useRespondToCareRequest,
  useReviewCareRequest,
  type CareRequestDetails,
} from "@workspace/api-client-react";
import { careLinkPath, isPlausibleCareToken } from "@workspace/recovery-journal/care-link-handoff";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { EdgeCard, ErrorLine, LinkShell, LoadingBlock } from "@/components/care-link/parts";
import { EmailVerification } from "@/components/care-link/EmailVerification";
import { NewPatientView, ReadyView, ReviewView, SharedView, SignedOutView } from "@/components/care-link/RequestViews";
import {
  OFFLINE_MESSAGE,
  STORAGE_BLOCKED_MESSAGE,
  careMemory,
  doctorName,
  handoffStorageAvailable,
  isOffline,
  emailToVerify,
  formatLinkDate,
  httpStatus,
  pendingLink,
  privateMutation,
  privateQuery,
  requestErrorCode,
  requestErrorDetails,
} from "@/lib/care-link";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const INVALID_BODY = "Open the most recent email from your clinician, or ask them to send a new request. Nothing was shared.";

export default function RequestRoute({ token }: { token: string }) {
  const { user } = useUser();
  return <RequestScreen key={`${token}:${user?.id ?? "signed-out"}`} token={token} />;
}

function RequestScreen({ token: rawToken }: { token: string }) {
  const tokenValid = isPlausibleCareToken(rawToken);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { signOut } = useClerk();
  const { isLoaded, isSignedIn, user } = useUser();
  const userId = user?.id ?? null;
  const owner = userId ?? "signed-out";
  const respond = useRespondToCareRequest({ mutation: privateMutation });

  const [sharedWith, setSharedWith] = useState<string | null>(null);
  const [view, setView] = useState<"sign-in" | "new-patient">("sign-in");
  const [verifying, setVerifying] = useState(false);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [exited, setExited] = useState(() => tokenValid && careMemory.wasExited(rawToken));
  const [ready, setReady] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!tokenValid || !isLoaded || exited || sharedWith) return;
    const link = pendingLink.open("request", rawToken, userId);
    setReady(Boolean(link?.ready));
  }, [rawToken, tokenValid, isLoaded, userId, exited, sharedWith]);

  const token = tokenValid && !exited ? rawToken : "";
  const account = useGetAccountType({ query: {
    queryKey: getGetAccountTypeQueryKey(), enabled: Boolean(token) && isLoaded && Boolean(isSignedIn), retry: false,
  } });
  const isPatient = Boolean(isSignedIn) && account.data?.accountType === "patient";
  const recoveryKey = useMemo(() => [...getGetRecoveryQueryKey(), owner], [owner]);
  const recovery = useGetRecovery({ query: { queryKey: recoveryKey, enabled: Boolean(token) && isPatient, retry: false } });
  const hasJournal = Boolean(recovery.data?.profile);
  const showReady = ready && hasJournal;

  const preview = usePreviewCareRequest(token, { query: {
    queryKey: [...getPreviewCareRequestQueryKey(token), owner], enabled: Boolean(token) && isLoaded && !sharedWith, ...privateQuery,
  } });
  const reviewEnabled = Boolean(token) && isPatient && !showReady && !sharedWith;
  const review = useReviewCareRequest(token, { query: {
    queryKey: [...getReviewCareRequestQueryKey(token), owner], enabled: reviewEnabled, ...privateQuery,
  } });

  // Refetch on focus (e.g. returning after removing a clinician in another tab).
  const refetchRef = useRef(review.refetch);
  refetchRef.current = review.refetch;
  const reviewEnabledRef = useRef(reviewEnabled);
  reviewEnabledRef.current = reviewEnabled;
  useEffect(() => {
    const onFocus = () => { if (reviewEnabledRef.current) void refetchRef.current(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const previewData = preview.data;
  const reviewData = review.data;
  const reviewCode = review.isError ? requestErrorCode(review.error) : null;
  const details: CareRequestDetails | null = reviewData ?? (review.isError ? requestErrorDetails(review.error) : null);
  const dr = details
    ? doctorName({ lastName: details.clinicianLastName, fullName: details.clinicianName })
    : doctorName({ fullName: previewData?.clinicianName });
  const expiresOn = formatLinkDate(details?.expiresAt ?? previewData?.expiresAt ?? "");

  function exitRequest() {
    queryClient.removeQueries({ queryKey: review.queryKey });
    queryClient.removeQueries({ queryKey: preview.queryKey });
    pendingLink.clear(rawToken);
    careMemory.markExited(rawToken);
  }
  function goToday() {
    exitRequest();
    setLocation(isSignedIn ? "/dashboard" : "/");
  }
  function viewCareTeam() {
    exitRequest();
    careMemory.focusCareTeam();
    setLocation("/dashboard");
  }

  async function switchAccount() {
    setActionError("");
    if (!handoffStorageAvailable()) { setActionError(STORAGE_BLOCKED_MESSAGE); return; }
    try {
      pendingLink.preserveForSwitch(rawToken);
      await signOut({ redirectUrl: `${basePath}${careLinkPath("request", rawToken)}` });
    } catch {
      if (mounted.current) setActionError("You could not be signed out right now. Please try again.");
    }
  }

  async function share() {
    if (!token || busy) return;
    setActionError("");
    if (isOffline()) { setActionError(OFFLINE_MESSAGE); return; }
    setBusy(true);
    const name = dr;
    try {
      await respond.mutateAsync({ token, data: { action: "share", consentAccepted: true } });
      void queryClient.invalidateQueries({ queryKey: [...getGetMyCareTeamQueryKey(), owner] });
      if (!mounted.current) return;
      setSharedWith(name);
      exitRequest();
    } catch (error) {
      if (!mounted.current) return;
      if (isOffline()) setActionError(OFFLINE_MESSAGE);
      else if (requestErrorCode(error)) void review.refetch();
      else setActionError("Your journal wasn’t shared. Check your connection and try again.");
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  function inviteInstead() {
    if (!details?.clinicianEmail) return;
    const prefill = { firstName: details.clinicianFirstName, lastName: details.clinicianLastName, email: details.clinicianEmail };
    exitRequest();
    careMemory.setPrefill(prefill);
    careMemory.focusCareTeam();
    setLocation(hasJournal ? "/dashboard" : "/quiz");
  }

  const shell = (node: ReactNode) => <LinkShell>{node}</LinkShell>;
  const errorLine = <ErrorLine>{actionError}</ErrorLine>;
  const loading = shell(<LoadingBlock label="Loading the request" />);
  const todayButton = (primary = true) => <Button variant={primary ? "default" : "outline"} onClick={goToday} data-testid="button-request-go-today">Go to today</Button>;
  const invalid = (action: () => void, label: string) => shell(<EdgeCard icon={Link2Off} heading="This link isn’t valid" body={INVALID_BODY} testId="request-invalid">
    <Button onClick={action}>{label}</Button>
  </EdgeCard>);
  const retryEdge = (retry: () => void) => shell(<EdgeCard icon={CloudOff} heading="We couldn’t open this request" body="Check your connection and try again. Nothing was shared.">
    <Button onClick={retry} data-testid="button-request-retry">Try again</Button>{todayButton(false)}
  </EdgeCard>);
  const alreadyUsed = shell(<EdgeCard icon={CheckCheck} heading="This request was already used" body="Nothing new was shared." testId="request-already-used">{todayButton()}</EdgeCard>);
  const withdrawnEdge = shell(<EdgeCard icon={XCircle} heading="This request was withdrawn" testId="request-withdrawn"
    body={`${dr} cancelled it, so there’s nothing to decide. Your journal stays private.`}>{todayButton()}</EdgeCard>);
  const expiredEdge = (mode: "signed-out" | "invite" | "none") => shell(<EdgeCard icon={Clock3} heading="This request has expired" testId="request-expired"
    body={`Requests last 14 days. Nothing was shared. If you’d still like ${dr} to see your journal, you can invite her yourself.`}>
    {mode === "none" ? null : <Button onClick={mode === "signed-out" ? () => setLocation("/sign-in") : inviteInstead} data-testid="button-request-invite">{`Invite ${dr}`}</Button>}
    {mode === "signed-out" ? <p className="text-xs text-muted-foreground">You’ll sign in first.</p>
      : mode === "invite" && !hasJournal ? <p className="text-xs text-muted-foreground">You’ll set up your journal first, then invite her from Account.</p> : null}
    {todayButton(mode === "none")}
  </EdgeCard>);
  const clinicianEdge = shell(<EdgeCard icon={Briefcase} heading="This request is for a patient journal" testId="request-clinician"
    body="You’re signed in with a clinician account. To share a journal, sign out and sign in to your patient account, or set one up.">
    <Button onClick={() => void switchAccount()} data-testid="button-request-sign-out">Sign out</Button>{errorLine}
  </EdgeCard>);

  if (!tokenValid) return invalid(() => setLocation("/"), "Go to Stillwell");
  if (sharedWith) return <LinkShell><SharedView dr={sharedWith} onToday={() => setLocation("/dashboard")} onCareTeam={() => { careMemory.focusCareTeam(); setLocation("/dashboard"); }} /></LinkShell>;
  if (exited) {
    return shell(<EdgeCard icon={MailOpen} heading="You closed this request" body="Nothing was shared. You can review it again whenever you’re ready." testId="request-exited">
      <Button onClick={() => { careMemory.claim(rawToken); setExited(false); }} data-testid="button-request-reopen">Review the request</Button>
      <Button variant="outline" onClick={() => setLocation(isSignedIn ? "/dashboard" : "/")}>Go to today</Button>
    </EdgeCard>);
  }
  if (!isLoaded || (isSignedIn && account.isLoading)) return loading;
  if (isSignedIn && account.isError) {
    return shell(<EdgeCard icon={CloudOff} heading="We couldn’t check your account" body="Nothing was shared. Try again in a moment.">
      <Button onClick={() => void account.refetch()}>Try again</Button>
    </EdgeCard>);
  }
  if (isSignedIn && !account.data) return loading;
  if (isSignedIn && account.data?.accountType === "clinician") return clinicianEdge;

  if (!isSignedIn) {
    if (preview.isLoading) return loading;
    if (!handoffStorageAvailable() && previewData?.state === "pending") {
      return shell(<EdgeCard icon={CloudOff} heading="We can’t keep your place" body={STORAGE_BLOCKED_MESSAGE} testId="request-storage-blocked" />);
    }
    if (preview.isError || !previewData) {
      const notFound = httpStatus(preview.error) === 404 || requestErrorCode(preview.error) === "invalid_token";
      return notFound ? invalid(goToday, "Go to Stillwell") : retryEdge(() => void preview.refetch());
    }
    if (previewData.state === "expired") return expiredEdge("signed-out");
    if (previewData.state === "withdrawn") return withdrawnEdge;
    if (previewData.state === "accepted") return alreadyUsed;
    if (view === "new-patient") return <LinkShell><NewPatientView dr={dr} onStart={() => setLocation("/quiz")} onHaveAccount={() => setView("sign-in")} /></LinkShell>;
    return <LinkShell><SignedOutView dr={dr} maskedEmail={previewData.maskedEmail}
      onContinue={(email) => { pendingLink.update(rawToken, { email: email || null }); setLocation("/sign-in"); }}
      onNew={() => setView("new-patient")} /></LinkShell>;
  }

  if (showReady) {
    return <LinkShell><ReadyView dr={dr} onReview={() => { pendingLink.update(rawToken, { ready: false }); setReady(false); }} onToday={goToday} /></LinkShell>;
  }
  if (review.isLoading) return loading;

  if (review.isError) {
    switch (reviewCode) {
      case "expired": return expiredEdge(details?.clinicianEmail ? "invite" : "none");
      case "withdrawn": return withdrawnEdge;
      case "already_accepted": return alreadyUsed;
      case "different_email":
      case "unverified_email": {
        const masked = previewData?.maskedEmail ?? "another email";
        const signedInAs = user?.primaryEmailAddress?.emailAddress ?? "this account";
        const unverified = reviewCode === "unverified_email";
        const ownUnverified = emailToVerify(review.error);
        return shell(<EdgeCard icon={Mail} testId="request-different-email"
          heading={unverified ? "Verify your email to continue" : "This request was sent to a different email"}
          body={unverified
            ? `${dr} sent it to ${masked}. That address is on your account but isn’t verified yet. Verify it to review the request.`
            : `${dr} sent it to ${masked}. You’re signed in as ${signedInAs}. Sign in with that email, or add it to this account.`}>
          {verifying
            ? <EmailVerification variant="request" initialEmail={ownUnverified ?? ""} autoSend={Boolean(ownUnverified)}
              onCancel={() => setVerifying(false)} onVerified={() => { if (!mounted.current) return; setVerifying(false); void refetchRef.current(); }} />
            : <>
              <Button onClick={() => void switchAccount()} data-testid="button-switch-account">Sign out and switch account</Button>
              <Button variant="outline" onClick={() => setVerifying(true)} data-testid="button-add-email">{unverified ? "Verify this email" : "Add and verify this email"}</Button>
            </>}
          {errorLine}
        </EdgeCard>);
      }
      case "clinician_account": return clinicianEdge;
      case "already_sharing":
        return shell(<EdgeCard icon={Users} heading={`You already share with ${dr}`} body="She can already read your journal, so there’s nothing more to do." testId="request-already-sharing">
          <Button onClick={viewCareTeam}>View your care team</Button>
        </EdgeCard>);
      case "care_team_full":
        return shell(<EdgeCard icon={Users} heading="Your care team is full" testId="request-full"
          body={`You share with 5 clinicians, the most Stillwell allows. Remove one to share with ${dr}. Her request stays open until ${expiresOn}.`}>
          <Button onClick={() => { pendingLink.update(rawToken, { returnToRequest: true }); careMemory.focusCareTeam(); setLocation("/dashboard"); }} data-testid="button-request-care-team">Go to your care team</Button>
          <Button variant="outline" onClick={goToday}>Not now</Button>
        </EdgeCard>);
      case "journal_required": break;
      case "invalid_token": return invalid(goToday, "Go to today");
      default: return retryEdge(() => void review.refetch());
    }
  }

  // Account edges are resolved; a journal is required before deciding.
  if (recovery.isError) return retryEdge(() => void recovery.refetch());
  if (recovery.isLoading || !recovery.data) return loading;
  if (!hasJournal || reviewCode === "journal_required") return <LinkShell><NewPatientView dr={dr} onStart={() => setLocation("/quiz")} /></LinkShell>;
  if (!reviewData) return loading;

  return <LinkShell><ReviewView dr={dr} request={reviewData} busy={busy} error={actionError} onShare={() => void share()} onNotNow={goToday} /></LinkShell>;
}
