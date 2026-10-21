import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowRight, UserMinus, X } from "lucide-react";
import {
  getGetMyCareTeamQueryKey,
  useCancelPatientCareInvite,
  useCreatePatientCareInvite,
  useGetMyCareTeam,
  useRemoveCareClinician,
} from "@workspace/api-client-react";
import { careLinkPath } from "@workspace/recovery-journal/care-link-handoff";
import { careTeamErrorMessage, inviteFieldError, notSentMessage, sendFailedMessage } from "@workspace/recovery-journal/care-team-copy";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card } from "@workspace/stillwell-design-system/components/ui/card";
import { Input } from "@workspace/stillwell-design-system/components/ui/input";
import { careMemory, doctorName, errorCode, formatLinkDate, pendingLink, privateMutation, privateQuery, type InvitePrefill } from "@/lib/care-link";

type Confirm = { kind: "remove" | "cancel"; id: string; name: string } | null;

/**
 * Patient care team on the web dashboard: view, remove active clinicians,
 * cancel pending invites, and send an invite only from an expired-request prefill.
 */
export function CareTeamPanel() {
  const { user } = useUser();
  const owner = user?.id ?? "signed-out";
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const key = useMemo(() => [...getGetMyCareTeamQueryKey(), owner], [owner]);
  const team = useGetMyCareTeam({ query: { queryKey: key, enabled: Boolean(user?.id), ...privateQuery } });
  const remove = useRemoveCareClinician({ mutation: privateMutation });
  const cancel = useCancelPatientCareInvite({ mutation: privateMutation });
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [prefill, setPrefill] = useState<InvitePrefill | null>(() => careMemory.getPrefill());
  const [returnTo] = useState(() => {
    const link = pendingLink.read();
    return link?.kind === "request" && link.returnToRequest ? careLinkPath("request", link.token) : null;
  });
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (careMemory.consumeFocus() || prefill || returnTo) sectionRef.current?.scrollIntoView({ block: "start" });
  // Focus only once on arrival.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runConfirm() {
    if (!confirm) return;
    setError("");
    setMessage("");
    try {
      if (confirm.kind === "remove") await remove.mutateAsync({ id: confirm.id });
      else await cancel.mutateAsync({ id: confirm.id });
      setMessage(confirm.kind === "remove" ? `${confirm.name} can no longer see new entries.` : `Your invite to ${confirm.name} was cancelled.`);
      setConfirm(null);
      void queryClient.invalidateQueries({ queryKey: key });
    } catch {
      setError(confirm.kind === "remove" ? "We couldn’t remove this clinician. Nothing changed. Try again." : "We couldn’t cancel this invite. Try again.");
    }
  }

  const data = team.data;
  const busy = remove.isPending || cancel.isPending;
  const empty = data && data.activeClinicians.length === 0 && data.pendingInvites.length === 0;

  return <section ref={sectionRef} id="care-team" aria-labelledby="care-team-title" className="scroll-mt-24">
    <Card className="space-y-5 p-5 sm:p-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your care team</p>
        <h2 id="care-team-title" className="font-serif text-2xl font-medium">Who can read your journal</h2>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">Clinicians you share with can read your journal, read-only. You can stop sharing at any time; they keep what you shared up to then but see nothing new.</p>
      </div>
      {returnTo ? <Card className="flex flex-col gap-3 border-secondary bg-secondary p-4 text-sm text-secondary-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>Free a place on your care team, then return to the share request.</p>
        <Button size="sm" onClick={() => setLocation(returnTo)} data-testid="button-return-to-request">Return to the request <ArrowRight /></Button>
      </Card> : null}
      {message ? <p role="status" className="rounded-xl bg-secondary p-3 text-sm text-secondary-foreground">{message}</p> : null}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      {team.isLoading ? <div className="space-y-3" aria-label="Loading your care team"><div className="h-14 animate-pulse rounded-xl bg-muted" /><div className="h-14 animate-pulse rounded-xl bg-muted" /></div> : null}
      {team.isError ? <div className="space-y-3"><p className="text-sm text-muted-foreground">We couldn’t load your care team. Nothing changed.</p><Button variant="outline" size="sm" onClick={() => void team.refetch()} data-testid="button-care-team-retry">Try again</Button></div> : null}
      {empty ? <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground" data-testid="text-care-team-empty">No one can read your journal through Stillwell right now.</p> : null}
      {data && data.activeClinicians.length > 0 ? <ul className="divide-y divide-border" aria-label="Clinicians who can read your journal">
        {data.activeClinicians.map((item) => <li key={item.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between" data-testid={`row-care-clinician-${item.id}`}>
          <div><p className="text-sm font-semibold">{item.name}</p><p className="text-xs text-muted-foreground">Connected {formatLinkDate(item.connectedAt)}</p></div>
          <Button variant="outline" size="sm" disabled={busy} onClick={() => { setConfirm({ kind: "remove", id: item.id, name: item.name }); setMessage(""); }} data-testid={`button-remove-clinician-${item.id}`}><UserMinus />Remove</Button>
        </li>)}
      </ul> : null}
      {data && data.pendingInvites.length > 0 ? <ul className="divide-y divide-border" aria-label="Pending invites">
        {data.pendingInvites.map((invite) => {
          const name = `${invite.firstName} ${invite.lastName}`.trim();
          return <li key={invite.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between" data-testid={`row-care-invite-${invite.id}`}>
            <div><p className="text-sm font-semibold">{name}</p><p className="text-xs text-muted-foreground">Invite pending · expires {formatLinkDate(invite.expiresAt)}</p></div>
            <Button variant="outline" size="sm" disabled={busy} onClick={() => { setConfirm({ kind: "cancel", id: invite.id, name }); setMessage(""); }} data-testid={`button-cancel-invite-${invite.id}`}><X />Cancel invite</Button>
          </li>;
        })}
      </ul> : null}
      {data && data.expiredInvites.length > 0 ? <ul className="divide-y divide-border" aria-label="Expired invites">
        {data.expiredInvites.map((invite) => <li key={invite.id} className="py-3" data-testid={`row-care-expired-${invite.id}`}>
          <p className="text-sm font-semibold">{`${invite.firstName} ${invite.lastName}`.trim()}</p>
          <p className="text-xs text-muted-foreground">Expired {formatLinkDate(invite.expiresAt)} · Not accepted within 14 days</p>
        </li>)}
      </ul> : null}
      {confirm ? <Card role="alertdialog" aria-labelledby="care-confirm-title" className="space-y-3 border-destructive p-4">
        <h3 id="care-confirm-title" className="text-sm font-semibold">{confirm.kind === "remove" ? `Stop sharing with ${confirm.name}?` : `Cancel your invite to ${confirm.name}?`}</h3>
        <p className="text-sm leading-6 text-muted-foreground">{confirm.kind === "remove" ? `${confirm.name} keeps what you’ve already shared but won’t see any new entries.` : "The invite link will stop working."}</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="destructive" disabled={busy} onClick={() => void runConfirm()} data-testid="button-confirm-care-action">{busy ? "Working…" : confirm.kind === "remove" ? "Stop sharing" : "Cancel invite"}</Button>
          <Button variant="ghost" disabled={busy} onClick={() => setConfirm(null)} data-testid="button-dismiss-care-action">Keep</Button>
        </div>
      </Card> : null}
      {prefill ? <PrefilledInvite prefill={prefill} onDone={(text) => { careMemory.setPrefill(null); setPrefill(null); setMessage(text); void queryClient.invalidateQueries({ queryKey: key }); }}
        onDismiss={() => { careMemory.setPrefill(null); setPrefill(null); }} /> : null}
    </Card>
  </section>;
}

function PrefilledInvite({ prefill, onDone, onDismiss }: { prefill: InvitePrefill; onDone: (message: string) => void; onDismiss: () => void }) {
  const create = useCreatePatientCareInvite({ mutation: privateMutation });
  const [form, setForm] = useState(prefill);
  const [error, setError] = useState("");
  const dr = doctorName({ lastName: form.lastName });

  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const validationError = inviteFieldError("firstName", form.firstName)
      || inviteFieldError("lastName", form.lastName) || inviteFieldError("email", form.email);
    if (validationError) { setError(validationError); return; }
    create.mutate({ data: { firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim(), consentAccepted: true } }, {
      onSuccess: (result) => onDone(result.suppressed
        ? notSentMessage("patient")
        : `Invite sent to ${dr}.`),
      onError: (err) => {
        const code = errorCode(err);
        setError(careTeamErrorMessage(code, "patient", sendFailedMessage("patient")));
      },
    });
  }

  return <form onSubmit={submit} noValidate className="space-y-4 rounded-xl border border-border p-4" aria-labelledby="prefill-invite-title" data-testid="form-prefilled-invite">
    <h3 id="prefill-invite-title" className="text-base font-semibold">Invite {dr}</h3>
    <div className="grid gap-3 sm:grid-cols-2">
      {(["firstName", "lastName"] as const).map((field) => <div key={field} className="space-y-1">
        <label htmlFor={`invite-${field}`} className="text-sm font-medium">{field === "firstName" ? "First name" : "Last name"}</label>
        <Input id={`invite-${field}`} value={form[field]} maxLength={100} onChange={(event) => setForm({ ...form, [field]: event.target.value })} className="min-h-12" data-testid={`input-invite-${field}`} />
      </div>)}
    </div>
    <div className="space-y-1">
      <label htmlFor="invite-email" className="text-sm font-medium">Email</label>
      <Input id="invite-email" type="email" value={form.email} maxLength={254} onChange={(event) => setForm({ ...form, email: event.target.value })} className="min-h-12" data-testid="input-invite-email" />
    </div>
    <div className="rounded-xl bg-secondary p-4 text-sm leading-6 text-secondary-foreground">
      <p className="font-semibold">She’ll see your whole journal</p>
      <p>Every daily entry, symptom ratings, routine logs, notes and your routine focus areas, including past entries. Read-only; stop sharing anytime. If you stop sharing later, she keeps what you shared up to then but sees nothing new.</p>
    </div>
    <p className="text-xs leading-5 text-muted-foreground">Tapping Invite {dr} shares your whole journal, read-only, once she accepts.</p>
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button type="submit" disabled={create.isPending} data-testid="button-send-invite">{create.isPending ? "Sending…" : `Invite ${dr}`}</Button>
      <Button type="button" variant="ghost" disabled={create.isPending} onClick={onDismiss} data-testid="button-dismiss-invite">Not now</Button>
    </div>
  </form>;
}
