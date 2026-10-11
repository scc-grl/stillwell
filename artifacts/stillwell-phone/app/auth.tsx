import { useEffect, useState } from "react";
import { View } from "react-native";
import { useAuth, useSignIn, useSignUp } from "@clerk/expo";
import { Redirect, type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetAccountTypeQueryKey,
  useCompleteAccountRegistration,
  useCreateAccountRegistrationIntent,
} from "@workspace/api-client-react";
import { Button } from "@workspace/stillwell-design-system/components/native/button";
import { Card } from "@workspace/stillwell-design-system/components/native/card";
import { Input } from "@workspace/stillwell-design-system/components/native/input";
import { Text } from "@workspace/stillwell-design-system/components/native/text";
import { Screen } from "@/components/Screen";
import { SafetyNotice } from "@/components/SafetyNotice";
import {
  clearConsentedDraft,
  isPendingPatientSignup,
  setPendingPatientSignup,
} from "@/lib/draft";

type AuthMode = "sign-in" | "sign-up";

export default function AuthScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<AuthMode>(
    params.mode === "sign-up" ? "sign-up" : "sign-in",
  );
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
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
  }, [params.mode]);

  useEffect(() => {
    if (mode === "sign-up") {
      setPendingPatientSignup(true);
    } else if (!isPendingPatientSignup()) {
      setPendingPatientSignup(false);
      void clearConsentedDraft();
    }
  }, [mode]);

  async function finishPatientRegistration(token: string) {
    setActionError("");
    try {
      await completeRegistration.mutateAsync({
        data: { registrationToken: token },
      });
      setRoleSaveFailed(false);
      await queryClient.invalidateQueries({
        queryKey: getGetAccountTypeQueryKey(),
      });
      setPendingPatientSignup(true);
      router.replace("/quiz");
    } catch {
      setRoleSaveFailed(true);
      setActionError(
        "Your account was created, but its patient setup did not finish. Retry to continue.",
      );
    }
  }

  async function beginSignUp() {
    setActionError("");
    setMessage("");
    try {
      const intent = await createIntent.mutateAsync({
        data: { accountType: "patient" },
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
        setActionError("Your account was created, but patient setup is incomplete. Retry below.");
        return;
      }
      await finishPatientRegistration(registrationToken);
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
          router.replace(decorateUrl("/") as Href);
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
        router.replace(decorateUrl("/") as Href);
      },
    });
  }

  async function cancel() {
    setPendingPatientSignup(false);
    await clearConsentedDraft();
    router.replace("/");
  }

  if (isSignedIn && mode === "sign-in") return <Redirect href="/" />;

  return (
    <Screen>
      <Text variant="display">
        {mode === "sign-up" ? "Create your patient account" : "Welcome back"}
      </Text>
      <Text variant="body">
        {mode === "sign-up"
          ? "Your account keeps your private journal connected across Stillwell."
          : "Sign in to return to your private journal."}
      </Text>

      {roleSaveFailed ? (
        <Card tone="sage">
          <Text variant="heading">Finish patient setup</Text>
          <Text variant="body">
            Your account is ready. We need to finish its patient account setup
            before continuing.
          </Text>
          <Button
            onPress={() => {
              if (registrationToken) {
                void finishPatientRegistration(registrationToken);
              } else {
                setActionError("Please start account creation again or sign in.");
              }
            }}
            disabled={busy || !registrationToken}
            testID="retry-patient-registration"
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
            secureTextEntry
            autoComplete={mode === "sign-up" ? "new-password" : "password"}
            textContentType={mode === "sign-up" ? "newPassword" : "password"}
            accessibilityLabel="Password"
            testID="auth-password"
          />
          <Button
            onPress={() =>
              void (mode === "sign-up" ? beginSignUp() : signInWithPassword())
            }
            disabled={busy || !emailAddress.trim() || !password}
            testID={mode === "sign-up" ? "create-patient-account" : "sign-in"}
          >
            {busy
              ? "Please wait…"
              : mode === "sign-up"
                ? "Create account"
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

      {!roleSaveFailed ? (
        <Button
          tone="outline"
          onPress={() => {
            setActionError("");
            setMessage("");
            setCode("");
            const next: AuthMode =
              mode === "sign-up" ? "sign-in" : "sign-up";
            setMode(next);
            if (next === "sign-in") {
              setPendingPatientSignup(false);
              void clearConsentedDraft();
            } else {
              setPendingPatientSignup(true);
            }
          }}
        >
          {mode === "sign-up"
            ? "I already have an account — sign in"
            : "Create a patient account"}
        </Button>
      ) : null}
      <Button tone="secondary" onPress={() => void cancel()}>
        Cancel and return to welcome
      </Button>
      <SafetyNotice />
    </Screen>
  );
}
