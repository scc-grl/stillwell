import { useMemo, useState } from "react";
import { useClerk, useUser } from "@clerk/react";
import { Link } from "wouter";
import { ArrowLeft, RefreshCw } from "lucide-react";
import {
  getGetDoctorMvpPatientQueryKey, getGetMyCarePatientsQueryKey,
  useGetDoctorMvpPatient, useGetMyCarePatients, useChangeDoctorMvpStage,
} from "@workspace/api-client-react";
import type { DoctorMvpDay, DoctorMvpPatient, DoctorStageInputStage, MvpScores } from "@workspace/api-client-react";
import { STAGES } from "@workspace/intake-ai";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card } from "@workspace/stillwell-design-system/components/ui/card";
import { Textarea } from "@workspace/stillwell-design-system/components/ui/textarea";
import { ProofOfConceptBanner } from "@workspace/clinician-care-portal";
import { Brand } from "@/components/PublicSite";

const stageChoices: DoctorStageInputStage[] = ["1", "2", "3", "4", "5", "6", "maintenance"];
const scoreNames: (keyof MvpScores)[] = ["headache", "fog", "light", "sleep"];
const labels: Record<keyof MvpScores, string> = { headache: "Headache", fog: "Mental fog", light: "Light sensitivity", sleep: "Trouble sleeping" };
const stageLabel = (stage: string) => stage === "maintenance" ? "Maintenance" : `Stage ${stage} · ${STAGES[Number(stage) as keyof typeof STAGES]}`;
function recentWeekDates(periodEnd: string) {
  const [year, month, day] = periodEnd.split("-").map(Number);
  const end = new Date(year, month - 1, day, 12);
  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(end);
    date.setDate(end.getDate() - offset);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  });
}

function ClinicianIdentity() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const name = user?.fullName || user?.primaryEmailAddress?.emailAddress || "Clinician";
  return <div className="flex flex-wrap items-center gap-3">
    <p className="text-base text-muted-foreground">{name}</p>
    <Button variant="outline" className="min-h-12" onClick={() => void signOut({ redirectUrl: "/sign-in" })}>Sign out</Button>
  </div>;
}

export function MvpDoctorPortalPage() {
  const { user } = useUser();
  const owner = user?.id ?? "";
  const patientsKey = useMemo(() => [...getGetMyCarePatientsQueryKey(), owner], [owner]);
  const query = useGetMyCarePatients({ query: { queryKey: patientsKey, enabled: Boolean(owner), refetchInterval: 30_000, refetchOnWindowFocus: true, retry: false } });
  return <main className="stillwell min-h-[100dvh] px-4 py-8 sm:px-8">
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3"><Brand journal/><ClinicianIdentity/></header>
      <ProofOfConceptBanner/>
      <Card className="space-y-4 p-5 sm:p-7"><p className="eyebrow">Doctor portal</p><h1 className="display text-4xl">Your patients</h1><p className="text-base leading-7 text-muted-foreground">Review shared symptom and recovery-plan scores and stage history. Private written and dictated notes are not shared.</p>
        <p className="rounded-xl bg-secondary p-4 text-base leading-7">Patient-reported, not a clinical record. Shared details may be incomplete.</p>
        {query.isLoading&&<div aria-label="Loading patients" className="space-y-3"><div className="h-16 animate-pulse rounded-xl bg-muted"/><div className="h-16 animate-pulse rounded-xl bg-muted"/></div>}
        {query.isError&&<div role="alert" className="space-y-3"><p>We couldn’t load your patient list.</p><Button variant="outline" className="min-h-12" onClick={()=>void query.refetch()}>Try again</Button></div>}
        {!query.isLoading&&!query.isError&&(query.data?.active.length??0)===0&&(query.data?.former.length??0)===0&&<p className="rounded-xl bg-secondary p-4 text-base leading-7">No accepted patient invitations yet. Accept an invitation from the link in your email.</p>}
        <ul className="space-y-3">{[...(query.data?.active ?? []), ...(query.data?.former ?? [])].map(patient=><li key={patient.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"><div><h2 className="font-semibold">{patient.firstName} {patient.lastName}</h2><p className="text-base text-muted-foreground">{patient.status === "former" ? "Former patient" : `Connected ${new Date(patient.connectedAt).toLocaleDateString()}`}</p></div><Button asChild className="min-h-12"><Link href={`/clinician/patients/${encodeURIComponent(patient.id)}`}>Open patient</Link></Button></li>)}</ul>
      </Card>
    </div>
  </main>;
}

export function MvpDoctorPatientPage({ id }: { id: string }) {
  const { user } = useUser();
  const owner = user?.id ?? "";
  const queryKey = useMemo(() => [...getGetDoctorMvpPatientQueryKey(id), owner], [id, owner]);
  const query = useGetDoctorMvpPatient(id, { query: { queryKey, enabled: Boolean(id && owner), refetchInterval: 30_000, refetchOnWindowFocus: true, retry: false } });
  const change = useChangeDoctorMvpStage();
  const [stage, setStage] = useState<DoctorStageInputStage>("1");
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState("");
  const patient: DoctorMvpPatient | undefined = query.data;
  const stagesNewestFirst = [...(patient?.stages ?? [])].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  const currentStage = stagesNewestFirst[0];
  const recordedDays: DoctorMvpDay[] = [...(patient?.days ?? [])].sort((a,b)=>b.date.localeCompare(a.date));
  const daysByDate = new Map(recordedDays.map(day => [day.date, day]));
  const weekDates = patient ? recentWeekDates(patient.periodEnd) : [];
  function submit() {
    if (!note.trim()) { setFeedback("Add a note to explain the stage change."); return; }
    setFeedback("");
    change.mutate({ id, data: { stage, note: note.trim() } }, {
      onSuccess: () => { setNote(""); setFeedback("Stage updated and added to the history."); void query.refetch(); },
      onError: () => setFeedback("The stage could not be changed. Please try again."),
    });
  }
  return <main className="stillwell min-h-[100dvh] px-4 py-8 sm:px-8"><div className="mx-auto max-w-5xl space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><Brand journal/><ClinicianIdentity/></header>
    <ProofOfConceptBanner/>
    <Button asChild variant="outline" className="min-h-12"><Link href="/clinician/portal"><ArrowLeft/>Patient list</Link></Button>
    <p className="rounded-xl bg-secondary p-4 text-base leading-7">Patient-reported, not a clinical record. Scores and stage information are entered by the patient and may be incomplete.</p>
    {query.isLoading&&<div aria-label="Loading patient recovery" className="space-y-4"><div className="h-40 animate-pulse rounded-xl bg-muted"/><div className="h-56 animate-pulse rounded-xl bg-muted"/></div>}
    {query.isError&&<Card role="alert" className="space-y-4 p-5"><h1 className="display text-3xl">Patient recovery could not load</h1><p className="text-base leading-7">No patient notes are available in this view.</p><Button variant="outline" className="min-h-12" onClick={()=>void query.refetch()}><RefreshCw/>Try again</Button></Card>}
    {patient&&<>
      <Card className="space-y-4 p-5 sm:p-7"><p className="eyebrow">{patient.status==="former"?"Former patient · read only":"Patient recovery"}</p><h1 className="display text-4xl">{patient.name}</h1><h2 className="display text-2xl">{currentStage?stageLabel(currentStage.stage):"No stage recorded"}</h2>{currentStage&&<section><h3 className="font-semibold">Current stage reason</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-base leading-7">{currentStage.reasons.map((reason,index)=><li key={`${reason}-${index}`}>{reason}</li>)}</ul></section>}<p className="text-base leading-7 text-muted-foreground">Patient notes are private and are not included here.</p></Card>
      <Card className="space-y-4 p-5 sm:p-7"><div><p className="eyebrow">Recent check-ins</p><h2 className="display text-2xl">Seven-day score history</h2><p className="text-base leading-7 text-muted-foreground">Seven calendar days ending {new Date(`${patient.periodEnd}T12:00:00`).toLocaleDateString()}. Symptom jumps are shaded based on the previous recorded day, including days before this period. Not recorded values are left blank.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-max border-collapse text-left text-base"><caption className="sr-only">Patient symptom and recovery-plan scores for the seven calendar days ending {patient.periodEnd}</caption><thead><tr className="border-b border-border"><th scope="col" className="p-3">Date</th>{scoreNames.map(key=><th key={key} scope="col" className="p-3">{labels[key]}</th>)}<th scope="col" className="p-3">Recovery plan</th><th scope="col" className="p-3">Flag</th></tr></thead><tbody>{weekDates.map(date=>{const day=daysByDate.get(date);return <tr key={date} className="border-b border-border"><th scope="row" className="whitespace-nowrap p-3 font-medium">{new Date(`${date}T12:00:00`).toLocaleDateString()}</th>{scoreNames.map(key=>{const current=day?.scores[key]??null;const jump=Boolean(day?.jumpSymptoms.includes(key));return <td key={key} className={`p-3 ${jump?"bg-notice font-semibold text-notice-foreground":""}`}>{current===null?"—":current}</td>;})}<td className="p-3">{day?.planScore===null||day?.planScore===undefined?"—":day.planScore}</td><td className="p-3">{day?.flagged?"Review":"—"}</td></tr>;})}</tbody></table></div>
      </Card>
      <Card className="space-y-4 p-5 sm:p-7"><p className="eyebrow">Stage history</p><h2 className="display text-2xl">Roadmap changes</h2>{stagesNewestFirst.length===0?<p className="text-base text-muted-foreground">No stage history yet.</p>:<ol className="space-y-3">{stagesNewestFirst.map(item=><li key={item.id} className="rounded-xl border border-border p-4"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">{stageLabel(item.stage)}</h3><span className="text-base text-muted-foreground">{item.source} · {new Date(item.createdAt).toLocaleDateString()}</span></div><ul className="mt-2 list-disc pl-5 text-base leading-7">{item.reasons.map((reason,index)=><li key={`${item.id}-${index}`}>{reason}</li>)}</ul></li>)}</ol>}</Card>
      {patient.status==="active"&&<Card className="space-y-4 p-5 sm:p-7"><p className="eyebrow">Clinician review</p><h2 className="display text-2xl">Change stage</h2><p className="text-base leading-7 text-muted-foreground">A written reason is required. Your change is recorded in the patient’s stage history.</p><fieldset className="space-y-3"><legend className="font-semibold">Select a stage</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{stageChoices.map(choice=><Button type="button" key={choice} variant={stage===choice?"secondary":"outline"} className="min-h-12 whitespace-normal" aria-pressed={stage===choice} onClick={()=>setStage(choice)}>{stageLabel(choice)}</Button>)}</div></fieldset><label htmlFor="stage-note" className="font-semibold">Review note</label><Textarea id="stage-note" value={note} maxLength={1000} onChange={event=>setNote(event.target.value)} className="min-h-28 text-base" placeholder="Explain the stage change"/><Button className="min-h-12" disabled={change.isPending||!note.trim()} onClick={submit}>{change.isPending?"Saving…":"Save stage change"}</Button>{feedback&&<p role={feedback.includes("could not")||feedback.includes("Add a note")?"alert":"status"} className="text-base">{feedback}</p>}</Card>}
    </>}
  </div></main>;
}
