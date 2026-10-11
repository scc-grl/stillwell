import type { AccountType } from "@workspace/api-client-react";

const REGISTRATION_INTENT_KEY = "stillwell.account-registration-intent";
const ACCOUNT_CHOICE_KEY = "stillwell.account-type-choice";

export function rememberAccountChoice(accountType: AccountType): void {
  try {
    sessionStorage.setItem(ACCOUNT_CHOICE_KEY, accountType);
  } catch {
    // The chooser remains usable if session storage is unavailable.
  }
}

export function readAccountChoice(): AccountType | null {
  try {
    const value = sessionStorage.getItem(ACCOUNT_CHOICE_KEY);
    return value === "patient" || value === "clinician" ? value : null;
  } catch {
    return null;
  }
}

export function clearAccountChoice(): void {
  try {
    sessionStorage.removeItem(ACCOUNT_CHOICE_KEY);
  } catch {
    // Storage may be unavailable in restricted browser contexts.
  }
}

export function storeRegistrationIntent(token: string): boolean {
  try {
    localStorage.setItem(REGISTRATION_INTENT_KEY, token);
    return true;
  } catch {
    return false;
  }
}

export function readRegistrationIntent(): string | null {
  try {
    return localStorage.getItem(REGISTRATION_INTENT_KEY);
  } catch {
    return null;
  }
}

export function clearRegistrationIntent(): void {
  try {
    localStorage.removeItem(REGISTRATION_INTENT_KEY);
  } catch {
    // Storage may be unavailable in restricted browser contexts.
  }
}
