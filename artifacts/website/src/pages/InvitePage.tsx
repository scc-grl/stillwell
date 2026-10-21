import { useEffect, useRef, useState, type ReactNode } from "react";
import { useClerk, useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { Briefcase, CheckCheck, Clock3, CloudOff, Link2Off, Mail, MailCheck, XCircle } from "lucide-react";
import {
  getGetAccountTypeQueryKey,
  getGetMyCarePatientsQueryKey,
  getPreviewCareInviteQueryKey,
  getReviewCareInviteQueryKey,
  useAcceptPatientCareInvite,
  useGetAccountType,
  useGetMyCarePatients,
  usePreviewCareInvite,
  useReviewCareInvite,
} from "@workspace/api-client-react";
import { careLinkPath, isPlausibleCareToken } from "@workspace/recovery-journal/care-link-handoff";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { EdgeCard, ErrorLine, LinkShell, LoadingBlock } from "@/components/care-link/parts";
import { EmailVerification } from "@/components/care-link/EmailVerification";
import { InviteSignedOut } from "@/components/care-link/InviteSignedOut";
import {
  STORAGE_BLOCKED_MESSAGE,
  emailToVerify,
  errorCode,
  handoffStorageAvailable,
  formatLinkDate,
  handOffAcceptedInvite,
  httpStatus,
  pendingLink,
  privateMutation,
  privateQuery,
} from "@/lib/care-link";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const PORTAL = "/clinician/portal";
const goJournal = (linkId: string) => window.location.assign(`/clinician/patients/${encodeURIComponent(linkId)}`);
const goPortal = () => window.location.assign(PORTAL);

/** Keyed by token + account so no state survives a different invite or account. */
export default function InviteRoute({ token }: { token: string }) {
  const { user } = useUser();
  return <InviteScreen key={`${token}:${user?.id ?? "signed-out"}`} token={token} />;
}

function InviteScreen({ token }: { token: string }) {
  const tokenValid = isPlausibleCareToken(token);
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;
  const owner = userId ?? "signed-out";
  const [verifying, setVerifying] = useState(false);
  const [actionError, setActionError] = useState("");
  const [acceptFailed, setAcceptFailed] = useState(false);
  const mounted = useRef(true);
  const acceptedKey = useRef<string | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (tokenValid && isLoaded) pendingLink.open("invite", token, userId);
  }, [token, tokenValid, isLoaded, userId]);

  const preview = usePreviewCareInvite(token, { query: {
    queryKey: [...getPreviewCareInviteQueryKey(token), owner], enabled: tokenValid && isLoaded, ...privateQuery,
  } });
  const account = useGetAccountType({ query: {
    queryKey: getGetAccountTypeQueryKey(), enabled: tokenValid && isLoaded && Boolean(isSignedIn), retry: false,
  } });
  const isClinician = account.data?.accountType === "clinician";
  const review = useReviewCareInvite(token, { query: {
    queryKey: [...getReviewCareInviteQueryKey(token), owner], enabled: tokenValid && Boolean(isSignedIn) && isClinician, ...privateQuery,
  } });
  const linkId = review.data?.state === "accepted" ? review.data.linkId : null;
  const patients = useGetMyCarePatients({ query: {
    queryKey: [...getGetMyCarePatientsQueryKey(), owner], enabled: Boolean(linkId) && isClinician, ...privateQuery,
  } });
  const accept = useAcceptPatientCareInvite({ mutation: privateMutation });
  const acceptRef = useRef(accept.mutate);
  acceptRef.current = accept.mutate;
  const refetchReview = useRef(review.refetch);
  refetchReview.current = review.refetch;

  const firstName = preview.data?.patientFirstName?.trim() || "Your patient";
  const maskedEmail = preview.data?.maskedEmail ?? "";
  const expiresOn = formatLinkDate(preview.data?.expiresAt ?? "");
  const signedInAs = user?.primaryEmailAddress?.emailAddress ?? null;

  function runAccept() {
    if (!userId) return;
    acceptedKey.current = `${userId}:${token}`;
    setAcceptFailed(false);
    acceptRef.current({ token }, {
      onSuccess: (result) => {
        if (!mounted.current) return;
        pendingLink.clear(token);
        if (result.linkId) { handOffAcceptedInvite(result.linkId); goJournal(result.linkId); }
        else goPortal();
      },
      onError: (error) => {
        if (!mounted.current) return;
        if (errorCode(error)) void refetchReview.current();
        else setAcceptFailed(true);
      },
    });
  }

  // Auto-accept once per user + token, only after the verified review says pending.
  useEffect(() => {
    if (!userId || review.data?.state !== "pending" || review.isFetching) return;
    if (acceptedKey.current === `${userId}:${token}`) return;
    runAccept();
  // runAccept reads refs only.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [review.data?.state, review.isFetching, userId, token]);

  function exitToPortal() {
    pendingLink.clear(token);
    queryClient.removeQueries({ queryKey: review.queryKey });
    goPortal();
  }

  async function switchAccount() {
    setActionError("");
    if (!handoffStorageAvailable()) { setActionError(STORAGE_BLOCKED_MESSAGE); return; }
    try {
      pendingLink.preserveForSwitch(token);
      await signOut({ redirectUrl: `${basePath}${careLinkPath("invite", token)}` });
    } catch {
      if (mounted.current) setActionError("You could not be signed out right now. Please try again.");
    }
  }

  async function signOutPatient() {
    setActionError("");
    try {
      pendingLink.clear(token);
      await signOut({ redirectUrl: basePath || "/" });
    } catch {
      if (mounted.current) setActionError("You could not be signed out right now. Please try again.");
    }
  }

  const shell = (node: ReactNode) => <LinkShell signedInAs={isSignedIn ? signedInAs : null}>{node}</LinkShell>;
  const portalButton = <Button onClick={exitToPortal} data-testid="button-go-portal">Go to the clinician portal</Button>;
  const invalid = shell(<EdgeCard icon={Link2Off} heading="This link isn’t valid" testId="invite-invalid"
    body="Open the most recent invite email, or ask the person who invited you to send a new one. Nothing was shared.">
    {portalButton}
  </EdgeCard>);
  const retry = (onRetry: () => void) => shell(<EdgeCard icon={CloudOff} heading="We couldn’t open this invite"
    body="Check your connection and try again. Nothing was shared." testId="invite-retry">
    <Button onClick={onRetry} data-testid="button-invite-retry">Try again</Button>
  </EdgeCard>);
  const loading = shell(<LoadingBlock label="Loading the invite" />);
  const expired = shell(<EdgeCard icon={Clock3} heading="This invite has expired" testId="invite-expired"
    body={`Invites last 14 days. Ask ${firstName} to send a new one from their Stillwell account.`}>{portalButton}</EdgeCard>);
  const cancelled = shell(<EdgeCard icon={XCircle} heading="This invite was cancelled" testId="invite-cancelled"
    body={`${firstName} cancelled this invite, so there’s nothing to accept. If you think that’s a mistake, ask ${firstName} to invite you again.`}>{portalButton}</EdgeCard>);
  const used = shell(<EdgeCard icon={CheckCheck} heading="This invite was already used" testId="invite-used"
    body={`It can’t be accepted again, and nothing new was shared. If you think that’s a mistake, ask ${firstName} to invite you again.`}>{portalButton}</EdgeCard>);
  const patientEdge = shell(<EdgeCard icon={Briefcase} heading="This invite is for a clinician account" testId="invite-patient-account"
    body={<><p>You’re signed in to a patient journal with this email. Clinician access needs a separate clinician account, so your own journal stays private.</p><p>Sign out, create a clinician account with your work email, and ask {firstName} to send the invite there.</p></>}>
    <Button onClick={() => void signOutPatient()} data-testid="button-invite-sign-out">Sign out</Button>
    <ErrorLine>{actionError}</ErrorLine>
  </EdgeCard>);

  if (!tokenValid) return invalid;
  if (!isLoaded || preview.isLoading) return loading;
  if (preview.isError) {
    const notFound = httpStatus(preview.error) === 404 || errorCode(preview.error) === "invalid_token";
    return notFound ? invalid : retry(() => void preview.refetch());
  }
  if (!preview.data) return loading;

  if (!isSignedIn) {
    if (preview.data.state === "expired") return expired;
    if (preview.data.state === "cancelled") return cancelled;
    if (preview.data.state === "accepted") return used;
    if (!handoffStorageAvailable()) {
      return shell(<EdgeCard icon={CloudOff} heading="We can’t keep your place" body={STORAGE_BLOCKED_MESSAGE} testId="invite-storage-blocked" />);
    }
    return <InviteSignedOut firstName={firstName} maskedEmail={maskedEmail} expiresOn={expiresOn}
      onContinue={(email) => {
        pendingLink.open("invite", token, null);
        pendingLink.update(token, { email, clinicianSignup: false });
        window.location.assign("/clinicians/sign-in");
      }}
      onCreateAccount={() => {
        pendingLink.open("invite", token, null);
        pendingLink.update(token, { clinicianSignup: true });
        window.location.assign("/clinicians/join");
      }} />;
  }

  if (account.isError) return retry(() => void account.refetch());
  if (account.isLoading || !account.data) return loading;
  if (account.data.accountType === "patient") return patientEdge;

  if (review.isLoading) return loading;
  if (review.isError) {
    const code = errorCode(review.error);
    switch (code) {
      case "patient_account": return patientEdge;
      case "expired": return expired;
      case "cancelled": return cancelled;
      case "already_used": return used;
      case "invalid_token": return invalid;
      case "unverified_email":
      case "different_email": {
        const target = code === "unverified_email" ? emailToVerify(review.error) : null;
        if (target) {
          return shell(<EdgeCard icon={MailCheck} heading="Confirm your email to accept" testId="invite-verify" body={null}>
            <EmailVerification variant="invite" headingless initialEmail={target} autoSend onVerified={() => void review.refetch()} />
          </EdgeCard>);
        }
        // An unverified address that isn't the invited one behaves like a different email.
        return shell(<EdgeCard icon={Mail} heading="This invite was sent to a different email" testId="invite-different-email"
          body={`${firstName} sent it to ${maskedEmail}. You’re signed in as ${signedInAs ?? "this account"}. Sign in with the invited email, or add it to this account and verify it.`}>
          {verifying
            ? <EmailVerification variant="invite" onCancel={() => setVerifying(false)} onVerified={() => { setVerifying(false); void review.refetch(); }} />
            : <>
              <Button onClick={() => void switchAccount()} data-testid="button-switch-account">Sign out and switch account</Button>
              <Button variant="outline" onClick={() => setVerifying(true)} data-testid="button-add-email">Add and verify this email</Button>
            </>}
          <ErrorLine>{actionError}</ErrorLine>
        </EdgeCard>);
      }
      default:
        return retry(() => void review.refetch());
    }
  }
  if (!review.data) return loading;

  if (review.data.state === "accepted") {
    if (!review.data.linkId) return used;
    if (patients.isError) return retry(() => void patients.refetch());
    if (patients.isLoading || !patients.data) return loading;
    // Only the stable accepted link id, in this clinician's own active or former list.
    const ownedId = review.data.linkId;
    const owned = [...patients.data.active, ...patients.data.former].some((patient) => patient.id === ownedId);
    if (!owned) return used;
    return shell(<EdgeCard icon={CheckCheck} heading="You’ve already accepted this invite" testId="invite-already-accepted"
      body={`${firstName}’s journal is in your patient list.`}>
      <Button onClick={() => { pendingLink.clear(token); queryClient.removeQueries({ queryKey: review.queryKey }); goJournal(ownedId); }} data-testid="button-open-journal">Open {firstName}’s journal</Button>
    </EdgeCard>);
  }

  if (acceptFailed) {
    return shell(<EdgeCard icon={CloudOff} heading="We couldn’t accept this invite" testId="invite-accept-failed"
      body="Nothing was connected. Check your connection and try again.">
      <Button disabled={accept.isPending} onClick={runAccept} data-testid="button-accept-retry">{accept.isPending ? "Accepting…" : "Try again"}</Button>
    </EdgeCard>);
  }
  return shell(<LoadingBlock label="Accepting the invite" />);
}
