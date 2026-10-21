import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/expo";
import { Button } from "@workspace/stillwell-design-system/components/native/button";
import { Card } from "@workspace/stillwell-design-system/components/native/card";
import { Input } from "@workspace/stillwell-design-system/components/native/input";
import { Text } from "@workspace/stillwell-design-system/components/native/text";
import { useColors } from "@workspace/stillwell-design-system/hooks/use-colors";
import { spacing } from "@/lib/layout";
import { isValidEmail, normalizeEmail } from "@/lib/care-team";

type ClerkUser = NonNullable<ReturnType<typeof useUser>["user"]>;
type EmailAddress = ClerkUser["emailAddresses"][number];

type IconName = ComponentProps<typeof Ionicons>["name"];

export function IconCircle({ name }: { name: IconName }) {
  const colors = useColors();
  return (
    <View style={[styles.iconCircle, { backgroundColor: colors.secondary }]}>
      <Ionicons name={name} size={26} color={colors.primary} />
    </View>
  );
}

export function Eyebrow({ children }: { children: string }) {
  const colors = useColors();
  return (
    <Text variant="label" color={colors.secondaryForeground}>
      {children}
    </Text>
  );
}

/** Icon circle + heading + paragraph + actions, used for every edge state. */
export function EdgeState({
  icon,
  heading,
  body,
  children,
  testID,
}: {
  icon: IconName;
  heading: string;
  body: string;
  children?: ReactNode;
  testID?: string;
}) {
  return (
    <View style={styles.stack} testID={testID}>
      <IconCircle name={icon} />
      <Text variant="display" accessibilityRole="header">
        {heading}
      </Text>
      <Text variant="body">{body}</Text>
      <View style={styles.actions}>{children}</View>
    </View>
  );
}

export function LoadingBlock({ label }: { label: string }) {
  const colors = useColors();
  return (
    <View accessibilityLabel={label} style={styles.stack}>
      {["40%", "85%", "70%", "100%"].map((width, i) => (
        <View
          key={i}
          style={[
            styles.skeleton,
            { width: width as `${number}%`, backgroundColor: colors.muted, height: i === 3 ? 96 : 16 },
          ]}
        />
      ))}
    </View>
  );
}

export function ConnectedChip() {
  const colors = useColors();
  return (
    <View style={[styles.chip, { backgroundColor: colors.secondary }]}>
      <Ionicons name="checkmark" size={14} color={colors.primary} />
      <Text variant="caption" color={colors.secondaryForeground}>
        Connected
      </Text>
    </View>
  );
}

/**
 * Real Clerk add-and-verify (or verify an existing unverified address).
 * Does not share anything; the caller re-checks the request afterwards.
 */
export function VerifyEmailCard({
  initialEmail = "",
  onVerified,
  onCancel,
}: {
  initialEmail?: string;
  onVerified: () => void;
  onCancel: () => void;
}) {
  const { user } = useUser();
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [addressId, setAddressId] = useState<string | null>(null);
  // Keep the exact resource Clerk returned; a freshly created address may not
  // be in user.emailAddresses until the user reloads.
  const addressRef = useRef<EmailAddress | null>(null);
  const ownerRef = useRef<string | null>(user?.id ?? null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  // Account switched underneath us: drop the in-progress verification.
  useEffect(() => {
    if (ownerRef.current !== (user?.id ?? null)) {
      ownerRef.current = user?.id ?? null;
      addressRef.current = null;
      setAddressId(null);
      setCode("");
    }
  }, [user?.id]);
  const live = () => mounted.current && ownerRef.current === (user?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function sendCode() {
    if (!user) {
      setError("Your session changed. Sign in again and retry.");
      return;
    }
    setError("");
    setMessage("");
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    try {
      const wanted = normalizeEmail(email);
      let address =
        user.emailAddresses.find((a) => normalizeEmail(a.emailAddress) === wanted) ?? null;
      if (address?.verification?.status === "verified") {
        if (live()) onVerified();
        return;
      }
      if (!address) address = await user.createEmailAddress({ email: email.trim() });
      if (!live()) return;
      const prepared = await address.prepareVerification({ strategy: "email_code" });
      if (!live()) return;
      addressRef.current = prepared ?? address;
      setAddressId(addressRef.current.id);
      setMessage("We sent a verification code to that email address.");
    } catch {
      if (live()) setError("We couldn’t send a code to that email. Check it and try again.");
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  async function verify() {
    setError("");
    let address = addressRef.current;
    if (!address && user && addressId) {
      try {
        await user.reload();
        address = user.emailAddresses.find((a) => a.id === addressId) ?? null;
      } catch {
        address = null;
      }
    }
    if (!address || !user) {
      if (live()) {
        addressRef.current = null;
        setAddressId(null);
        setCode("");
        setError("We couldn’t find that email on your account. Send a new code and try again.");
      }
      return;
    }
    setBusy(true);
    try {
      const result = await address.attemptVerification({ code: code.trim() });
      if (result.verification?.status !== "verified") throw new Error("unverified");
      await user.reload();
      if (live()) onVerified();
    } catch {
      if (live()) setError("That code could not be verified. Check it or request a new one.");
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <Card testID="request-verify-email">
      <Text variant="heading">{addressId ? "Enter your code" : "Add and verify this email"}</Text>
      {addressId ? (
        <Input
          label="Verification code"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Email verification code"
          testID="request-verify-code"
        />
      ) : (
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          spellCheck={false}
          textContentType="emailAddress"
          accessibilityLabel="Email address to add"
          testID="request-verify-email-input"
        />
      )}
      {message ? <Text variant="caption">{message}</Text> : null}
      {error ? (
        <Text variant="caption" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <Button
        fullWidth
        disabled={busy || (addressId ? !code.trim() : !email.trim())}
        onPress={() => void (addressId ? verify() : sendCode())}
      >
        {busy ? "Please wait…" : addressId ? "Verify email" : "Send code"}
      </Button>
      {addressId ? (
        <Button tone="outline" fullWidth disabled={busy} onPress={() => void sendCode()}>
          Send a new code
        </Button>
      ) : null}
      <Button tone="secondary" fullWidth disabled={busy} onPress={onCancel}>
        Cancel
      </Button>
    </Card>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing * 3 },
  actions: { gap: spacing * 3, marginTop: spacing * 2 },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  skeleton: { borderRadius: 12 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing,
    paddingHorizontal: spacing * 2,
    paddingVertical: spacing,
    borderRadius: 999,
  },
});
