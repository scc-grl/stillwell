import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@clerk/expo";
import type { Href } from "expo-router";
import * as Linking from "expo-linking";
import { requestTokenFromLink } from "@/lib/care-request";

/**
 * Memory-only share-request state. Never written to AsyncStorage/SecureStore
 * and never logged. Lost on app restart by design; the email link reopens it.
 */
export type InvitePrefill = { firstName: string; lastName: string; email: string };

type PendingRequestValue = {
  token: string | null;
  /** Email the patient typed on the signed-out request screen. */
  emailPrefill: string;
  /** Set by the quiz after a first save so the request shows "journal ready". */
  readyHandoff: boolean;
  /** Patient left a full care team to remove someone; offer a way back. */
  returnToRequest: boolean;
  invitePrefill: InvitePrefill | null;
  /** Install from the route unless the patient already exited this token. */
  setToken: (token: string) => void;
  /** Explicit fresh open of a link (e.g. deep link); re-allows an exited token. */
  claimToken: (token: string) => void;
  /** True when the patient exited this token and no fresh link reopened it. */
  wasExited: (token: string) => boolean;
  /** Clears state; the exited token is not reinstalled by the route. */
  setEmailPrefill: (email: string) => void;
  setReadyHandoff: (value: boolean) => void;
  setReturnToRequest: (value: boolean) => void;
  setInvitePrefill: (value: InvitePrefill | null) => void;
  /** Explicit account switch: keep only the token across the next sign-out. */
  preserveTokenForSwitch: () => void;
  clear: (onlyToken?: string) => void;
};

const PendingRequestContext = createContext<PendingRequestValue | null>(null);

export function PendingRequestProvider({ children }: { children: ReactNode }) {
  const { isLoaded, userId } = useAuth();
  const [token, setTokenState] = useState<string | null>(null);
  const [emailPrefill, setEmailPrefill] = useState("");
  const [readyHandoff, setReadyHandoff] = useState(false);
  const [returnToRequest, setReturnToRequest] = useState(false);
  const [invitePrefill, setInvitePrefill] = useState<InvitePrefill | null>(null);
  const switching = useRef(false);
  const previousUser = useRef<string | null | undefined>(undefined);

  const clear = useCallback((onlyToken?: string) => {
    // A late async completion for an old request must not clear a newer one.
    if (onlyToken !== undefined && tokenRef.current !== onlyToken) return;
    if (tokenRef.current) exited.current.add(tokenRef.current);
    tokenRef.current = null;
    setTokenState(null);
    setEmailPrefill("");
    setReadyHandoff(false);
    setReturnToRequest(false);
    setInvitePrefill(null);
    switching.current = false;
  }, []);

  // Tokens the patient deliberately exited (Not now, Go to today, cancel).
  // The route's mount effect must not silently reinstall them; only a fresh
  // open of the link (claimToken) does.
  const exited = useRef<Set<string>>(new Set());
  const tokenRef = useRef<string | null>(null);

  const install = useCallback((next: string) => {
    if (tokenRef.current !== next) {
      // Different request: drop anything derived from the previous recipient.
      setEmailPrefill("");
      setInvitePrefill(null);
      setReadyHandoff(false);
      setReturnToRequest(false);
    }
    tokenRef.current = next;
    setTokenState(next);
  }, []);

  const setToken = useCallback(
    (next: string) => {
      if (exited.current.has(next)) return;
      install(next);
    },
    [install],
  );

  const claimToken = useCallback(
    (next: string) => {
      exited.current.delete(next);
      install(next);
    },
    [install],
  );

  // A newly opened link is an explicit request to review it again, even if
  // the patient exited that token earlier in this session.
  const url = Linking.useURL();
  useEffect(() => {
    if (!url) return;
    const candidate = requestTokenFromLink(url);
    if (candidate) claimToken(candidate);
  }, [claimToken, url]);

  const wasExited = useCallback((t: string) => exited.current.has(t), []);

  const preserveTokenForSwitch = useCallback(() => {
    switching.current = true;
  }, []);

  // Signing in from signed-out keeps the request. Any other account change
  // (logout, a different account) clears it unless the patient explicitly
  // chose to switch accounts from the request, which keeps only the token.
  useEffect(() => {
    if (!isLoaded) return;
    const current = userId ?? null;
    const previous = previousUser.current;
    previousUser.current = current;
    if (previous === undefined || previous === current || previous === null) return;
    if (switching.current) {
      switching.current = false;
      setEmailPrefill("");
      setReadyHandoff(false);
      setReturnToRequest(false);
      setInvitePrefill(null);
      return;
    }
    clear();
  }, [clear, isLoaded, userId]);

  const value = useMemo<PendingRequestValue>(
    () => ({
      token,
      emailPrefill,
      readyHandoff,
      returnToRequest,
      invitePrefill,
      setToken,
      claimToken,
      wasExited,
      setEmailPrefill,
      setReadyHandoff,
      setReturnToRequest,
      setInvitePrefill,
      preserveTokenForSwitch,
      clear,
    }),
    [
      token,
      emailPrefill,
      readyHandoff,
      returnToRequest,
      invitePrefill,
      setToken,
      claimToken,
      wasExited,
      preserveTokenForSwitch,
      clear,
    ],
  );

  return (
    <PendingRequestContext.Provider value={value}>
      {children}
    </PendingRequestContext.Provider>
  );
}

export function usePendingRequest() {
  const value = useContext(PendingRequestContext);
  if (!value) throw new Error("PendingRequestProvider is required.");
  return value;
}

/** Canonical route for a request; the only URL that carries the token. */
export function requestHref(token: string) {
  return `/request/${encodeURIComponent(token)}` as Href;
}
