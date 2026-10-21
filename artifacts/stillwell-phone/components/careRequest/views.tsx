import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { CareRequestDetails } from "@workspace/api-client-react";
import { Button } from "@workspace/stillwell-design-system/components/native/button";
import { Card } from "@workspace/stillwell-design-system/components/native/card";
import { Input } from "@workspace/stillwell-design-system/components/native/input";
import { Text } from "@workspace/stillwell-design-system/components/native/text";
import { useColors } from "@workspace/stillwell-design-system/hooks/use-colors";
import { Screen } from "@/components/Screen";
import { ConnectedChip, Eyebrow, IconCircle } from "@/components/careRequest/parts";
import { formatRequestDate, initials } from "@/lib/care-request";
import { spacing } from "@/lib/layout";

/** Pure presentational views for the share-request route. */

export function SharedView({
  dr,
  onToday,
  onCareTeam,
}: {
  dr: string;
  onToday: () => void;
  onCareTeam: () => void;
}) {
  const colors = useColors();
  return (
    <Screen>
      <View style={styles.stack} testID="request-shared">
        <IconCircle name="checkmark-circle-outline" />
        <Text variant="display" accessibilityRole="header">
          You’re sharing with {dr}
        </Text>
        <Text variant="body">
          She can now read your journal. Nothing changes about how you use Stillwell.
        </Text>
        <Card>
          <View style={styles.row}>
            <Text variant="body" style={styles.flex}>
              Connected today · at her request
            </Text>
            <ConnectedChip />
          </View>
        </Card>
        <Text variant="caption" color={colors.mutedForeground}>
          To stop sharing, go to Account → Your care team.
        </Text>
        <Button fullWidth onPress={onToday} testID="request-go-today">
          Go to today
        </Button>
        <Button tone="outline" fullWidth onPress={onCareTeam}>
          View your care team
        </Button>
      </View>
    </Screen>
  );
}

export function NewPatientView({
  dr,
  onStart,
  onHaveAccount,
}: {
  dr: string;
  onStart: () => void;
  onHaveAccount?: () => void;
}) {
  const colors = useColors();
  return (
    <Screen>
      <View style={styles.stack} testID="request-new-patient">
        <Eyebrow>SHARE REQUEST</Eyebrow>
        <Text variant="display" accessibilityRole="header">
          {dr} asked you to share your journal
        </Text>
        <Text variant="body">
          First, set up your private Stillwell journal. It takes a couple of minutes, and
          you’ll decide about sharing at the end.
        </Text>
        <Card>
          {[
            "A few starting questions",
            "Create your account",
            `Choose whether to share with ${dr}`,
          ].map((step, index) => (
            <View key={step} style={styles.row}>
              <View style={[styles.circle32, { backgroundColor: colors.secondary }]}>
                <Text variant="label" color={colors.secondaryForeground}>
                  {String(index + 1)}
                </Text>
              </View>
              <Text variant="body" style={styles.flex}>
                {step}
              </Text>
            </View>
          ))}
        </Card>
        <Button fullWidth onPress={onStart} testID="request-get-started">
          Get started
        </Button>
        {onHaveAccount ? (
          <Button tone="outline" fullWidth onPress={onHaveAccount}>
            I already have an account
          </Button>
        ) : null}
      </View>
    </Screen>
  );
}

export function SignedOutView({
  dr,
  maskedEmail,
  email,
  onEmail,
  onContinue,
  onNew,
}: {
  dr: string;
  maskedEmail: string;
  email: string;
  onEmail: (value: string) => void;
  onContinue: () => void;
  onNew: () => void;
}) {
  const colors = useColors();
  return (
    <Screen>
      <View style={styles.stack} testID="request-signed-out">
        <Eyebrow>SHARE REQUEST</Eyebrow>
        <Text variant="display" accessibilityRole="header">
          {dr} asked you to share your journal
        </Text>
        <Text variant="body">
          Sign in to review the request. Nothing is shared until you choose.
        </Text>
        <Card>
          <Input
            label="Email"
            value={email}
            onChangeText={onEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            spellCheck={false}
            textContentType="emailAddress"
            accessibilityLabel="Email address"
            accessibilityHint={`The request was sent to ${maskedEmail}`}
            testID="request-email"
          />
          <Text variant="caption" color={colors.mutedForeground}>
            The request was sent to {maskedEmail}.
          </Text>
          <Button fullWidth onPress={onContinue} testID="request-continue">
            Continue
          </Button>
        </Card>
        <Button tone="outline" fullWidth onPress={onNew} testID="request-new-to-stillwell">
          New to Stillwell? Set up your journal
        </Button>
      </View>
    </Screen>
  );
}

export function ReadyView({
  dr,
  onReview,
  onToday,
}: {
  dr: string;
  onReview: () => void;
  onToday: () => void;
}) {
  return (
    <Screen>
      <View style={styles.stack} testID="request-ready">
        <IconCircle name="leaf-outline" />
        <Text variant="display" accessibilityRole="header">
          Your journal is ready
        </Text>
        <Text variant="body">Your first entry is saved and private to you.</Text>
        <Card tone="sage">
          <Eyebrow>ONE MORE THING</Eyebrow>
          <Text variant="heading">{dr} asked to see your journal</Text>
          <Text variant="body">
            Review what she’d see, then decide. You can also do this later from the email.
          </Text>
        </Card>
        <Button fullWidth onPress={onReview}>
          Review the request
        </Button>
        <Button tone="outline" fullWidth onPress={onToday}>
          Go to today
        </Button>
      </View>
    </Screen>
  );
}

export function ReviewView({
  dr,
  request,
  busy,
  error,
  onShare,
  onNotNow,
}: {
  dr: string;
  request: CareRequestDetails;
  busy: boolean;
  error: string;
  onShare: () => void;
  onNotNow: () => void;
}) {
  const colors = useColors();
  const askedOn = formatRequestDate(request.requestedAt);
  const expiresOn = formatRequestDate(request.expiresAt);
  return (
    <Screen>
      <View style={styles.stack} testID="request-review">
        <Eyebrow>SHARE REQUEST</Eyebrow>
        <Text variant="display" accessibilityRole="header">
          Share your journal with {dr}?
        </Text>
        <Card>
          {/* Name, email and date are announced as one unit. */}
          <View
            style={styles.row}
            accessible
            accessibilityRole="text"
            accessibilityLabel={`${request.clinicianName}, ${request.clinicianEmail}, asked ${askedOn}`}
            testID="request-clinician-card"
          >
            <View
              style={[styles.circle48, { backgroundColor: colors.secondary }]}
              importantForAccessibility="no-hide-descendants"
            >
              <Text variant="label" color={colors.secondaryForeground}>
                {initials(request.clinicianName)}
              </Text>
            </View>
            <View style={styles.flex} importantForAccessibility="no-hide-descendants">
              <Text variant="heading">{request.clinicianName}</Text>
              <Text variant="caption" color={colors.mutedForeground}>
                {request.clinicianEmail}
              </Text>
              <Text variant="caption" color={colors.mutedForeground}>
                Asked {askedOn}
              </Text>
            </View>
          </View>
        </Card>
        <Card tone="sage">
          <Text variant="heading">She’ll see your whole journal</Text>
          <Text variant="body">
            Every daily entry, symptom ratings, routine logs, notes and your routine focus
            areas, including past entries.
          </Text>
          <Text variant="body">
            She won't see your password or sign-in methods. Entries you delete disappear from what she sees while you're sharing. Read-only; stop
            sharing anytime in Account.
          </Text>
          <Text variant="body">
            If you stop sharing later, she keeps what you shared up to then but sees nothing
            new.
          </Text>
        </Card>
        <View style={styles.row}>
          <Ionicons name="information-circle-outline" size={18} color={colors.mutedForeground} />
          <Text variant="caption" color={colors.mutedForeground} style={styles.flex}>
            Stillwell doesn’t verify clinicians. Only share if you know {dr}.
          </Text>
        </View>
        {error ? (
          <Text variant="caption" color={colors.destructive} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
        <Button fullWidth disabled={busy} onPress={onShare} testID="request-share">
          {busy ? "Sharing…" : "Share my journal"}
        </Button>
        <Button tone="outline" fullWidth disabled={busy} onPress={onNotNow} testID="request-not-now">
          Not now
        </Button>
        <Text variant="caption" color={colors.mutedForeground}>
          If you choose Not now, {dr} isn’t told. The request expires {expiresOn}.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing * 4 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing * 3 },
  flex: { flex: 1 },
  circle48: {
    width: 48,
    height: 48,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  circle32: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
});
