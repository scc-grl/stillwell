import { useEffect, useRef, useState, type FormEvent } from "react";
import { useUser } from "@clerk/react";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Input } from "@workspace/stillwell-design-system/components/ui/input";
import { ErrorLine } from "@/components/care-link/parts";
import { OFFLINE_MESSAGE, isOffline, isValidEmail, normalizeEmail } from "@/lib/care-link";

type ClerkUser = NonNullable<ReturnType<typeof useUser>["user"]>;
type EmailAddress = ClerkUser["emailAddresses"][number];

const COOLDOWN_SECONDS = 30;

/**
 * Real Clerk add-and-verify, or verify an address already on the account.
 * Holds the exact resource Clerk returns; never logs Clerk errors or emails.
 * Nothing is shared or accepted here: the caller re-checks afterwards.
 */
export function EmailVerification({
  variant,
  initialEmail = "",
  autoSend = false,
  headingless = false,
  onVerified,
  onCancel,
}: {
  variant: "invite" | "request";
  initialEmail?: string;
  /** Send a code to `initialEmail` once on mount (own unverified address). */
  autoSend?: boolean;
  /** The surrounding card already shows the step heading. */
  headingless?: boolean;
  onVerified: () => void;
  onCancel?: () => void;
}) {
  const { user } = useUser();
  const [email, setEmail] = useState(initialEmail);
  const [emailError, setEmailError] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const addressRef = useRef<EmailAddress | null>(null);
  const ownerRef = useRef<string | null>(user?.id ?? null);
  const mounted = useRef(true);
  const autoSent = useRef(false);
  const submittedCode = useRef<string | null>(null);
  const onVerifiedRef = useRef(onVerified);
  onVerifiedRef.current = onVerified;
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // Account changed underneath: drop any in-progress verification.
  useEffect(() => {
    if (ownerRef.current !== (user?.id ?? null)) {
      ownerRef.current = user?.id ?? null;
      addressRef.current = null;
      setSentTo(null);
      setCode("");
    }
  }, [user?.id]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (sentTo) codeInputRef.current?.focus();
  }, [sentTo]);

  const invalidEmail = variant === "request" ? "Enter a valid email address." : "Enter the full email address, like name@clinic.org.";
  const waitLabel = variant === "request" ? "Please wait…" : null;
  const live = () => mounted.current && ownerRef.current === (user?.id ?? null);

  async function sendCode(target: string) {
    if (!user) {
      setError("Your session changed. Sign in again and retry.");
      return;
    }
    setError("");
    if (isOffline()) { setError(OFFLINE_MESSAGE); return; }
    setBusy(true);
    try {
      const wanted = normalizeEmail(target);
      let address = addressRef.current && normalizeEmail(addressRef.current.emailAddress) === wanted
        ? addressRef.current
        : user.emailAddresses.find((item) => normalizeEmail(item.emailAddress) === wanted) ?? null;
      if (address?.verification?.status === "verified") {
        if (live()) onVerifiedRef.current();
        return;
      }
      if (!address) address = await user.createEmailAddress({ email: target.trim() });
      if (!live()) return;
      const prepared = await address.prepareVerification({ strategy: "email_code" });
      if (!live()) return;
      addressRef.current = prepared ?? address;
      submittedCode.current = null;
      setCode("");
      setSentTo(addressRef.current.emailAddress);
      setCooldown(COOLDOWN_SECONDS);
    } catch {
      if (live()) setError("We couldn’t send a code to that email. Check it and try again.");
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  async function verify(value: string) {
    const address = addressRef.current;
    if (!address || !user) {
      setSentTo(null);
      setError("We couldn’t find that email on your account. Send a new code and try again.");
      return;
    }
    if (busy || submittedCode.current === value) return;
    if (isOffline()) { setError(OFFLINE_MESSAGE); return; }
    submittedCode.current = value;
    setError("");
    setBusy(true);
    try {
      const result = await address.attemptVerification({ code: value });
      if (result.verification?.status !== "verified") throw new Error("unverified");
      await user.reload();
      if (live()) onVerifiedRef.current();
    } catch {
      if (live()) setError("That code could not be verified. Check it or request a new one.");
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  useEffect(() => {
    if (!autoSend || autoSent.current || !initialEmail || !user) return;
    autoSent.current = true;
    void sendCode(initialEmail);
  // Auto-send runs once for the account's own unverified address.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSend, initialEmail, user]);

  function submitEmail(event: FormEvent) {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setEmailError(invalidEmail);
      return;
    }
    setEmailError("");
    void sendCode(email);
  }

  function submitCode(event: FormEvent) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from the email.");
      return;
    }
    void verify(code);
  }

  if (!sentTo) {
    if (autoSend && (busy || !error)) {
      return <p role="status" className="text-sm text-muted-foreground" data-testid="status-sending-code">Sending a code…</p>;
    }
    return <form className="space-y-3 rounded-xl border border-border p-4" onSubmit={submitEmail} noValidate data-testid="form-add-email">
      <h2 className="text-base font-semibold text-foreground">Add and verify this email</h2>
      <label htmlFor="verify-email" className="block text-sm font-medium text-foreground">Email</label>
      <Input id="verify-email" type="email" autoComplete="email" spellCheck={false} value={email}
        onChange={(event) => setEmail(event.target.value)}
        onBlur={() => setEmailError(email && !isValidEmail(email) ? invalidEmail : "")}
        aria-invalid={Boolean(emailError)} aria-describedby={emailError ? "verify-email-error" : undefined}
        className="min-h-12" data-testid="input-add-email" />
      {emailError ? <p id="verify-email-error" className="text-sm text-destructive">{emailError}</p> : null}
      <ErrorLine>{error}</ErrorLine>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" disabled={busy} data-testid="button-send-code">{busy ? waitLabel ?? "Sending…" : "Send code"}</Button>
        {onCancel ? <Button type="button" variant={variant === "request" ? "secondary" : "ghost"} disabled={busy} onClick={onCancel} data-testid="button-cancel-verify">Cancel</Button> : null}
      </div>
    </form>;
  }

  return <form className="space-y-3 rounded-xl border border-border p-4" onSubmit={submitCode} noValidate data-testid="form-verify-code">
    {variant === "invite" ? <>
      {headingless ? null : <h2 className="text-base font-semibold text-foreground">Confirm your email to accept</h2>}
      <p className="text-sm leading-6 text-muted-foreground">We sent a 6-digit code to <span className="font-semibold text-foreground">{sentTo}</span>. Enter it to confirm this email is yours.</p>
    </> : <>
      <h2 className="text-base font-semibold text-foreground">Enter your code</h2>
      <p className="text-sm leading-6 text-muted-foreground">We sent a verification code to that email address.</p>
    </>}
    <label htmlFor="verify-code" className="block text-sm font-medium text-foreground">6-digit code</label>
    <Input id="verify-code" ref={codeInputRef} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6}
      value={code} disabled={busy}
      onChange={(event) => {
        const next = event.target.value.replace(/\D/g, "").slice(0, 6);
        setCode(next);
        if (next.length === 6) void verify(next);
      }}
      className="min-h-12 text-lg tracking-widest" data-testid="input-verify-code" />
    <ErrorLine>{error}</ErrorLine>
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <Button type="submit" disabled={busy} data-testid="button-confirm-code">
        {busy ? waitLabel ?? "Checking…" : variant === "invite" ? "Confirm and accept" : "Verify email"}
      </Button>
      <Button type="button" variant="outline" disabled={busy || cooldown > 0} onClick={() => void sendCode(sentTo)} data-testid="button-resend-code">
        {cooldown > 0 && variant === "invite" ? `Send a new code (${cooldown}s)` : "Send a new code"}
      </Button>
      {onCancel ? <Button type="button" variant={variant === "request" ? "secondary" : "ghost"} disabled={busy} onClick={onCancel} data-testid="button-cancel-verify">Cancel</Button> : null}
    </div>
  </form>;
}
