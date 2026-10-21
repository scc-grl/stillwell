import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  useColorScheme,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useActionSheet } from "@expo/react-native-action-sheet";
import { useUser } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";
import type {
  CareTeamList,
  CreatePatientCareInvite201,
} from "@workspace/api-client-react";
import { Button, type ButtonHandle } from "@workspace/stillwell-design-system/components/native/button";
import { Card } from "@workspace/stillwell-design-system/components/native/card";
import { Text } from "@workspace/stillwell-design-system/components/native/text";
import { useColors } from "@workspace/stillwell-design-system/hooks/use-colors";
import { resendState, useCareTeam } from "@/hooks/useCareTeam";
import { spacing } from "@/lib/layout";
import { ensureOnline } from "@/lib/network";
import {
  CARE_TEAM_LIMIT,
  OFFLINE_MESSAGE,
  UNDO_WINDOW_MS,
  errorCode,
  fullName,
  isOffline,
  normalizeEmail,
} from "@/lib/care-team";
import { CareTeamRow, statusLine, type CareTeamEntry } from "./CareTeamRow";
import { InviteSheet } from "./InviteSheet";
import { Toast, useConfirm, useToast } from "./feedback";

type PreviewLink = { name: string; link: string };

function failureMessage(error: unknown, fallback: string) {
  if (isOffline(error)) return OFFLINE_MESSAGE;
  const code = errorCode(error);
  if (code === "resend_cooldown") return "You can resend this invite in a few minutes.";
  if (code === "daily_limit") return "You've sent 10 invites today. You can resend tomorrow.";
  if (code === "care_team_full") return "You can share with up to 5 clinicians. Remove one to invite someone new.";
  if (code === "already_invited" || code === "already_connected") return "You've already invited this email.";
  if (code === "undo_expired") return "The Undo period has ended. Your invite is still cancelled.";
  return fallback;
}

export function CareTeamCard() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const actionSheetTheme = {
    userInterfaceStyle: colorScheme === "dark" ? ("dark" as const) : ("light" as const),
    tintColor: colors.foreground,
    cancelButtonTintColor: colors.primary,
    destructiveColor: colors.destructive,
    containerStyle: { backgroundColor: colors.card, borderTopLeftRadius: colors.radius, borderTopRightRadius: colors.radius },
    textStyle: { fontFamily: colors.fonts.body },
    titleTextStyle: { color: colors.foreground, fontFamily: colors.fonts.display },
    messageTextStyle: { color: colors.mutedForeground, fontFamily: colors.fonts.body },
  };
  const queryClient = useQueryClient();
  const { user } = useUser();
  const { showActionSheetWithOptions } = useActionSheet();
  const { confirm, element: confirmElement } = useConfirm();
  const { toast, show: showToast, clear: clearToast } = useToast();
  const team = useCareTeam();
  const { query, now } = team;
  const data = query.data as CareTeamList | undefined;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [preview, setPreview] = useState<PreviewLink | null>(null);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const inviteButtonRef = useRef<ButtonHandle>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (focusTimer.current) clearTimeout(focusTimer.current);
    };
  }, []);

  const entries = useMemo<CareTeamEntry[]>(() => {
    if (!data) return [];
    const pending = [...data.pendingInvites]
      .sort((a, b) => b.sentAt.localeCompare(a.sentAt))
      .map((invite) => ({
        kind: "pending" as const,
        id: invite.id,
        name: fullName(invite),
        email: invite.email,
        sentAt: invite.lastResendAt ?? invite.sentAt,
        expiresAt: invite.expiresAt,
        lastResendAt: invite.lastResendAt,
      }));
    const active = data.activeClinicians.map((clinician) => ({
      kind: "active" as const,
      id: clinician.id,
      name: clinician.name,
      connectedAt: clinician.connectedAt,
    }));
    const expired = data.expiredInvites.map((invite) => ({
      kind: "expired" as const,
      id: invite.id,
      name: fullName(invite),
      email: invite.email,
      sentAt: invite.sentAt,
      expiresAt: invite.expiresAt,
      lastResendAt: invite.lastResendAt,
    }));
    return [...pending, ...active, ...expired];
  }, [data]);

  const quota = data?.inviteEmailQuota;
  const shareCount =
    (data?.pendingInvites.length ?? 0) + (data?.activeClinicians.length ?? 0);
  const atLimit = shareCount >= CARE_TEAM_LIMIT;
  const ownEmails = useMemo(
    () => (user?.emailAddresses ?? []).map((e) => normalizeEmail(e.emailAddress)),
    [user?.emailAddresses],
  );
  const activeEmails: string[] = []; // API does not expose clinician emails.

  function focusInviteButton() {
    if (focusTimer.current) clearTimeout(focusTimer.current);
    focusTimer.current = setTimeout(() => {
      if (!mounted.current) return;
      inviteButtonRef.current?.focus();
    }, 350);
  }

  function handleDelivery(
    result: { suppressed: boolean; developmentLink?: string },
    name: string,
    liveText: string,
  ) {
    if (result.suppressed) {
      showToast({ text: "Preview invite created, no email sent" });
      setPreview(
        result.developmentLink ? { name, link: result.developmentLink } : null,
      );
    } else {
      setPreview(null);
      showToast({ text: liveText });
    }
  }

  function onSent(result: CreatePatientCareInvite201) {
    setSheetOpen(false);
    setActionError("");
    queryClient.setQueryData<CareTeamList>(team.queryKey, (current) =>
      current
        ? {
            ...current,
            pendingInvites: [
              result.invite,
              ...current.pendingInvites.filter((i) => i.id !== result.invite.id),
            ],
          }
        : current,
    );
    void team.refresh();
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    handleDelivery(
      result,
      fullName(result.invite),
      `Invite sent to ${result.invite.email}`,
    );
    focusInviteButton();
  }

  async function run<T>(action: () => Promise<T>, fallback: string) {
    setActionError("");
    setBusy(true);
    try {
      await ensureOnline();
      return await action();
    } catch (error) {
      if (mounted.current) setActionError(failureMessage(error, fallback));
      return undefined;
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  async function resend(id: string, name: string) {
    const result = await run(
      () => team.resend.mutateAsync({ id }),
      "The invite didn’t resend. Check your connection and try again.",
    );
    void team.refresh();
    if (!result || !mounted.current) return;
    handleDelivery(result, name, "Invite resent");
  }

  async function cancelInvite(entry: CareTeamEntry, undoable: boolean) {
    const ok = await run(
      async () => {
        await team.cancel.mutateAsync({ id: entry.id });
        return true;
      },
      undoable
        ? "The invite couldn’t be cancelled. Try again."
        : "The invite couldn’t be removed. Try again.",
    );
    void team.refresh();
    if (!ok || !mounted.current) return;
    if (preview?.name === entry.name) setPreview(null);
    if (!undoable) {
      showToast({ text: "Invite removed" });
      return;
    }
    showToast({
      text: "Invite cancelled",
      durationMs: UNDO_WINDOW_MS,
      action: {
        label: "Undo",
        testID: "care-team-undo-cancel",
        onPress: () => void undoCancel(entry.id),
      },
    });
  }

  async function undoCancel(id: string) {
    const ok = await run(
      async () => {
        await team.undoCancel.mutateAsync({ id });
        return true;
      },
      "The invite couldn’t be restored. Try again.",
    );
    void team.refresh();
    if (ok && mounted.current) showToast({ text: "Invite restored" });
  }

  async function removeAccess(entry: CareTeamEntry) {
    const agreed = await confirm({
      title: `Remove ${entry.name}?`,
      message:
        "She’ll stop seeing new entries right away. She’ll keep what you’ve shared up to today. You can invite her again later.",
      cancelLabel: "Keep sharing",
      confirmLabel: "Remove access",
      testID: "remove-access-dialog",
    });
    if (!agreed) return;
    const ok = await run(
      async () => {
        await team.remove.mutateAsync({ id: entry.id });
        return true;
      },
      "Access couldn’t be removed. Check your connection and try again.",
    );
    void team.refresh();
    if (ok && mounted.current) {
      showToast({ text: `${entry.name} can no longer see new entries.` });
    }
  }

  function openOptions(entry: CareTeamEntry) {
    if (busy) return;
    if (entry.kind === "active") {
      showActionSheetWithOptions(
        {
          title: entry.name,
          ...actionSheetTheme,
          message: statusLine(entry, now),
          options: ["Remove access", "Close"],
          destructiveButtonIndex: 0,
          cancelButtonIndex: 1,
        },
        (index) => {
          if (index === 0) void removeAccess(entry);
        },
      );
      return;
    }
    const state = resendState(entry, quota, now);
    const resendLabel = state.available
      ? "Resend invite"
      : state.reason === "quota"
        ? "Resend available tomorrow"
        : `Resend available in ${state.minutes} minute${state.minutes === 1 ? "" : "s"}`;
    const sheetMessage =
      !state.available && state.reason === "quota"
        ? "You've sent 10 invites today. You can resend tomorrow."
        : statusLine(entry, now);
    const secondLabel = entry.kind === "pending" ? "Cancel invite" : "Remove";
    showActionSheetWithOptions(
      {
        title: entry.name,
        ...actionSheetTheme,
        message: sheetMessage,
        options: [resendLabel, secondLabel, "Close"],
        destructiveButtonIndex: 1,
        cancelButtonIndex: 2,
        disabledButtonIndices: state.available ? [] : [0],
      },
      (index) => {
        if (index === 0 && state.available) void resend(entry.id, entry.name);
        if (index === 1) void cancelInvite(entry, entry.kind === "pending");
      },
    );
  }

  function resendInstead(id: string) {
    setSheetOpen(false);
    const entry = entries.find((e) => e.id === id);
    if (!entry || entry.kind === "active") return;
    const state = resendState(entry, quota, now);
    if (!state.available) {
      setActionError(
        state.reason === "quota"
          ? "You've sent 10 invites today. You can resend tomorrow."
          : `Resend available in ${state.minutes} minute${state.minutes === 1 ? "" : "s"}.`,
      );
      return;
    }
    void resend(entry.id, entry.name);
  }

  const inviteButton = (
    <Button
      ref={inviteButtonRef}
      tone={entries.length === 0 ? "primary" : "outline"}
      disabled={atLimit || busy}
      onPress={() => {
        setActionError("");
        setSheetOpen(true);
      }}
      leading={
        <Ionicons
          name="person-add-outline"
          size={18}
          color={entries.length === 0 ? colors.primaryForeground : colors.secondaryForeground}
        />
      }
      testID="care-team-invite"
    >
      Invite a clinician
    </Button>
  );

  let body: ReactNode;
  if (query.isLoading || (!data && !query.isError)) {
    body = (
      <View accessibilityLabel="Loading your care team" style={styles.list}>
        {[0, 1].map((i) => (
          <View key={i} style={styles.skeletonRow}>
            <View style={[styles.skeletonLine, { width: "55%", backgroundColor: colors.muted }]} />
            <View style={[styles.skeletonLine, { width: "35%", backgroundColor: colors.muted }]} />
          </View>
        ))}
      </View>
    );
  } else if (query.isError || !data) {
    body = (
      <View style={styles.list} accessibilityRole="alert">
        <Text variant="caption">Your care team couldn’t load.</Text>
        <Button tone="outline" onPress={() => void query.refetch()} testID="care-team-retry">
          Try again
        </Button>
      </View>
    );
  } else if (entries.length === 0) {
    body = (
      <View style={styles.empty} testID="care-team-empty">
        <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
          <Ionicons name="people-outline" size={26} color={colors.primary} />
        </View>
        <Text variant="heading" accessibilityRole="header">
          Your care team
        </Text>
        <Text variant="body" color={colors.mutedForeground}>
          Share your journal with a clinician you already see. They can read it;
          only you can change it. Remove access anytime.
        </Text>
        {inviteButton}
      </View>
    );
  } else {
    body = (
      <>
        <Text variant="heading" accessibilityRole="header">
          Your care team
        </Text>
        <View testID="care-team-list">
          {entries.map((entry) => (
            <CareTeamRow key={`${entry.kind}-${entry.id}`} entry={entry} now={now} onOptions={openOptions} />
          ))}
        </View>
        {atLimit ? (
          <View
            testID="care-team-limit"
            style={[styles.note, { backgroundColor: colors.secondary, borderRadius: colors.radius }]}
          >
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            <Text variant="caption" color={colors.secondaryForeground} style={styles.flex}>
              You can share with up to 5 clinicians. Remove one to invite someone new.
            </Text>
          </View>
        ) : null}
        {inviteButton}
          <Text variant="caption" color={colors.mutedForeground}>
            Up to 5 clinicians. They can read your journal, not change it.
          </Text>
      </>
    );
  }

  return (
    <Card testID="care-team-card">
      {body}
      {preview ? (
        <View
          testID="care-team-preview"
          style={[styles.preview, { borderColor: colors.border, borderRadius: colors.radius }]}
        >
          <View style={styles.previewHeader}>
            <Ionicons name="flask-outline" size={18} color={colors.mutedForeground} />
            <Text variant="label" style={styles.flex}>
              Private preview: no email was sent
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Hide preview link"
              onPress={() => setPreview(null)}
              testID="care-team-preview-dismiss"
              style={styles.iconButton}
            >
              <Ionicons name="close" size={18} color={colors.foreground} />
            </Pressable>
          </View>
          <Text variant="caption" color={colors.mutedForeground}>
            Email delivery isn’t set up here, so {preview.name} wasn’t emailed. This
            development link carries the invite token for testing the invite
            acceptance API; there is no invite page to open yet. Don’t share it.
          </Text>
          <Text variant="caption" selectable testID="care-team-dev-link">
            {preview.link}
          </Text>
        </View>
      ) : null}
      {actionError ? (
        <Text
          variant="caption"
          color={colors.destructive}
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
          testID="care-team-error"
        >
          {actionError}
        </Text>
      ) : null}
      <Toast toast={toast} onDismiss={clearToast} />
      <InviteSheet
        visible={sheetOpen}
        ownEmails={ownEmails}
        pendingInvites={data?.pendingInvites ?? []}
        activeEmails={activeEmails}
        onClose={() => {
          setSheetOpen(false);
          focusInviteButton();
        }}
        onSubmit={(values) =>
          team.create
            .mutateAsync({ data: { ...values, consentAccepted: true } })
            .catch((error: unknown) => {
              void team.refresh(); // pick up server quota / full state
              throw error;
            })
        }
        onSent={onSent}
        onResendInstead={resendInstead}
      />
      {confirmElement}
    </Card>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing * 3 },
  skeletonRow: { gap: spacing * 2, paddingVertical: spacing * 2 },
  skeletonLine: { height: 14, borderRadius: 999 },
  empty: { gap: spacing * 3, alignItems: "flex-start" },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  note: { flexDirection: "row", gap: spacing * 2, padding: spacing * 3, alignItems: "flex-start" },
  flex: { flex: 1 },
  fullWidth: { width: "100%" },
  preview: { borderWidth: 1, borderStyle: "dashed", padding: spacing * 3, gap: spacing * 2 },
  previewHeader: { flexDirection: "row", alignItems: "center", gap: spacing * 2 },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
});
