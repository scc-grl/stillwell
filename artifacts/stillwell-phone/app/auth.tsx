import { useEffect, useState } from "react";
import { View } from "react-native";
import { useAuth, useSignIn, useSignUp } from "@clerk/expo";
import { Redirect, type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ClinicianPracticeType,
  getGetAccountTypeQueryKey,
  type ClinicianPracticeType as ClinicianPracticeTypeValue,
  useCompleteAccountRegistration,
  useCreateAccountRegistrationIntent,
} from "@workspace/api-client-react";
import { Button } from "@workspace/stillwell-design-system/components/native/button";
import { Card } from "@workspace/stillwell-design-system/components/native/card";
import { Input } from "@workspace/stillwell-design-system/components/native/input";
import { Text } from "@workspace/stillwell-design-system/components/native/text";
import { Screen } from "@/components/Screen";
import { SafetyNotice } from "@/components/SafetyNotice";
import { AccountTypeSwitch, type AccountRole } from "@/components/AccountTypeSwitch";
import {
  clearConsentedDraft,
  isPendingPatientSignup,
  setPendingPatientSignup,
} from "@/lib/draft";
import { requestHref, usePendingRequest } from "@/contexts/PendingRequestContext";

type AuthMode = "sign-in" | "sign-up";

export default function AuthScreen() {
  const params = useLocalSearchParams<{
    mode?: string;
    role?: string;
    practiceType?: string;
  }>();
  const [mode, setMode] = useState<AuthMode>(
    params.mode === "sign-up" ? "sign-up" : "sign-in",
  );
  const [role, setRole] = useState<AccountRole>(
    params.role === "clinician" ? "clinician" : "patient",
  );
  const [practiceType, setPracticeType] =
    useState<ClinicianPracticeTypeValue>(
      params.practiceType === ClinicianPracticeType.clinic
        ? ClinicianPracticeType.clinic
        : ClinicianPracticeType.individual,
    );
  const pendingRequest = usePendingRequest();
  const requestToken = pendingRequest.token;
  const afterSignIn: Href = requestToken ? requestHref(requestToken) : "/";
  const [emailAddress, setEmailAddress] = useState(pendingRequest.emailPrefill);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [registrationToken, setRegistrationToken] = useState("");
  const [roleSaveFailed, setRoleSaveFailed] = useState(false);
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { signIn, fetchStatus: signInFetchStatus } = useSignIn();
  const { signUp, fetchStatus: signUpFetchStatus } = useSignUp();
  const createIntent = useCreateAccountRegistrationIntent();
  const completeRegistration = useCompleteAccountRegistration();
  const busy =
    signInFetchStatus === "fetching" ||
    signUpFetchStatus === "fetching" ||
    createIntent.isPending ||
    completeRegistration.isPending;
  const isEmailVerification =
    mode === "sign-up" &&
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0;
  const isSignInVerification = signIn.status === "needs_client_trust";

  useEffect(() => {
    const nextMode = params.mode === "sign-up" ? "sign-up" : "sign-in";
    setMode(nextMode);
    setRole(params.role === "clinician" ? "clinician" : "patient");
    setPracticeType(
      params.practiceType === ClinicianPracticeType.clinic
        ? ClinicianPracticeType.clinic
        : ClinicianPracticeType.individual,
    );
  }, [params.mode, params.practiceType, params.role]);

  useEffect(() => {
    if (mode === "sign-up" && role === "patient") {
      setPendingPatientSignup(true);
    } else {
      setPendingPatientSignup(false);
      if (mode === "sign-in" && !isPendingPatientSignup()) {
        void clearConsentedDraft();
      }
    }
  }, [mode, role]);

  useEffect(() => {
    if (mode === "sign-up" && role === "clinician" && !params.practiceType) {
      router.replace("/clinician-join");
    }
  }, [mode, params.practiceType, role, router]);

  async function finishRegistration(token: string) {
    setActionError("");
    try {
      const result = await completeRegistration.mutateAsync({
        data: { registrationToken: token },
      });
      setRoleSaveFailed(false);
      await queryClient.invalidateQueries({
        queryKey: getGetAccountTypeQueryKey(),
      });
      if (result.accountType === "patient") {
        setPendingPatientSignup(true);
        router.replace("/quiz");
      } else {
        setPendingPatientSignup(false);
        router.replace({
          pathname: "/clinician-profile",
          params: { practiceType },
        });
      }
    } catch {
      setRoleSaveFailed(true);
      setActionError(
        "Your account was created, but its Stillwell setup did not finish. Retry to continue.",
      );
    }
  }

  async function beginSignUp() {
    setActionError("");
    setMessage("");
    if (role === "clinician" && password.length < 12) {
      setActionError("Use a password with at least 12 characters.");
      return;
    }
    try {
      const intent = await createIntent.mutateAsync({
        data: { accountType: role },
      });
      setRegistrationToken(intent.registrationToken);
      const { error: signUpError } = await signUp.password({
        emailAddress: emailAddress.trim(),
        password,
      });
      if (signUpError) {
        setActionError("We couldn’t create the account. Check your details and try again.");
        return;
      }
      const { error: codeError } = await signUp.verifications.sendEmailCode();
      if (codeError) {
        setActionError("We couldn’t send the verification code. Please try again.");
        return;
      }
      setMessage("We sent a verification code to your email address.");
    } catch {
      setActionError("We couldn’t start account setup. Please try again.");
    }
  }

  async function verifySignUp() {
    setActionError("");
    const { error } = await signUp.verifications.verifyEmailCode({
      code: code.trim(),
    });
    if (error || signUp.status !== "complete") {
      setActionError("That code could not be verified. Check it or request a new one.");
      return;
    }
    try {
      await signUp.finalize({ navigate: () => undefined });
      if (!registrationToken) {
        setRoleSaveFailed(true);
        setActionError("Your account was created, but setup is incomplete. Retry below.");
        return;
      }
      await finishRegistration(registrationToken);
    } catch {
      setActionError("Your account could not be opened. Please try signing in.");
    }
  }

  async function signInWithPassword() {
    setActionError("");
    setMessage("");
    const { error } = await signIn.password({
      emailAddress: emailAddress.trim(),
      password,
    });
    if (error) {
      setActionError("We couldn’t sign you in. Check your details and try again.");
      return;
    }

    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) {
            setActionError(
              "This account needs another sign-in step. Continue on the Stillwell website.",
            );
            return;
          }
          router.replace(decorateUrl(String(afterSignIn)) as Href);
        },
      });
      return;
    }

    if (
      signIn.status === "needs_client_trust" ||
      signIn.status === "needs_second_factor"
    ) {
      const emailFactor = signIn.supportedSecondFactors.find(
        (factor) => factor.strategy === "email_code",
      );
      if (emailFactor) {
        const { error: sendError } = await signIn.mfa.sendEmailCode();
        if (sendError) {
          setActionError("We couldn’t send a verification code. Try again.");
        } else {
          setMessage("We sent a verification code to your email address.");
        }
      } else {
        setActionError(
          "This account needs another sign-in step. Continue on the Stillwell website.",
        );
      }
      return;
    }

    setActionError("We couldn’t complete sign-in. Please try again.");
  }

  async function verifySignIn() {
    setActionError("");
    const { error } = await signIn.mfa.verifyEmailCode({
      code: code.trim(),
    });
    if (error || signIn.status !== "complete") {
      setActionError("That code could not be verified. Check it or request a new one.");
      return;
    }
    await signIn.finalize({
      navigate: ({ session, decorateUrl }) => {
        if (session?.currentTask) {
          setActionError(
            "This account needs another sign-in step. Continue on the Stillwell website.",
          );
          return;
        }
        router.replace(decorateUrl(String(afterSignIn)) as Href);
      },
    });
  }

  async function cancel() {
    setPendingPatientSignup(false);
    pendingRequest.clear();
    await clearConsentedDraft();
    router.replace("/");
  }

  if (isSignedIn && mode === "sign-in") return <Redirect href={afterSignIn} />;

  return (
    <Screen>
      <Text variant="display">
        {mode === "sign-up"
          ? role === "clinician"
            ? "Create your clinician account"
            : "Create your patient account"
          : role === "clinician"
            ? "Clinician sign in"
            : "Welcome back"}
      </Text>
      <Text variant="body">
        {mode === "sign-up"
          ? role === "clinician"
            ? "Create a private professional profile for your work."
            : "Your account keeps your private journal connected across Stillwell."
          : role === "clinician"
            ? "Sign in to your private professional space. Patient journals are not available in this app."
            : "Sign in to return to your private journal."}
      </Text>

      {!isEmailVerification && !isSignInVerification && !roleSaveFailed ? (
        <>
          {mode === "sign-up" && role === "clinician" ? (
            <Text variant="label">STEP 2 OF 4 · CREATE YOUR ACCOUNT</Text>
          ) : null}
          <AccountTypeSwitch
            value={role}
            onChange={(nextRole) => {
              setActionError("");
              setMessage("");
              setCode("");
              if (mode === "sign-up" && nextRole === "clinician") {
                setRole(nextRole);
                router.replace("/clinician-join");
                return;
              }
              setRole(nextRole);
            }}
            disabled={busy}
          />
        </>
      ) : null}

      {roleSaveFailed ? (
        <Card tone="sage">
          <Text variant="heading">
            Finish {role === "clinician" ? "clinician" : "patient"} setup
          </Text>
          <Text variant="body">
            Your account is ready. We need to finish its Stillwell setup
            before continuing.
          </Text>
          <Button
            onPress={() => {
              if (registrationToken) {
                void finishRegistration(registrationToken);
              } else {
                setActionError("Please start account creation again or sign in.");
              }
            }}
            disabled={busy || !registrationToken}
            testID="retry-account-registration"
          >
            Retry setup
          </Button>
        </Card>
      ) : isEmailVerification ? (
        <Card>
          <Text variant="heading">Verify your email</Text>
          <Text variant="body">
            Enter the one-time code we sent to your email address.
          </Text>
          <Input
            label="Verification code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoCapitalize="none"
            accessibilityLabel="Email verification code"
            testID="signup-verification-code"
          />
          <Button onPress={() => void verifySignUp()} disabled={busy || !code}>
            Verify and continue
          </Button>
          <Button
            tone="outline"
            disabled={busy}
            onPress={() => {
              void signUp.verifications.sendEmailCode().then(({ error }) => {
                setMessage(error ? "" : "A new code has been sent.");
                setActionError(
                  error ? "We couldn’t send a new code. Please try again." : "",
                );
              });
            }}
          >
            Send a new code
          </Button>
        </Card>
      ) : isSignInVerification ? (
        <Card>
          <Text variant="heading">Verify your sign-in</Text>
          <Text variant="body">
            Enter the one-time code sent to your email address.
          </Text>
          <Input
            label="Verification code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            accessibilityLabel="Sign-in verification code"
            testID="signin-verification-code"
          />
          <Button onPress={() => void verifySignIn()} disabled={busy || !code}>
            Verify and continue
          </Button>
          <Button
            tone="outline"
            disabled={busy}
            onPress={() => {
              void signIn.mfa.sendEmailCode();
            }}
          >
            Send a new code
          </Button>
        </Card>
      ) : (
        <Card>
          <Input
            label="Email"
            value={emailAddress}
            onChangeText={setEmailAddress}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            accessibilityLabel="Email address"
            testID="auth-email"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoComplete={mode === "sign-up" ? "new-password" : "password"}
            textContentType={mode === "sign-up" ? "newPassword" : "password"}
            accessibilityLabel="Password"
            testID="auth-password"
          />
          {mode === "sign-up" && role === "clinician" ? (
            <>
              <Text variant="caption">Use at least 12 characters.</Text>
              <Button
                tone="outline"
                onPress={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? "Hide password" : "Show password"}
              </Button>
            </>
          ) : null}
          <Button
            onPress={() =>
              void (mode === "sign-up" ? beginSignUp() : signInWithPassword())
            }
            disabled={
              busy ||
              !emailAddress.trim() ||
              !password ||
              (mode === "sign-up" &&
                role === "clinician" &&
                password.length < 12)
            }
            testID={
              mode === "sign-up"
                ? `create-${role}-account`
                : `sign-in-${role}`
            }
          >
            {busy
              ? "Please wait…"
              : mode === "sign-up"
                ? role === "clinician"
                  ? "Create clinician account"
                  : "Create patient account"
                : role === "clinician"
                  ? "Sign in as clinician"
                  : "Sign in"}
          </Button>
          <View nativeID="clerk-captcha" />
        </Card>
      )}

      {message ? (
        <Text variant="caption" accessibilityRole="text">
          {message}
        </Text>
      ) : null}
      {actionError ? (
        <Text variant="caption" accessibilityRole="alert">
          {actionError}
        </Text>
      ) : null}

      {!roleSaveFailed && !isEmailVerification && !isSignInVerification ? (
        <Button
          tone="outline"
          onPress={() => {
            setActionError("");
            setMessage("");
            setCode("");
            if (mode === "sign-up") {
              setMode("sign-in");
              setPendingPatientSignup(false);
              void clearConsentedDraft();
            } else {
              if (role === "clinician") {
                router.replace("/clinician-join");
              } else {
                setMode("sign-up");
                setPendingPatientSignup(true);
              }
            }
          }}
        >
          {mode === "sign-up"
            ? "I already have an account — sign in"
            : role === "clinician"
              ? "Create a clinician account"
              : "Create a patient account"}
        </Button>
      ) : null}
      <Button tone="secondary" onPress={() => void cancel()}>
        Cancel and return to welcome
      </Button>
      {role === "patient" ? <SafetyNotice /> : null}
    </Screen>
  );
}
