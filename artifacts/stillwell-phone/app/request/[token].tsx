import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Platform } from "react-native";
import { useAuth, useClerk, useUser } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Button } from "@workspace/stillwell-design-system/components/native/button";
import { Text } from "@workspace/stillwell-design-system/components/native/text";
import { useColors } from "@workspace/stillwell-design-system/hooks/use-colors";
import { Screen } from "@/components/Screen";
import { EdgeState, LoadingBlock, VerifyEmailCard } from "@/components/careRequest/parts";
import {
  NewPatientView,
  ReadyView,
  ReviewView,
  SharedView,
  SignedOutView,
} from "@/components/careRequest/views";
import { usePatientData } from "@/contexts/PatientDataContext";
import { requestHref, usePendingRequest } from "@/contexts/PendingRequestContext";
import {
  useCareRequestPreview,
  useCareRequestReview,
  useRespondToRequest,
} from "@/hooks/useCareRequest";
import { careTeamQueryKey } from "@/hooks/useCareTeam";
import {
  careRequestErrorCode,
  careRequestErrorDetails,
  doctorName,
  formatRequestDate,
  httpStatus,
  isPlausibleToken,
  type CareRequestDetails,
} from "@/lib/care-request";
import { OFFLINE_MESSAGE, isOffline } from "@/lib/care-team";
import { ensureOnline } from "@/lib/network";
import { setPendingPatientSignup } from "@/lib/draft";

const INVALID_BODY =
  "Open the most recent email from your clinician, or ask them to send a new request. Nothing was shared.";

/**
 * Keyed by token + account so no local state (confirmation, email, verify
 * step, sign-in/new-patient view) survives a different request or account.
 */
export default function CareRequestRoute() {
  const params = useLocalSearchParams<{ token?: string }>();
  const rawToken = typeof params.token === "string" ? params.token : "";
  const { userId } = useAuth();
  return (
    <CareRequestScreen key={`${rawToken}:${userId ?? "signed-out"}`} rawToken={rawToken} />
  );
}

function CareRequestScreen({ rawToken }: { rawToken: string }) {
  const tokenValid = isPlausibleToken(rawToken);
  const router = useRouter();
  const queryClient = useQueryClient();
  const colors = useColors();
  const { signOut } = useClerk();
  const { user } = useUser();
  const pending = usePendingRequest();
  const {
    isLoaded,
    isSignedIn,
    userId,
    accountType,
    accountTypeLoading,
    accountTypeError,
    refreshAccountType,
    recovery,
    recoveryLoading,
    recoveryError,
    refreshRecovery,
  } = usePatientData();
  const respond = useRespondToRequest();

  const [sharedWith, setSharedWith] = useState<string | null>(null);
  const [view, setView] = useState<"sign-in" | "new-patient">("sign-in");
  const [email, setEmail] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Install the token in memory; refused if the patient already exited it.
  const setToken = pending.setToken;
  useEffect(() => {
    if (tokenValid && !sharedWith) setToken(rawToken);
  }, [rawToken, setToken, sharedWith, tokenValid]);

  const active = tokenValid && pending.token === rawToken;
  const exited = tokenValid && !active && !sharedWith && pending.wasExited(rawToken);
  const token = active ? rawToken : null;
  const isPatient = isSignedIn && accountType === "patient";
  const hasJournal = Boolean(recovery?.profile);
  const showReady = pending.readyHandoff && hasJournal;

  const preview = useCareRequestPreview(token, userId, Boolean(token) && !sharedWith);
  // Verified-patient review runs with or without a journal so account edges
  // (wrong email, expired, withdrawn, full) come before any setup.
  const reviewEnabled = Boolean(token) && isPatient && !showReady && !sharedWith;
  const review = useCareRequestReview(token, userId, reviewEnabled);

  // Refetch on focus (e.g. returning from Account after removing a clinician).
  const refetchRef = useRef(review.refetch);
  refetchRef.current = review.refetch;
  const reviewEnabledRef = useRef(reviewEnabled);
  reviewEnabledRef.current = reviewEnabled;
  useFocusEffect(
    useCallback(() => {
      if (reviewEnabledRef.current) void refetchRef.current();
    }, []),
  );

  const previewData = preview.data;
  const reviewData = review.data;
  const reviewCode = review.isError ? careRequestErrorCode(review.error) : null;
  const details: CareRequestDetails | null =
    reviewData ?? (review.isError ? careRequestErrorDetails(review.error) : null);
  const dr = details
    ? doctorName({ lastName: details.clinicianLastName, fullName: details.clinicianName })
    : doctorName({ fullName: previewData?.clinicianName });
  const expiresOn = formatRequestDate(details?.expiresAt ?? previewData?.expiresAt ?? "");

  function exitRequest() {
    queryClient.removeQueries({ queryKey: review.queryKey });
    queryClient.removeQueries({ queryKey: preview.queryKey });
    pending.clear(rawToken);
  }

  function goToday() {
    exitRequest();
    router.replace(isSignedIn ? "/(tabs)/today" : "/");
  }

  function viewCareTeam() {
    exitRequest();
    router.replace("/(tabs)/account");
  }

  async function switchAccount() {
    setActionError("");
    const target = rawToken;
    try {
      pending.preserveTokenForSwitch();
      setPendingPatientSignup(false);
      await signOut();
      // A remounted signed-out screen is already on this request. Never
      // let a late sign-out navigate over a different request opened since.
      if (mounted.current) router.replace(requestHref(target));
    } catch {
      if (mounted.current) {
        setActionError("You could not be signed out right now. Please try again.");
      }
    }
  }

  async function share() {
    if (!token || busy) return;
    setActionError("");
    setBusy(true);
    const name = dr;
    const forUser = userId;
    try {
      await ensureOnline();
      await respond.mutateAsync({
        token,
        data: { action: "share", consentAccepted: true },
      });
      if (forUser) {
        void queryClient.invalidateQueries({ queryKey: careTeamQueryKey(forUser) });
      }
      // Ignore completions for an old token/account: the key change unmounted us.
      if (!mounted.current) return;
      setSharedWith(name);
      exitRequest();
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      }
    } catch (error) {
      if (!mounted.current) return;
      if (isOffline(error)) {
        setActionError(OFFLINE_MESSAGE);
      } else if (careRequestErrorCode(error)) {
        void review.refetch();
      } else {
        setActionError("Your journal wasn’t shared. Check your connection and try again.");
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  function inviteInstead() {
    if (!details?.clinicianEmail) return;
    const prefill = {
      firstName: details.clinicianFirstName,
      lastName: details.clinicianLastName,
      email: details.clinicianEmail,
    };
    exitRequest();
    pending.setInvitePrefill(prefill);
    // Without a journal, the invite sheet opens in Account after setup.
    router.replace(hasJournal ? "/(tabs)/account" : "/quiz");
  }

  const errorLine = actionError ? (
    <Text variant="caption" color={colors.destructive} accessibilityRole="alert">
      {actionError}
    </Text>
  ) : null;

  const edge = (
    icon: Parameters<typeof EdgeState>[0]["icon"],
    heading: string,
    body: string,
    actions: ReactNode,
    testID?: string,
  ) => (
    <Screen>
      <EdgeState icon={icon} heading={heading} body={body} testID={testID}>
        {actions}
      </EdgeState>
    </Screen>
  );

  const loading = (
    <Screen>
      <LoadingBlock label="Loading the request" />
    </Screen>
  );

  const todayButton = (primary = true) => (
    <Button tone={primary ? "primary" : "outline"} fullWidth onPress={goToday}>
      Go to today
    </Button>
  );

  const invalid = (action: () => void, label: string) =>
    edge(
      "link-outline",
      "This link isn’t valid",
      INVALID_BODY,
      <Button fullWidth onPress={action}>
        {label}
      </Button>,
      "request-invalid",
    );

  const retryEdge = (retry: () => void) =>
    edge(
      "cloud-offline-outline",
      "We couldn’t open this request",
      "Check your connection and try again. Nothing was shared.",
      <>
        <Button fullWidth onPress={retry}>
          Try again
        </Button>
        {todayButton(false)}
      </>,
    );

  const alreadyUsed = edge(
    "checkmark-done-outline",
    "This request was already used",
    "Nothing new was shared.",
    todayButton(),
    "request-already-used",
  );

  const withdrawnEdge = edge(
    "close-circle-outline",
    "This request was withdrawn",
    `${dr} cancelled it, so there’s nothing to decide. Your journal stays private.`,
    todayButton(),
    "request-withdrawn",
  );

  const expiredEdge = (mode: "signed-out" | "invite" | "none") =>
    edge(
      "time-outline",
      "This request has expired",
      `Requests last 14 days. Nothing was shared. If you’d still like ${dr} to see your journal, you can invite her yourself.`,
      <>
        {mode === "none" ? null : (
          <Button
            fullWidth
            onPress={
              mode === "signed-out"
                ? () => router.push("/auth?mode=sign-in&role=patient")
                : inviteInstead
            }
          >
            {`Invite ${dr}`}
          </Button>
        )}
        {mode === "signed-out" ? (
          <Text variant="caption" color={colors.mutedForeground}>
            You’ll sign in first.
          </Text>
        ) : mode === "invite" && !hasJournal ? (
          <Text variant="caption" color={colors.mutedForeground}>
            You’ll set up your journal first, then invite her from Account.
          </Text>
        ) : null}
        {todayButton(mode === "none")}
      </>,
      "request-expired",
    );

  const clinicianEdge = edge(
    "briefcase-outline",
    "This request is for a patient journal",
    "You’re signed in with a clinician account. To share a journal, sign out and sign in to your patient account, or set one up.",
    <>
      <Button fullWidth onPress={() => void switchAccount()}>
        Sign out
      </Button>
      {errorLine}
    </>,
    "request-clinician",
  );

  if (!tokenValid) return invalid(() => router.replace("/"), "Go to Stillwell");

  if (sharedWith) {
    return (
      <SharedView
        dr={sharedWith}
        onToday={() => router.replace("/(tabs)/today")}
        onCareTeam={() => router.replace("/(tabs)/account")}
      />
    );
  }

  if (exited) {
    return edge(
      "mail-open-outline",
      "You closed this request",
      "Nothing was shared. You can review it again whenever you’re ready.",
      <>
        <Button fullWidth onPress={() => pending.claimToken(rawToken)}>
          Review the request
        </Button>
        <Button
          tone="outline"
          fullWidth
          onPress={() => router.replace(isSignedIn ? "/(tabs)/today" : "/")}
        >
          Go to today
        </Button>
      </>,
      "request-exited",
    );
  }

  if (!token || !isLoaded || (isSignedIn && (accountTypeLoading || !accountType) && !accountTypeError)) {
    return loading;
  }

  if (isSignedIn && accountTypeError) {
    return edge(
      "cloud-offline-outline",
      "We couldn’t check your account",
      "Nothing was shared. Try again in a moment.",
      <Button fullWidth onPress={refreshAccountType}>
        Try again
      </Button>,
    );
  }
  if (isSignedIn && accountType === "clinician") return clinicianEdge;

  // ---------- Signed out ----------
  if (!isSignedIn) {
    if (preview.isLoading) return loading;
    if (preview.isError || !previewData) {
      const notFound =
        httpStatus(preview.error) === 404 ||
        careRequestErrorCode(preview.error) === "invalid_token";
      return notFound ? invalid(goToday, "Go to Stillwell") : retryEdge(() => void preview.refetch());
    }
    if (previewData.state === "expired") return expiredEdge("signed-out");
    if (previewData.state === "withdrawn") return withdrawnEdge;
    if (previewData.state === "accepted") return alreadyUsed;
    if (view === "new-patient") {
      return (
        <NewPatientView
          dr={dr}
          onStart={() => router.push("/quiz")}
          onHaveAccount={() => setView("sign-in")}
        />
      );
    }
    return (
      <SignedOutView
        dr={dr}
        maskedEmail={previewData.maskedEmail}
        email={email}
        onEmail={setEmail}
        onContinue={() => {
          pending.setEmailPrefill(email.trim());
          router.push("/auth?mode=sign-in&role=patient");
        }}
        onNew={() => setView("new-patient")}
      />
    );
  }

  // ---------- Signed-in patient ----------
  if (showReady) {
    return (
      <ReadyView dr={dr} onReview={() => pending.setReadyHandoff(false)} onToday={goToday} />
    );
  }

  if (review.isLoading) return loading;

  if (review.isError) {
    switch (reviewCode) {
      case "expired":
        return expiredEdge(details?.clinicianEmail ? "invite" : "none");
      case "withdrawn":
        return withdrawnEdge;
      case "already_accepted":
        return alreadyUsed;
      case "different_email":
      case "unverified_email": {
        const masked = previewData?.maskedEmail ?? "another email";
        const signedInAs = user?.primaryEmailAddress?.emailAddress ?? "this account";
        const unverified = reviewCode === "unverified_email";
        return edge(
          "mail-outline",
          unverified ? "Verify your email to continue" : "This request was sent to a different email",
          unverified
            ? `${dr} sent it to ${masked}. That address is on your account but isn’t verified yet. Verify it to review the request.`
            : `${dr} sent it to ${masked}. You’re signed in as ${signedInAs}. Sign in with that email, or add it to this account.`,
          <>
            {verifying ? (
              <VerifyEmailCard
                onCancel={() => setVerifying(false)}
                onVerified={() => {
                  if (!mounted.current) return;
                  setVerifying(false);
                  void refetchRef.current();
                }}
              />
            ) : (
              <>
                <Button fullWidth onPress={() => void switchAccount()}>
                  Sign out and switch account
                </Button>
                <Button tone="outline" fullWidth onPress={() => setVerifying(true)}>
                  {unverified ? "Verify this email" : "Add and verify this email"}
                </Button>
              </>
            )}
            {errorLine}
          </>,
          "request-different-email",
        );
      }
      case "clinician_account":
        return clinicianEdge;
      case "already_sharing":
        return edge(
          "people-outline",
          `You already share with ${dr}`,
          "She can already read your journal, so there’s nothing more to do.",
          <Button fullWidth onPress={viewCareTeam}>
            View your care team
          </Button>,
          "request-already-sharing",
        );
      case "care_team_full":
        return edge(
          "people-outline",
          "Your care team is full",
          `You share with 5 clinicians, the most Stillwell allows. Remove one to share with ${dr}. Her request stays open until ${expiresOn}.`,
          <>
            <Button
              fullWidth
              onPress={() => {
                pending.setReturnToRequest(true);
                router.push("/(tabs)/account");
              }}
            >
              Go to your care team
            </Button>
            <Button tone="outline" fullWidth onPress={goToday}>
              Not now
            </Button>
          </>,
          "request-full",
        );
      case "journal_required":
        break; // falls through to journal setup below
      case "invalid_token":
        return invalid(goToday, "Go to today");
      default:
        return retryEdge(() => void review.refetch());
    }
  }

  // Account edges are resolved; now a journal is required before deciding.
  if (recoveryError) return retryEdge(refreshRecovery);
  if (recoveryLoading || !recovery) return loading;
  if (!hasJournal || reviewCode === "journal_required") {
    return <NewPatientView dr={dr} onStart={() => router.push("/quiz")} />;
  }

  if (!reviewData) return loading;

  return (
    <ReviewView
      dr={dr}
      request={reviewData}
      busy={busy}
      error={actionError}
      onShare={() => void share()}
      onNotNow={goToday}
    />
  );
}
