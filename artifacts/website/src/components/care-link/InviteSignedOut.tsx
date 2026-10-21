import { useState, type FormEvent } from "react";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card } from "@workspace/stillwell-design-system/components/ui/card";
import { Input } from "@workspace/stillwell-design-system/components/ui/input";
import { Brand } from "@/components/PublicSite";
import { Eyebrow, useNoReferrer, useSystemDark } from "@/components/care-link/parts";
import { cn } from "@/lib/utils";
import { isValidEmail } from "@/lib/care-link";

/** Signed-out /invite/:token — two columns on desktop, one on phones. */
export function InviteSignedOut({
  firstName,
  maskedEmail,
  expiresOn,
  onContinue,
  onCreateAccount,
}: {
  firstName: string;
  maskedEmail: string;
  expiresOn: string;
  onContinue: (email: string) => void;
  onCreateAccount: () => void;
}) {
  useNoReferrer();
  const dark = useSystemDark();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const invalid = "Enter the full email address this invite was sent to.";

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setError(invalid);
      return;
    }
    setError("");
    onContinue(email.trim());
  }

  return <div className={cn("grid min-h-[100dvh] bg-background text-foreground md:grid-cols-2", dark && "dark")}>
    <section className="flex flex-col gap-10 bg-secondary px-5 py-8 sm:px-10 md:py-12 lg:px-16" aria-labelledby="invite-title">
      <Brand />
      <div className="max-w-xl space-y-5 md:my-auto">
        <Eyebrow>An invite for you</Eyebrow>
        <h1 id="invite-title" className="font-serif text-4xl font-medium leading-tight sm:text-5xl" data-testid="text-invite-title">
          {firstName} invited you to view their recovery journal
        </h1>
        <p className="text-base leading-7 text-secondary-foreground">
          Stillwell is a private, self-guided recovery journal. {firstName} has chosen to share theirs with you.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="space-y-2 p-5">
            <h2 className="text-sm font-semibold">You’ll see</h2>
            <p className="text-sm leading-6 text-muted-foreground">Daily symptom ratings (0–10), routine logs, notes and focus areas, including past entries.</p>
          </Card>
          <Card className="space-y-2 p-5">
            <h2 className="text-sm font-semibold">You can’t</h2>
            <p className="text-sm leading-6 text-muted-foreground">Edit anything. {firstName} can remove your access at any time.</p>
          </Card>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">Patient-reported, not a clinical record. This invite expires {expiresOn}.</p>
      </div>
    </section>
    <section className="flex items-center justify-center px-5 py-10 sm:px-10" aria-labelledby="invite-sign-in">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2">
          <h2 id="invite-sign-in" className="font-serif text-3xl font-medium">Sign in to accept</h2>
          <p className="text-sm leading-6 text-muted-foreground">Use the email this invite was sent to: <span className="font-semibold text-foreground">{maskedEmail}</span></p>
        </div>
        <form className="space-y-3" onSubmit={submit} noValidate>
          <label htmlFor="invite-email" className="block text-sm font-medium">Email</label>
          <Input id="invite-email" type="email" autoComplete="email" spellCheck={false} value={email}
            onChange={(event) => setEmail(event.target.value)}
            onBlur={() => setError(email && !isValidEmail(email) ? invalid : "")}
            aria-invalid={Boolean(error)} aria-describedby={error ? "invite-email-error" : undefined}
            className="min-h-12" data-testid="input-invite-email" />
          {error ? <p id="invite-email-error" role="alert" className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" data-testid="button-invite-continue">Continue</Button>
        </form>
        <div className="flex items-center gap-3" role="separator" aria-label="New to Stillwell?">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium text-muted-foreground">New to Stillwell?</span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <div className="space-y-2">
          <Button type="button" variant="outline" className="w-full" onClick={onCreateAccount} data-testid="button-invite-create-account">Create a clinician account</Button>
          <p className="text-center text-xs text-muted-foreground">Your invite stays attached while you sign up.</p>
        </div>
      </div>
    </section>
  </div>;
}
