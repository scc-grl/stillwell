import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListPatientClinicianConnectionsQueryKey,
  useInviteClinicianToJournal,
  useListPatientClinicianConnections,
  useRevokeClinicianJournalAccess,
  useUpdateClinicianJournalSharing,
} from "@workspace/api-client-react";
import type { JournalShareArea, JournalShareAreas } from "@workspace/api-client-react";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/stillwell-design-system/components/ui/card";
import { Checkbox } from "@workspace/stillwell-design-system/components/ui/checkbox";
import { Input } from "@workspace/stillwell-design-system/components/ui/input";

const areas: { id: JournalShareArea; label: string; description: string }[] = [
  { id: "symptoms", label: "Symptoms", description: "Optional symptom ratings" },
  { id: "food_hydration", label: "Food & hydration", description: "Your food and hydration reflections" },
  { id: "movement", label: "Movement", description: "Movement reflections" },
  { id: "quiet_pause", label: "Quiet pause", description: "Quiet pause reflections" },
  { id: "pacing", label: "Pacing reflection", description: "Your pacing notes" },
];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

export default function ClinicianSharingPanel({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const connectionsKey = useMemo(() => [...getListPatientClinicianConnectionsQueryKey(), userId], [userId]);
  const connectionsQuery = useListPatientClinicianConnections({
    query: { enabled: Boolean(userId), queryKey: connectionsKey, staleTime: 0, refetchOnMount: "always", refetchInterval: 15_000 },
  });
  const invite = useInviteClinicianToJournal();
  const update = useUpdateClinicianJournalSharing();
  const revoke = useRevokeClinicianJournalAccess();
  const [connectCode, setConnectCode] = useState("");
  const [selectedAreas, setSelectedAreas] = useState<JournalShareAreas>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingAreas, setEditingAreas] = useState<JournalShareAreas>([]);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    setConnectCode("");
    setSelectedAreas([]);
    setEditingId(null);
    setEditingAreas([]);
    setFeedback("");
  }, [userId]);

  const toggleArea = (area: JournalShareArea, current: JournalShareAreas, setter: (value: JournalShareAreas) => void) => {
    setter(current.includes(area) ? current.filter(item => item !== area) : [...current, area]);
  };
  const refreshConnections = () => queryClient.invalidateQueries({ queryKey: connectionsKey });
  const submitInvite = () => {
    if (connectCode.trim().length < 12 || connectCode.trim().length > 80 || selectedAreas.length === 0) return;
    setFeedback("");
    invite.mutate({ data: { connectCode: connectCode.trim(), shareAreas: selectedAreas } }, {
      onSuccess: () => {
        setConnectCode("");
        setSelectedAreas([]);
        setFeedback("Invitation sent. The clinician must accept before they can see any journal information.");
        void refreshConnections();
      },
      onError: () => setFeedback("We couldn’t send the invitation. Check the code and try again."),
    });
  };
  const saveAreas = (connectionId: string) => {
    update.mutate({ connectionId, data: { shareAreas: editingAreas } }, {
      onSuccess: () => {
        setEditingId(null);
        setFeedback("Your sharing choices have been updated.");
        void refreshConnections();
      },
      onError: () => setFeedback("We couldn’t update sharing. Your previous choices remain in place."),
    });
  };
  const removeAccess = (connectionId: string) => {
    if (!window.confirm("Revoke this clinician’s journal access?")) return;
    revoke.mutate({ connectionId }, {
      onSuccess: () => {
        setEditingId(null);
        setFeedback("Journal access was revoked.");
        void refreshConnections();
      },
      onError: () => setFeedback("We couldn’t revoke access. Please try again."),
    });
  };

  return (
    <section className="mt-6" aria-labelledby="sharing-heading">
      <Card>
        <CardHeader>
          <p className="eyebrow">Your choice, always</p>
          <CardTitle id="sharing-heading" className="display text-2xl font-medium">Share selected journal areas</CardTitle>
          <CardDescription className="text-sm leading-6">
            Sharing is optional. Invitations do not grant access; a clinician must accept first. You can change or revoke access at any time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold text-foreground">Invite a clinician</h3>
            <label className="mt-4 block text-sm font-medium text-foreground" htmlFor="clinician-connect-code">Clinician connection code</label>
            <Input id="clinician-connect-code" value={connectCode} onChange={event => setConnectCode(event.target.value)} minLength={12} maxLength={80} autoComplete="off" className="mt-2" data-testid="input-clinician-connect-code" />
            <p className="mt-2 text-xs leading-5 text-muted-foreground">Choose exactly which areas to include in the invitation.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {areas.map(area => (
                <div key={area.id} className="flex items-start gap-3 rounded-md border border-border p-3">
                  <Checkbox checked={selectedAreas.includes(area.id)} onCheckedChange={() => toggleArea(area.id, selectedAreas, setSelectedAreas)} aria-label={`Share ${area.label}`} data-testid={`checkbox-invite-${area.id}`} />
                  <span><span className="block text-sm font-medium text-foreground">{area.label}</span><span className="mt-1 block text-xs text-muted-foreground">{area.description}</span></span>
                </div>
              ))}
            </div>
            <Button className="mt-4" onClick={submitInvite} disabled={invite.isPending || connectCode.trim().length < 12 || connectCode.trim().length > 80 || selectedAreas.length === 0} data-testid="button-send-clinician-invitation">
              {invite.isPending ? "Sending invitation…" : "Send invitation"}
            </Button>
          </div>

          <div>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div><h3 className="text-sm font-semibold text-foreground">Clinician invitations and connections</h3><p className="mt-1 text-xs text-muted-foreground">Only journal areas you select can be shared.</p></div>
              <Button variant="outline" size="sm" onClick={() => void connectionsQuery.refetch()} disabled={connectionsQuery.isFetching} data-testid="button-refresh-sharing">{connectionsQuery.isFetching ? "Refreshing…" : "Refresh"}</Button>
            </div>
            {connectionsQuery.isLoading && <div className="mt-4 animate-pulse space-y-3" aria-label="Loading sharing connections"><div className="h-16 rounded-md bg-muted"/><div className="h-16 rounded-md bg-muted"/></div>}
            {connectionsQuery.isError && <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4" role="alert"><p className="text-sm text-foreground">We couldn’t load your sharing connections.</p><Button variant="outline" size="sm" className="mt-3" onClick={() => void connectionsQuery.refetch()}>Try again</Button></div>}
            {!connectionsQuery.isLoading && !connectionsQuery.isError && (connectionsQuery.data?.items.length ?? 0) === 0 && (
              <div className="mt-4 rounded-lg border border-border bg-muted/40 p-4">
                <p className="text-sm font-medium text-foreground">No invitations or connections yet.</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Start with a clinician’s connection code when you’re ready. Nothing is shared until they accept.</p>
              </div>
            )}
            <div className="mt-4 space-y-3">
              {connectionsQuery.data?.items.map(connection => {
                const isEditing = editingId === connection.id;
                const displayedAreas = isEditing ? editingAreas : connection.shareAreas;
                return (
                  <article key={connection.id} className="rounded-lg border border-border p-4" data-testid={`card-sharing-connection-${connection.id}`}>
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">{connection.clinicianDisplayName}</h4>
                        <p className="mt-1 text-xs text-muted-foreground">{connection.clinicianProfession}{connection.clinicianPracticeName ? ` · ${connection.clinicianPracticeName}` : ""}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {connection.status === "pending" ? `Invitation pending · sent ${formatDate(connection.createdAt)} · no journal access yet` : `Connected${connection.acceptedAt ? ` · accepted ${formatDate(connection.acceptedAt)}` : ""}`}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {!isEditing && <Button size="sm" variant="outline" onClick={() => { setEditingId(connection.id); setEditingAreas([...connection.shareAreas]); setFeedback(""); }} data-testid={`button-edit-sharing-${connection.id}`}>Edit areas</Button>}
                        {isEditing && <>
                          <Button size="sm" onClick={() => saveAreas(connection.id)} disabled={update.isPending} data-testid={`button-save-sharing-${connection.id}`}>{update.isPending ? "Saving…" : "Save areas"}</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)} data-testid={`button-cancel-sharing-${connection.id}`}>Cancel</Button>
                        </>}
                        <Button size="sm" variant="outline" onClick={() => removeAccess(connection.id)} disabled={revoke.isPending} data-testid={`button-revoke-sharing-${connection.id}`}>{revoke.isPending ? "Revoking…" : connection.status === "pending" ? "Cancel invitation" : "Revoke access"}</Button>
                      </div>
                    </div>
                    {isEditing ? <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {areas.map(area => <div key={area.id} className="flex items-center gap-3 rounded-md bg-muted/40 p-3"><Checkbox checked={editingAreas.includes(area.id)} onCheckedChange={() => toggleArea(area.id, editingAreas, setEditingAreas)} aria-label={`Share ${area.label}`} data-testid={`checkbox-edit-${connection.id}-${area.id}`} /><span className="text-sm text-foreground">{area.label}</span></div>)}
                    </div> : <div className="mt-3 flex flex-wrap gap-2" aria-label="Shared areas">
                      {displayedAreas.length ? displayedAreas.map(area => <span key={area} className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">{areas.find(item => item.id === area)?.label ?? area}</span>) : <span className="text-xs text-muted-foreground">No areas selected</span>}
                    </div>}
                  </article>
                );
              })}
            </div>
          </div>
          {feedback && <p role="status" className="rounded-md border border-border bg-secondary p-3 text-sm text-secondary-foreground" data-testid="status-sharing-feedback">{feedback}</p>}
        </CardContent>
      </Card>
    </section>
  );
}
