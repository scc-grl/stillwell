import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@workspace/stillwell-design-system/components/native/button";
import { Card } from "@workspace/stillwell-design-system/components/native/card";
import { Text } from "@workspace/stillwell-design-system/components/native/text";
import { useColors } from "@workspace/stillwell-design-system/hooks/use-colors";
import { spacing } from "@/lib/layout";
import { TOAST_MS } from "@/lib/care-team";

/* ---------------------------------------------------------------- Toast */

export type ToastMessage = {
  id: number;
  text: string;
  action?: { label: string; onPress: () => void; testID?: string };
  durationMs?: number;
};

export function useToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counter = useRef(0);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setToast(null);
  }, []);

  const show = useCallback((message: Omit<ToastMessage, "id">) => {
    if (timer.current) clearTimeout(timer.current);
    counter.current += 1;
    const next = { ...message, id: counter.current };
    setToast(next);
    AccessibilityInfo.announceForAccessibility(message.text);
    timer.current = setTimeout(() => {
      timer.current = null;
      setToast((current) => (current?.id === next.id ? null : current));
    }, message.durationMs ?? TOAST_MS);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return { toast, show, clear };
}

export function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastMessage | null;
  onDismiss: () => void;
}) {
  const colors = useColors();
  if (!toast) return null;
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole={Platform.OS === "web" ? undefined : "alert"}
      aria-live="polite"
      testID="care-team-toast"
      style={[
        styles.toast,
        { backgroundColor: colors.foreground, borderRadius: colors.radius },
      ]}
    >
      <Text variant="label" color={colors.background} style={styles.toastText}>
        {toast.text}
      </Text>
      {toast.action ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            toast.action?.onPress();
            onDismiss();
          }}
          testID={toast.action.testID ?? "care-team-toast-action"}
          style={styles.toastAction}
        >
          <Text variant="label" color={colors.background}>
            {toast.action.label}
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss message"
        onPress={onDismiss}
        testID="care-team-toast-dismiss"
        style={styles.toastAction}
      >
        <Ionicons name="close" size={18} color={colors.background} />
      </Pressable>
    </View>
  );
}

/* -------------------------------------------------------------- Confirm */

export type ConfirmOptions = {
  title: string;
  message: string;
  cancelLabel: string;
  confirmLabel: string;
  testID?: string;
};

type PendingConfirm = ConfirmOptions & { resolve: (ok: boolean) => void };

/**
 * Native: real Alert with cancel as default. Web: accessible dialog, because
 * react-native-web's Alert.alert is a no-op.
 */
export function useConfirm() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        if (Platform.OS !== "web") {
          Alert.alert(
            options.title,
            options.message,
            [
              {
                text: options.cancelLabel,
                style: "cancel",
                isPreferred: true,
                onPress: () => resolve(false),
              },
              {
                text: options.confirmLabel,
                style: "destructive",
                onPress: () => resolve(true),
              },
            ],
            { cancelable: true, onDismiss: () => resolve(false) },
          );
          return;
        }
        setPending({ ...options, resolve });
      }),
    [],
  );

  const finish = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  const element = pending ? (
    <ConfirmDialog options={pending} onFinish={finish} />
  ) : null;

  return { confirm, element };
}

function ConfirmDialog({
  options,
  onFinish,
}: {
  options: ConfirmOptions;
  onFinish: (ok: boolean) => void;
}) {
  const colors = useColors();
  return (
    <Modal transparent visible animationType="none" onRequestClose={() => onFinish(false)}>
      <View style={[styles.scrim, { backgroundColor: `${colors.foreground}66` }]}>
        <Card
          accessibilityViewIsModal
          role="alertdialog"
          aria-modal
          aria-label={options.title}
          testID={options.testID ?? "confirm-dialog"}
          style={styles.dialog}
        >
          <Text variant="heading" accessibilityRole="header">
            {options.title}
          </Text>
          <Text variant="body" color={colors.mutedForeground}>
            {options.message}
          </Text>
          <Button
            tone="outline"
            onPress={() => onFinish(false)}
            testID="confirm-dialog-cancel"
          >
            {options.cancelLabel}
          </Button>
          <Button
            tone="destructive"
            onPress={() => onFinish(true)}
            testID="confirm-dialog-confirm"
          >
            {options.confirmLabel}
          </Button>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing * 2,
    paddingLeft: spacing * 4,
    paddingRight: spacing,
    minHeight: 48,
  },
  toastText: { flex: 1, paddingVertical: spacing * 3 },
  toastAction: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing * 2,
  },
  scrim: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing * 5,
  },
  dialog: { width: "100%", maxWidth: 420 },
});
