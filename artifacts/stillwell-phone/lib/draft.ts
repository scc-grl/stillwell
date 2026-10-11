import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { RecoveryStartInput } from "@workspace/api-client-react";
import { StartRecoveryBody } from "@workspace/api-zod";

const DRAFT_KEY = "stillwell.mobile.consented-setup.v1";
const DRAFT_TTL_MS = 30 * 60 * 1000;

type DraftEnvelope = {
  createdAt: number;
  ownerId: string | null;
  payload: RecoveryStartInput;
};

let pendingPatientSignup = false;
let webDraft: string | null = null;

async function getStoredValue() {
  return Platform.OS === "web"
    ? webDraft
    : SecureStore.getItemAsync(DRAFT_KEY);
}

async function setStoredValue(value: string | null) {
  if (Platform.OS === "web") {
    webDraft = value;
    return;
  }
  if (value === null) {
    await SecureStore.deleteItemAsync(DRAFT_KEY);
  } else {
    await SecureStore.setItemAsync(DRAFT_KEY, value);
  }
}

export function setPendingPatientSignup(value: boolean) {
  pendingPatientSignup = value;
}

export function isPendingPatientSignup() {
  return pendingPatientSignup;
}

export async function clearConsentedDraft() {
  await setStoredValue(null);
}

async function readEnvelope(): Promise<DraftEnvelope | null> {
  const raw = await getStoredValue();
  if (!raw) return null;

  try {
    const value = JSON.parse(raw) as DraftEnvelope;
    const parsed = StartRecoveryBody.safeParse(value.payload);
    if (
      !Number.isFinite(value.createdAt) ||
      value.createdAt > Date.now() ||
      Date.now() - value.createdAt >= DRAFT_TTL_MS ||
      !parsed.success ||
      parsed.data.consentAccepted !== true
    ) {
      await clearConsentedDraft();
      return null;
    }
    return { ...value, payload: parsed.data };
  } catch {
    await clearConsentedDraft();
    return null;
  }
}

export async function saveConsentedDraft(
  payload: RecoveryStartInput,
  ownerId: string | null,
) {
  const parsed = StartRecoveryBody.parse(payload);
  if (parsed.consentAccepted !== true) {
    throw new Error("Storage consent is required before saving a setup draft.");
  }
  const envelope: DraftEnvelope = {
    createdAt: Date.now(),
    ownerId,
    payload: parsed,
  };
  await setStoredValue(JSON.stringify(envelope));
}

export async function hasConsentedDraftForWelcome(): Promise<boolean> {
  const envelope = await readEnvelope();
  return envelope?.ownerId === null;
}

export async function readConsentedDraftForUser(
  userId: string | null,
  allowSignupHandoff: boolean,
): Promise<RecoveryStartInput | null> {
  const envelope = await readEnvelope();
  if (!envelope) return null;

  if (userId && envelope.ownerId === userId) return envelope.payload;
  if (!userId && envelope.ownerId === null) return envelope.payload;

  if (userId && envelope.ownerId === null && allowSignupHandoff) {
    await setStoredValue(
      JSON.stringify({ ...envelope, ownerId: userId }),
    );
    return envelope.payload;
  }

  await clearConsentedDraft();
  return null;
}
