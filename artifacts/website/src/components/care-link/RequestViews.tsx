import { useState, type FormEvent, type ReactNode } from "react";
import { Check, CheckCircle2, Info, Leaf } from "lucide-react";
import type { CareRequestDetails } from "@workspace/api-client-react";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card } from "@workspace/stillwell-design-system/components/ui/card";
import { Input } from "@workspace/stillwell-design-system/components/ui/input";
import { ErrorLine, Eyebrow, IconCircle } from "@/components/care-link/parts";
import { formatLinkDate, initials } from "@/lib/care-link";

/** Pure presentational views for /request/:token. Copy matches the phone app. */

function Column({ children, testId }: { children: ReactNode; testId: string }) {
  return <div className="mx-auto w-full max-w-xl space-y-5 px-5 py-10 sm:px-8 sm:py-14" data-testid={testId}>{children}</div>;
}

function Title({ children }: { children: ReactNode }) {
  return <h1 className="font-serif text-4xl font-medium leading-tight">{children}</h1>;
}

function Body({ children }: { children: ReactNode }) {
  return <p className="text-base leading-7 text-secondary-foreground">{children}</p>;
}

export function SharedView({ dr, onToday, onCareTeam }: { dr: string; onToday: () => void; onCareTeam: () => void }) {
  return <Column testId="request-shared">
    <IconCircle icon={CheckCircle2} />
    <Title>You’re sharing with {dr}</Title>
    <Body>She can now read your journal. Nothing changes about how you use Stillwell.</Body>
    <Card className="flex items-center gap-3 p-5">
      <p className="flex-1 text-sm">Connected today · at her request</p>
      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground"><Check className="size-3.5" aria-hidden />Connected</span>
    </Card>
    <p className="text-xs text-muted-foreground">To stop sharing, go to Account → Your care team.</p>
    <div className="flex flex-col gap-3">
      <Button onClick={onToday} data-testid="button-request-go-today">Go to today</Button>
      <Button variant="outline" onClick={onCareTeam} data-testid="button-request-care-team">View your care team</Button>
    </div>
  </Column>;
}

export function NewPatientView({ dr, onStart, onHaveAccount }: { dr: string; onStart: () => void; onHaveAccount?: () => void }) {
  return <Column testId="request-new-patient">
    <Eyebrow>Share request</Eyebrow>
    <Title>{dr} asked you to share your journal</Title>
    <Body>First, set up your private Stillwell journal. It takes a couple of minutes, and you’ll decide about sharing at the end.</Body>
    <Card className="p-5">
      <ol className="space-y-3">
        {["A few starting questions", "Create your account", `Choose whether to share with ${dr}`].map((step, index) =>
          <li key={step} className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground" aria-hidden>{index + 1}</span>
            <span className="text-sm">{step}</span>
          </li>)}
      </ol>
    </Card>
    <div className="flex flex-col gap-3">
      <Button onClick={onStart} data-testid="button-request-get-started">Get started</Button>
      {onHaveAccount ? <Button variant="outline" onClick={onHaveAccount} data-testid="button-request-have-account">I already have an account</Button> : null}
    </div>
  </Column>;
}

export function SignedOutView({ dr, maskedEmail, onContinue, onNew }: {
  dr: string; maskedEmail: string; onContinue: (email: string) => void; onNew: () => void;
}) {
  const [email, setEmail] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    onContinue(email.trim());
  }
  return <Column testId="request-signed-out">
    <Eyebrow>Share request</Eyebrow>
    <Title>{dr} asked you to share your journal</Title>
    <Body>Sign in to review the request. Nothing is shared until you choose.</Body>
    <Card className="p-5">
      <form className="space-y-3" onSubmit={submit} noValidate>
        <label htmlFor="request-email" className="block text-sm font-medium">Email</label>
        <Input id="request-email" type="email" autoComplete="email" spellCheck={false} value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-describedby="request-email-hint"
          className="min-h-12" data-testid="input-request-email" />
        <p id="request-email-hint" className="text-xs text-muted-foreground">The request was sent to {maskedEmail}.</p>
        <Button type="submit" className="w-full" data-testid="button-request-continue">Continue</Button>
      </form>
    </Card>
    <Button variant="outline" onClick={onNew} data-testid="button-request-new">New to Stillwell? Set up your journal</Button>
  </Column>;
}

export function ReadyView({ dr, onReview, onToday }: { dr: string; onReview: () => void; onToday: () => void }) {
  return <Column testId="request-ready">
    <IconCircle icon={Leaf} />
    <Title>Your journal is ready</Title>
    <Body>Your first entry is saved and private to you.</Body>
    <Card className="space-y-2 border-secondary bg-secondary p-5 text-secondary-foreground">
      <Eyebrow>One more thing</Eyebrow>
      <h2 className="text-lg font-semibold">{dr} asked to see your journal</h2>
      <p className="text-sm leading-6">Review what she’d see, then decide. You can also do this later from the email.</p>
    </Card>
    <div className="flex flex-col gap-3">
      <Button onClick={onReview} data-testid="button-request-review">Review the request</Button>
      <Button variant="outline" onClick={onToday} data-testid="button-request-today">Go to today</Button>
    </div>
  </Column>;
}

export function ReviewView({ dr, request, busy, error, onShare, onNotNow }: {
  dr: string; request: CareRequestDetails; busy: boolean; error: string; onShare: () => void; onNotNow: () => void;
}) {
  const askedOn = formatLinkDate(request.requestedAt);
  const expiresOn = formatLinkDate(request.expiresAt);
  return <Column testId="request-review">
    <Eyebrow>Share request</Eyebrow>
    <Title>Share your journal with {dr}?</Title>
    <Card className="p-5">
      {/* Name, email and date are announced as one unit. */}
      <div role="group" aria-label={`${request.clinicianName}, ${request.clinicianEmail}, asked ${askedOn}`} className="flex items-center gap-3" data-testid="request-clinician-card">
        <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">{initials(request.clinicianName)}</span>
        <div aria-hidden className="min-w-0 flex-1">
          <p className="font-semibold">{request.clinicianName}</p>
          <p className="truncate text-xs text-muted-foreground">{request.clinicianEmail}</p>
          <p className="text-xs text-muted-foreground">Asked {askedOn}</p>
        </div>
      </div>
    </Card>
    <Card className="space-y-3 border-secondary bg-secondary p-5 text-sm leading-6 text-secondary-foreground">
      <h2 className="text-lg font-semibold">She’ll see your whole journal</h2>
      <p>Every daily entry, symptom ratings, routine logs, notes and your routine focus areas, including past entries.</p>
      <p>She won’t see your sign-in details or anything you delete. Read-only; stop sharing anytime in Account.</p>
      <p>If you stop sharing later, she keeps what you shared up to then but sees nothing new.</p>
    </Card>
    <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><Info className="mt-0.5 size-4 shrink-0" aria-hidden />Stillwell doesn’t verify clinicians. Only share if you know {dr}.</p>
    <ErrorLine>{error}</ErrorLine>
    <div className="flex flex-col gap-3">
      <Button disabled={busy} onClick={onShare} data-testid="button-request-share">{busy ? "Sharing…" : "Share my journal"}</Button>
      <Button variant="outline" disabled={busy} onClick={onNotNow} data-testid="button-request-not-now">Not now</Button>
    </div>
    <p className="text-xs text-muted-foreground">If you choose Not now, {dr} isn’t told. The request expires {expiresOn}.</p>
  </Column>;
}
