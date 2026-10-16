import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetClinicianProfileQueryKey,
  getGetSharedPatientJournalQueryKey,
  getListClinicianJournalInvitationsQueryKey,
  getListConnectedPatientsQueryKey,
  useAcceptClinicianJournalInvitation,
  useGetClinicianProfile,
  useGetSharedPatientJournal,
  useListClinicianJournalInvitations,
  useListConnectedPatients,
} from "@workspace/api-client-react";
import type { JournalShareArea, SharedPatientJournal } from "@workspace/api-client-react";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/stillwell-design-system/components/ui/card";
import { Brand } from "@/components/PublicSite";

type ClinicianPortalPageProps = {
  onSignOut: () => void;
};

const shareAreas: { id: JournalShareArea; label: string }[] = [
  { id: "symptoms", label: "Symptoms" },
  { id: "food_hydration", label: "Food & hydration" },
  { id: "movement", label: "Movement" },
  { id: "quiet_pause", label: "Quiet pause" },
  { id: "pacing", label: "Pacing reflection" },
];

function displaySymptomName(value: string) {
  return value.split("_").map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function statusText(value?: string) {
  if (value === "done") return "It fit";
  if (value === "not_done") return "Not today";
  if (value === "not_planned") return "Not planned";
  return "";
}

function SharedJournal({ userId, connectionId, allowedAreas }: { userId: string; connectionId: string; allowedAreas: JournalShareArea[] }) {
  const queryClient = useQueryClient();
  const journalKey = useMemo(() => [...getGetSharedPatientJournalQueryKey(connectionId), userId], [connectionId, userId]);
  const journalQuery = useGetSharedPatientJournal(connectionId, {
    query: { enabled: Boolean(userId && connectionId), queryKey: journalKey, staleTime: 0, gcTime: 0, refetchOnMount: "always", refetchInterval: 10_000 },
  });

  useEffect(() => {
    if (journalQuery.isError) {
      queryClient.setQueryData(journalKey, { patientLabel: "", shareAreas: [], logs: [] });
    }
  }, [journalQuery.isError, journalKey, queryClient]);

  if (journalQuery.isLoading) return <div className="mt-5 animate-pulse space-y-3" aria-label="Loading shared journal"><div className="h-6 w-40 rounded-md bg-muted"/><div className="h-24 rounded-lg bg-muted"/><div className="h-24 rounded-lg bg-muted"/></div>;
  if (journalQuery.isError) return <div className="mt-5 rounded-lg border border-destructive/30 bg-destructive/5 p-4" role="alert"><p className="text-sm text-foreground">This shared journal could not be opened.</p><Button variant="outline" size="sm" className="mt-3" onClick={() => void journalQuery.refetch()}>Try again</Button></div>;
  if (!journalQuery.data) return null;

  const journal: SharedPatientJournal = journalQuery.data;
  const permittedAreas = journal.shareAreas.filter(area => allowedAreas.includes(area));
  const areaLabel = (area: JournalShareArea) => shareAreas.find(item => item.id === area)?.label ?? area;

  return (
    <div className="mt-5 border-t border-border pt-5" data-testid="shared-patient-journal">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="eyebrow">Shared journal</p><h3 className="display mt-2 text-2xl font-medium text-foreground">{journal.patientLabel}</h3></div>
        <Button variant="outline" size="sm" onClick={() => void journalQuery.refetch()} disabled={journalQuery.isFetching}>{journalQuery.isFetching ? "Refreshing…" : "Refresh journal"}</Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2" aria-label="Permitted journal areas">
        {permittedAreas.map(area => <span key={area} className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">{areaLabel(area)}</span>)}
      </div>
      {journal.logs.length === 0 ? <div className="mt-4 rounded-lg border border-border bg-muted/40 p-4"><p className="text-sm font-medium text-foreground">No shared entries yet.</p><p className="mt-1 text-xs text-muted-foreground">Entries will appear here when the patient chooses to add them.</p></div> : (
        <div className="mt-4 space-y-3">
          {journal.logs.map(log => {
            const dateLabel = new Date(`${log.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
            return <article key={log.date} className="rounded-lg border border-border p-4" data-testid={`shared-journal-entry-${log.date}`}>
              <h4 className="text-sm font-semibold text-foreground">{dateLabel}</h4>
              {permittedAreas.includes("symptoms") && log.symptoms && <section className="mt-3 border-t border-border pt-3"><h5 className="text-xs font-semibold text-foreground">Symptoms</h5><ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2">{log.symptoms.map(item => <li key={item.name} className="text-xs text-muted-foreground">{displaySymptomName(item.name)}: <span className="font-medium text-foreground">{item.severity}/10</span></li>)}</ul></section>}
              {permittedAreas.includes("food_hydration") && (log.dietStatus || log.dietNote) && <section className="mt-3 border-t border-border pt-3"><h5 className="text-xs font-semibold text-foreground">Food &amp; hydration</h5>{log.dietStatus && <p className="mt-1 text-xs text-muted-foreground">{statusText(log.dietStatus)}</p>}{log.dietNote && <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{log.dietNote}</p>}</section>}
              {permittedAreas.includes("movement") && (log.exerciseStatus || log.exerciseNote) && <section className="mt-3 border-t border-border pt-3"><h5 className="text-xs font-semibold text-foreground">Movement</h5>{log.exerciseStatus && <p className="mt-1 text-xs text-muted-foreground">{statusText(log.exerciseStatus)}</p>}{log.exerciseNote && <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{log.exerciseNote}</p>}</section>}
              {permittedAreas.includes("quiet_pause") && (log.meditationStatus || log.meditationMinutes || log.meditationNote) && <section className="mt-3 border-t border-border pt-3"><h5 className="text-xs font-semibold text-foreground">Quiet pause</h5>{log.meditationStatus && <p className="mt-1 text-xs text-muted-foreground">{statusText(log.meditationStatus)}</p>}{typeof log.meditationMinutes === "number" && log.meditationMinutes > 0 && <p className="mt-1 text-xs text-muted-foreground">Optional duration: {log.meditationMinutes} minutes</p>}{log.meditationNote && <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{log.meditationNote}</p>}</section>}
              {permittedAreas.includes("pacing") && log.note && <section className="mt-3 border-t border-border pt-3"><h5 className="text-xs font-semibold text-foreground">Pacing reflection</h5><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{log.note}</p></section>}
            </article>;
          })}
        </div>
      )}
    </div>
  );
}

export default function ClinicianPortalPage({ onSignOut }: ClinicianPortalPageProps) {
  const { user } = useUser();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();
  const profileKey = useMemo(() => [...getGetClinicianProfileQueryKey(), userId], [userId]);
  const invitationsKey = useMemo(() => [...getListClinicianJournalInvitationsQueryKey(), userId], [userId]);
  const patientsKey = useMemo(() => [...getListConnectedPatientsQueryKey(), userId], [userId]);
  const profileQuery = useGetClinicianProfile({ query: { enabled: Boolean(userId), queryKey: profileKey } });
  const invitationsQuery = useListClinicianJournalInvitations({ query: { enabled: Boolean(userId), queryKey: invitationsKey, staleTime: 0, refetchOnMount: "always", refetchInterval: 15_000 } });
  const patientsQuery = useListConnectedPatients({ query: { enabled: Boolean(userId), queryKey: patientsKey, staleTime: 0, refetchOnMount: "always", refetchInterval: 15_000 } });
  const acceptInvitation = useAcceptClinicianJournalInvitation();
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSelectedConnectionId(null);
    setFeedback("");
    setCopied(false);
  }, [userId]);

  const selectedPatient = patientsQuery.data?.items.find(patient => patient.id === selectedConnectionId);
  const refreshConnections = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: invitationsKey }),
    queryClient.invalidateQueries({ queryKey: patientsKey }),
  ]);
  const accept = (connectionId: string) => {
    setFeedback("");
    acceptInvitation.mutate({ connectionId }, {
      onSuccess: () => {
        setFeedback("Invitation accepted. The patient’s permitted journal areas are now available.");
        void refreshConnections();
      },
      onError: () => setFeedback("We couldn’t accept that invitation. Please try again."),
    });
  };
  const copyConnectCode = async (connectCode: string) => {
    try {
      await navigator.clipboard.writeText(connectCode);
      setCopied(true);
      setFeedback("Connection code copied.");
    } catch {
      setCopied(false);
      setFeedback("Copy wasn’t available. Select and copy the connection code.");
    }
  };

  return (
    <main className="stillwell min-h-[100dvh] px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between gap-4">
          <Brand />
          <Button variant="outline" onClick={onSignOut}>Sign out</Button>
        </header>
        <section className="mt-10" aria-labelledby="clinician-portal-title">
          <p className="eyebrow">Stillwell for clinicians</p>
          <h1 id="clinician-portal-title" className="display mt-3 text-4xl font-medium leading-tight text-foreground">Shared journal access</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Review invitations and open journals that patients have chosen to share. Only currently permitted areas are shown.</p>
          <p className="mt-3 rounded-md border border-border bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">Clinician accounts are self-identified and may be unverified. Stillwell does not imply professional verification.</p>
        </section>

        <div className="mt-6 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
          <Card>
            <CardHeader><p className="eyebrow">Your profile code</p><CardTitle className="display text-2xl font-medium">Invite code</CardTitle><CardDescription className="text-sm leading-6">Patients can use this code to send you a sharing invitation.</CardDescription></CardHeader>
            <CardContent>
              {profileQuery.isLoading && <div className="animate-pulse space-y-3" aria-label="Loading clinician profile"><div className="h-4 w-32 rounded bg-muted"/><div className="h-10 rounded-md bg-muted"/></div>}
              {profileQuery.isError && <div role="alert"><p className="text-sm text-foreground">We couldn’t load your profile code.</p><Button variant="outline" size="sm" className="mt-3" onClick={() => void profileQuery.refetch()}>Try again</Button></div>}
              {!profileQuery.isLoading && !profileQuery.isError && !profileQuery.data?.profile && <div className="rounded-lg border border-border bg-muted/40 p-4"><p className="text-sm font-medium text-foreground">No clinician profile is available.</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Complete clinician profile setup to get a connection code.</p></div>}
              {profileQuery.data?.profile && <div className="rounded-lg border border-border bg-muted/40 p-4">
                <p className="break-all font-mono text-lg font-semibold tracking-wide text-foreground" data-testid="text-clinician-connect-code">{profileQuery.data.profile.connectCode}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => void copyConnectCode(profileQuery.data!.profile!.connectCode)} data-testid="button-copy-connect-code">{copied ? "Copied" : "Copy code"}</Button>
              </div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><p className="eyebrow">Needs your response</p><CardTitle className="display text-2xl font-medium">Patient invitations</CardTitle><CardDescription className="text-sm leading-6">Accepting connects you to only the areas the patient selected. An invitation alone does not provide access.</CardDescription></CardHeader>
            <CardContent>
              <div className="mb-4 flex justify-end"><Button variant="outline" size="sm" onClick={() => void invitationsQuery.refetch()} disabled={invitationsQuery.isFetching}>{invitationsQuery.isFetching ? "Refreshing…" : "Refresh"}</Button></div>
              {invitationsQuery.isLoading && <div className="animate-pulse space-y-3" aria-label="Loading invitations"><div className="h-20 rounded-lg bg-muted"/><div className="h-20 rounded-lg bg-muted"/></div>}
              {invitationsQuery.isError && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4" role="alert"><p className="text-sm text-foreground">Invitations couldn’t be loaded.</p><Button variant="outline" size="sm" className="mt-3" onClick={() => void invitationsQuery.refetch()}>Try again</Button></div>}
              {!invitationsQuery.isLoading && !invitationsQuery.isError && (invitationsQuery.data?.items.length ?? 0) === 0 && <div className="rounded-lg border border-border bg-muted/40 p-4"><p className="text-sm font-medium text-foreground">No pending invitations.</p><p className="mt-1 text-xs text-muted-foreground">New invitations will appear here.</p></div>}
              <div className="space-y-3">
                {invitationsQuery.data?.items.map((invitation, index) => <article key={invitation.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div><p className="text-sm font-medium text-foreground">A patient sent an invitation</p><p className="mt-1 text-xs text-muted-foreground">Received {new Date(invitation.createdAt).toLocaleDateString()}</p><div className="mt-3 flex flex-wrap gap-2">{invitation.shareAreas.map(area => <span key={area} className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">{shareAreas.find(item => item.id === area)?.label ?? area}</span>)}</div></div>
                    <Button size="sm" onClick={() => accept(invitation.id)} disabled={acceptInvitation.isPending} data-testid={`button-accept-invitation-${index}`}>{acceptInvitation.isPending ? "Accepting…" : "Accept invitation"}</Button>
                  </div>
                </article>)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-5">
          <CardHeader><p className="eyebrow">Patient-controlled sharing</p><CardTitle className="display text-2xl font-medium">Connected journals</CardTitle><CardDescription className="text-sm leading-6">Patients appear as generated labels only. Their identity details are not provided here.</CardDescription></CardHeader>
          <CardContent>
            <div className="mb-4 flex justify-end"><Button variant="outline" size="sm" onClick={() => void patientsQuery.refetch()} disabled={patientsQuery.isFetching}>{patientsQuery.isFetching ? "Refreshing…" : "Refresh patients"}</Button></div>
            {patientsQuery.isLoading && <div className="animate-pulse space-y-3" aria-label="Loading connected journals"><div className="h-16 rounded-lg bg-muted"/><div className="h-16 rounded-lg bg-muted"/></div>}
            {patientsQuery.isError && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4" role="alert"><p className="text-sm text-foreground">Connected journals couldn’t be loaded.</p><Button variant="outline" size="sm" className="mt-3" onClick={() => void patientsQuery.refetch()}>Try again</Button></div>}
            {!patientsQuery.isLoading && !patientsQuery.isError && (patientsQuery.data?.items.length ?? 0) === 0 && <div className="rounded-lg border border-border bg-muted/40 p-4"><p className="text-sm font-medium text-foreground">No connected journals yet.</p><p className="mt-1 text-xs text-muted-foreground">After you accept an invitation, the patient’s generated label will appear here.</p></div>}
            <div className="grid gap-3 sm:grid-cols-2">
              {patientsQuery.data?.items.map((patient, index) => <article key={patient.id} className="rounded-lg border border-border p-4" data-testid={`card-connected-journal-${index}`}>
                <h3 className="text-sm font-semibold text-foreground">{patient.patientLabel}</h3>
                <p className="mt-1 text-xs text-muted-foreground">Connected {new Date(patient.acceptedAt).toLocaleDateString()}</p>
                <div className="mt-3 flex flex-wrap gap-2">{patient.shareAreas.map(area => <span key={area} className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">{shareAreas.find(item => item.id === area)?.label ?? area}</span>)}</div>
                <Button variant={selectedConnectionId === patient.id ? "secondary" : "outline"} size="sm" className="mt-4" onClick={() => { setSelectedConnectionId(patient.id); setFeedback(""); }} data-testid={`button-open-shared-journal-${index}`}>{selectedConnectionId === patient.id ? "Journal selected" : "Open shared journal"}</Button>
              </article>)}
            </div>
            {selectedPatient && <SharedJournal key={`${userId}-${selectedPatient.id}`} userId={userId} connectionId={selectedPatient.id} allowedAreas={selectedPatient.shareAreas}/>}
          </CardContent>
        </Card>
        {feedback && <p role="status" className="mt-4 rounded-md border border-border bg-secondary p-3 text-sm text-secondary-foreground" data-testid="status-clinician-feedback">{feedback}</p>}
      </div>
    </main>
  );
}
