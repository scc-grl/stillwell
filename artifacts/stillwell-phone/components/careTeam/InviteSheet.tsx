import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { CreatePatientCareInvite201 } from "@workspace/api-client-react";
import { Button } from "@workspace/stillwell-design-system/components/native/button";
import { Input } from "@workspace/stillwell-design-system/components/native/input";
import { Text } from "@workspace/stillwell-design-system/components/native/text";
import { useColors } from "@workspace/stillwell-design-system/hooks/use-colors";
import { spacing } from "@/lib/layout";
import { ensureOnline } from "@/lib/network";
import {
  OFFLINE_MESSAGE,
  errorCode,
  isOffline,
  isValidEmail,
  normalizeEmail,
} from "@/lib/care-team";
import { useConfirm } from "./feedback";

type Field = "firstName" | "lastName" | "email";
type Errors = Partial<Record<Field, string>>;

const SEND_FAILED =
  "The invite didn’t send. Check your connection and try again. Nothing was shared.";
const DUPLICATE = "You’ve already invited this email.";
const OWN_EMAIL = "This is your own email. Enter your clinician’s.";

type Props = {
  visible: boolean;
  ownEmails: string[];
  pendingInvites: { id: string; email: string }[];
  activeEmails: string[];
  onClose: () => void;
  onSubmit: (data: {
    firstName: string;
    lastName: string;
    email: string;
  }) => Promise<CreatePatientCareInvite201>;
  onSent: (result: CreatePatientCareInvite201) => void;
  onResendInstead: (inviteId: string) => void;
  /** Optional prefill, e.g. from an expired clinician request. */
  initialValues?: { firstName: string; lastName: string; email: string } | null;
};

export function InviteSheet(props: Props) {
  if (!props.visible) return null;
  return <InviteSheetBody {...props} />;
}

function InviteSheetBody({
  ownEmails,
  pendingInvites,
  activeEmails,
  onClose,
  onSubmit,
  onSent,
  onResendInstead,
  initialValues,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { confirm, element: confirmElement } = useConfirm();
  const [firstName, setFirstName] = useState(initialValues?.firstName ?? "");
  const [lastName, setLastName] = useState(initialValues?.lastName ?? "");
  const [email, setEmail] = useState(initialValues?.email ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [duplicateInviteId, setDuplicateInviteId] = useState<string | null>(null);
  const [banner, setBanner] = useState("");
  const [sending, setSending] = useState(false);
  const mounted = useRef(true);
  const translate = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled) return;
      if (reduced) {
        translate.setValue(0);
      } else {
        Animated.timing(translate, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: Platform.OS !== "web",
        }).start();
      }
    });
    return () => {
      cancelled = true;
      mounted.current = false;
    };
  }, [translate]);

  const trimmed = {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.trim(),
  };
  const canSend =
    !sending &&
    trimmed.firstName.length > 0 &&
    trimmed.lastName.length > 0 &&
    isValidEmail(trimmed.email);

  function validate(field: Field, values = trimmed): string | undefined {
    if (field === "firstName" && !values.firstName) return "Enter their first name.";
    if (field === "lastName" && !values.lastName) return "Enter their last name.";
    if (field === "email") {
      if (!isValidEmail(values.email)) return "Enter an email like name@example.com.";
      const normalized = normalizeEmail(values.email);
      if (ownEmails.includes(normalized)) return OWN_EMAIL;
      if (
        pendingInvites.some((invite) => normalizeEmail(invite.email) === normalized) ||
        activeEmails.includes(normalized)
      ) {
        return DUPLICATE;
      }
    }
    return undefined;
  }

  function setFieldError(
    field: Field,
    message: string | undefined,
    allowResend = true,
  ) {
    setErrors((current) => ({ ...current, [field]: message }));
    if (field === "email") {
      const normalized = normalizeEmail(trimmed.email);
      const match =
        message === DUPLICATE && allowResend
          ? pendingInvites.find((invite) => normalizeEmail(invite.email) === normalized)
          : undefined;
      setDuplicateInviteId(match?.id ?? null);
    }
    if (message) AccessibilityInfo.announceForAccessibility(message);
  }

  function onBlur(field: Field) {
    // Only validate fields the person has touched with content or left empty after typing.
    setFieldError(field, validate(field));
  }

  async function submit() {
    const next: Errors = {
      firstName: validate("firstName"),
      lastName: validate("lastName"),
      email: validate("email"),
    };
    setErrors(next);
    const first = next.firstName ?? next.lastName ?? next.email;
    if (first) {
      setFieldError(
        next.firstName ? "firstName" : next.lastName ? "lastName" : "email",
        first,
      );
      return;
    }
    setBanner("");
    setSending(true);
    try {
      await ensureOnline();
      const result = await onSubmit(trimmed);
      if (!mounted.current) return;
      onSent(result);
    } catch (error) {
      if (!mounted.current) return;
      const code = errorCode(error);
      if (isOffline(error)) {
        setBanner(OFFLINE_MESSAGE);
      } else if (code === "own_email") {
        setFieldError("email", OWN_EMAIL);
      } else if (code === "already_invited") {
        setFieldError("email", DUPLICATE);
      } else if (code === "already_connected") {
        setFieldError("email", DUPLICATE, false);
      } else if (code === "daily_limit") {
        setBanner("You've sent 10 invites today. Try again tomorrow.");
      } else if (code === "care_team_full") {
        setBanner(
          "You can share with up to 5 clinicians. Remove one to invite someone new.",
        );
      } else {
        setBanner(SEND_FAILED);
      }
    } finally {
      if (mounted.current) setSending(false);
    }
  }

  useEffect(() => {
    if (banner) AccessibilityInfo.announceForAccessibility(banner);
  }, [banner]);

  async function requestClose() {
    if (sending) return; // never drop an in-flight request
    const typed = firstName || lastName || email;
    if (!typed) {
      onClose();
      return;
    }
    const discard = await confirm({
      title: "Discard this invite?",
      message: "What you typed won’t be saved, and nothing will be sent.",
      cancelLabel: "Keep editing",
      confirmLabel: "Discard",
      testID: "invite-discard-dialog",
    });
    if (discard && mounted.current) onClose();
  }

  const heading = trimmed.firstName
    ? `${trimmed.firstName} will see your whole journal`
    : "They’ll see your whole journal";

  return (
    <Modal
      transparent
      visible
      animationType="none"
      onRequestClose={() => void requestClose()}
    >
      <View style={[styles.scrim, { backgroundColor: `${colors.foreground}66` }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          onPress={() => void requestClose()}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.avoider}
        >
          <Animated.View
            accessibilityViewIsModal
            role="dialog"
            aria-modal
            aria-label="Invite a clinician"
            testID="invite-sheet"
            style={[
              styles.sheet,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderTopLeftRadius: colors.radius * 1.5,
                borderTopRightRadius: colors.radius * 1.5,
                paddingBottom: Math.max(insets.bottom, Platform.OS === "web" ? 34 : 0) + spacing * 4,
                transform: [{ translateY: translate }],
              },
            ]}
          >
            <View style={styles.header}>
              <Text variant="heading" accessibilityRole="header" style={styles.flex}>
                Invite a clinician
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                accessibilityState={{ disabled: sending }}
                disabled={sending}
                onPress={() => void requestClose()}
                testID="invite-sheet-close"
                style={[styles.iconButton, { opacity: sending ? 0.48 : 1 }]}
              >
                <Ionicons name="close" size={24} color={colors.foreground} />
              </Pressable>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.body}
            >
              <View style={styles.nameRow}>
                <View style={styles.flex}>
                  <Input
                    label="First name"
                    value={firstName}
                    onChangeText={setFirstName}
                    onBlur={() => onBlur("firstName")}
                    autoComplete="off"
                    textContentType="givenName"
                    returnKeyType="next"
                    editable={!sending}
                    error={errors.firstName}
                    accessibilityLabel="First name"
                    accessibilityHint={errors.firstName}
                    testID="invite-first-name"
                    maxLength={100}
                  />
                </View>
                <View style={styles.flex}>
                  <Input
                    label="Last name"
                    value={lastName}
                    onChangeText={setLastName}
                    onBlur={() => onBlur("lastName")}
                    autoComplete="off"
                    textContentType="familyName"
                    returnKeyType="next"
                    editable={!sending}
                    error={errors.lastName}
                    accessibilityLabel="Last name"
                    accessibilityHint={errors.lastName}
                    testID="invite-last-name"
                    maxLength={100}
                  />
                </View>
              </View>
              <View style={styles.field}>
                <Input
                  label="Email"
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    setDuplicateInviteId(null);
                  }}
                  onBlur={() => onBlur("email")}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                  textContentType="emailAddress"
                  returnKeyType="send"
                  onSubmitEditing={() => {
                    if (canSend) void submit();
                  }}
                  editable={!sending}
                  error={errors.email}
                  accessibilityLabel="Email"
                  accessibilityHint={errors.email ?? "Use the email they’ll sign in with."}
                  testID="invite-email"
                  maxLength={254}
                />
                {!errors.email ? (
                  <Text variant="caption" color={colors.mutedForeground}>
                    Use the email they’ll sign in with.
                  </Text>
                ) : null}
                {duplicateInviteId ? (
                  <Button
                    tone="outline"
                    onPress={() => onResendInstead(duplicateInviteId)}
                    testID="invite-resend-instead"
                  >
                    Resend the invite instead
                  </Button>
                ) : null}
              </View>

              <View
                testID="invite-sharing-summary"
                style={[
                  styles.tinted,
                  { backgroundColor: colors.secondary, borderRadius: colors.radius },
                ]}
              >
                <View style={styles.tintedHeader}>
                  <Ionicons name="eye-outline" size={20} color={colors.primary} />
                  <Text variant="label" style={styles.flex}>
                    {heading}
                  </Text>
                </View>
                <Text variant="caption" color={colors.secondaryForeground}>
                  Every daily entry, symptom ratings, routine logs, notes and your
                  routine focus areas, including past entries.
                </Text>
                <Text variant="caption" color={colors.secondaryForeground}>
                  They won't see your password or sign-in methods. Entries you delete disappear from what they see while you're sharing.
                  Read-only; remove access anytime.
                </Text>
                <Text variant="caption" color={colors.secondaryForeground}>
                  If you remove access later, they keep what you shared up to that
                  day but see nothing new.
                </Text>
              </View>

              <View style={styles.notice}>
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color={colors.mutedForeground}
                />
                <Text variant="caption" color={colors.mutedForeground} style={styles.flex}>
                  Stillwell doesn’t verify clinicians, so only invite someone you know.
                </Text>
              </View>

              {banner ? (
                <View
                  accessibilityRole="alert"
                  accessibilityLiveRegion="assertive"
                  testID="invite-error-banner"
                  style={[
                    styles.banner,
                    { borderColor: colors.destructive, borderRadius: colors.radius },
                  ]}
                >
                  <Ionicons name="alert-circle-outline" size={20} color={colors.destructive} />
                  <Text variant="caption" style={styles.flex}>
                    {banner}
                  </Text>
                </View>
              ) : null}

              <Button
                onPress={() => void submit()}
                disabled={!canSend}
                accessibilityState={{ disabled: !canSend, busy: sending }}
                testID="invite-send"
              >
                {sending ? "Sending…" : banner ? "Try again" : "Send invite"}
              </Button>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
      {confirmElement}
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: "flex-end" },
  avoider: { width: "100%", maxHeight: "94%" },
  sheet: {
    width: "100%",
    maxWidth: 620,
    alignSelf: "center",
    borderWidth: 1,
    paddingTop: spacing * 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: spacing * 5,
    paddingRight: spacing * 3,
    gap: spacing * 2,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { paddingHorizontal: spacing * 5, paddingTop: spacing * 3, gap: spacing * 4 },
  nameRow: { flexDirection: "row", gap: spacing * 3 },
  field: { gap: spacing * 2 },
  flex: { flex: 1 },
  tinted: { padding: spacing * 4, gap: spacing * 2 },
  tintedHeader: { flexDirection: "row", alignItems: "center", gap: spacing * 2 },
  notice: { flexDirection: "row", gap: spacing * 2, alignItems: "flex-start" },
  banner: {
    flexDirection: "row",
    gap: spacing * 2,
    alignItems: "flex-start",
    borderWidth: 1,
    padding: spacing * 3,
  },
});
