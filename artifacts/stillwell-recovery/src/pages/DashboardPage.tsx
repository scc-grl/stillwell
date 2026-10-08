import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetRecoveryQueryKey, useDeleteRecoveryLog, useGetRecovery, useSaveRecoveryLog,
  useStartRecovery, useUpdateRecoveryProfile,
} from "@workspace/api-client-react";
import type { RecoveryLog, RecoveryLogInput, RecoveryPreferences, RecoveryState, SymptomEntry } from "@workspace/api-client-react";
import { ArrowRight, CalendarDays, Check, ChevronDown, CircleAlert, Clock3, Leaf, LogOut, PencilLine, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { clearDraft, emptyLog, localDate, priorityChoices, readDraft, replaceSymptom, routinePrompts, symptomChoices, type DraftEnvelope } from "@/lib/recovery";

const panel = "rounded-[24px] border border-[#dfe5db] bg-[#fbfaf5] shadow-[0_12px_38px_rgba(46,67,52,.04)]";
const tinyButton = "inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#d8e1d6] px-4 text-xs font-semibold text-[#526c5c] transition hover:bg-[#edf2ea]";
const cta = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#315b49] px-5 text-xs font-semibold text-[#fbfaf4] transition hover:bg-[#274b3b] disabled:opacity-50";
const supportNames: Record<RecoveryPreferences["supportMode"], string> = { self_guided: "Self-guided", clinician_supported: "With clinician support" };
const statusOptions = [["done", "It fit"], ["not_done", "Not today"], ["not_planned", "Not planned"]] as const;
function Brand() { return <Link href="/" className="flex items-center gap-3 text-[#29463b]" aria-label="Stillwell home"><span className="brand-mark"/><span className="display text-xl font-semibold tracking-tight">stillwell</span></Link>; }
function dateLabel(date: string) { const [y, m, d] = date.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }); }
function Readout({ label, status, note }: { label: string; status: string; note: string }) {
  const value = status === "done" ? "It fit" : status === "not_done" ? "Not today" : status === "not_planned" ? "Not planned" : "";
  return <div className="flex items-start justify-between gap-4 border-b border-[#e9ebe3] py-3 last:border-0"><div><p className="text-xs font-medium text-[#46604f]">{label}</p>{note && <p className="mt-1 max-w-[440px] whitespace-pre-wrap text-xs leading-5 text-[#788176]">{note}</p>}</div><span className="shrink-0 rounded-full bg-[#edf2ea] px-3 py-1 text-[10px] text-[#607863]">{value || "Reflected"}</span></div>;
}

export default function DashboardPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const userId = user?.id ?? "";
  const recoveryKey = useMemo(() => [...getGetRecoveryQueryKey(), userId], [userId]);
  const recoveryQuery = useGetRecovery({ query: { enabled: !!userId, queryKey: recoveryKey, retry: false } });
  const start = useStartRecovery();
  const updateProfile = useUpdateRecoveryProfile();
  const saveLog = useSaveRecoveryLog();
  const deleteLog = useDeleteRecoveryLog();
  const profile = recoveryQuery.data?.profile;
  const logs = useMemo(() => [...(recoveryQuery.data?.logs ?? [])].sort((a, b) => b.date.localeCompare(a.date)), [recoveryQuery.data?.logs]);
  const [editing, setEditing] = useState<RecoveryLogInput | null>(null);
  const [priorities, setPriorities] = useState<RecoveryPreferences["priorities"]>([]);
  const [supportMode, setSupportMode] = useState<RecoveryPreferences["supportMode"]>("self_guided");
  const [routineOpen, setRoutineOpen] = useState(false);
  const [message, setMessage] = useState("");
  const startedOnce = useRef(false);
  useEffect(() => {
    startedOnce.current = false;
    setEditing(null);
    setMessage("");
    setRoutineOpen(false);
  }, [userId]);
  const persistDraft = (draft: DraftEnvelope) => {
    startedOnce.current = true;
    start.mutate({ data: draft.payload }, {
      onSuccess: state => { queryClient.setQueryData(recoveryKey, state); clearDraft(); setMessage("Your first daily summary is ready. You can edit it whenever you like."); },
      onError: () => setMessage("Your consented setup is still kept in this tab. We couldn’t save it yet; try again when you’re ready."),
    });
  };

  useEffect(() => {
    if (!userId) return;
    if (profile) {
      clearDraft();
      setPriorities([...profile.priorities]);
      setSupportMode(profile.supportMode);
      return;
    }
    const draft = readDraft();
    if (!draft) return;
    if (draft.ownerId && draft.ownerId !== userId) { clearDraft(); return; }
    if (!draft.ownerId) {
      try {
        sessionStorage.setItem("stillwell.consented-recovery-draft", JSON.stringify({ ...draft, ownerId: userId }));
      } catch { clearDraft(); return; }
    }
    if (!recoveryQuery.isLoading && !recoveryQuery.isError && !startedOnce.current) {
      persistDraft(draft);
    }
  }, [userId, profile, recoveryQuery.isLoading, recoveryQuery.isError, start.mutate, queryClient]);

  const saveSetup = () => {
    if (!profile || priorities.length < 1) return;
    setMessage("");
    updateProfile.mutate({ data: { supportMode, priorities } }, {
      onSuccess: next => {
        queryClient.setQueryData<RecoveryState>(recoveryKey, old => old ? { ...old, profile: next } : { profile: next, logs: [] });
        setMessage("Your routine preferences are saved.");
      },
      onError: () => setMessage("Your routine could not be saved. Your previous settings are unchanged."),
    });
  };
  const submitLog = () => {
    if (!editing) return;
    setMessage("");
    const payload = { ...editing, date: editing.date, symptoms: editing.symptoms.slice(0, 7) };
    saveLog.mutate({ data: payload }, {
      onSuccess: saved => {
        queryClient.setQueryData<RecoveryState>(recoveryKey, old => old ? { ...old, logs: [...old.logs.filter(item => item.date !== saved.date), saved] } : { profile: null, logs: [saved] });
        setEditing(null);
        setMessage(`${dateLabel(saved.date)} summary saved.`);
      },
      onError: () => setMessage("This summary could not be saved. Your existing entry is unchanged; try again."),
    });
  };
  const removeLog = (date: string) => {
    if (!window.confirm(`Delete the recovery journal entry for ${dateLabel(date)}?`)) return;
    deleteLog.mutate({ date }, {
      onSuccess: () => {
        queryClient.setQueryData<RecoveryState>(recoveryKey, old => old ? { ...old, logs: old.logs.filter(item => item.date !== date) } : old);
        setMessage(`${dateLabel(date)} entry deleted.`);
      },
      onError: () => setMessage("That entry could not be deleted. Please try again."),
    });
  };
  const logout = async () => {
    clearDraft(); queryClient.clear();
    await signOut({ redirectUrl: import.meta.env.BASE_URL || "/" });
    setLocation("/");
  };
  const togglePriority = (value: RecoveryPreferences["priorities"][number]) => setPriorities(current => current.includes(value) ? current.filter(p => p !== value) : [...current, value]);
  const beginEdit = (log?: RecoveryLog) => {
    const day = localDate();
    const todayLog = log ?? logs.find(item => item.date === day);
    setEditing(todayLog ? {
      date: todayLog.date, symptoms: todayLog.symptoms.map(s => ({ ...s })), dietStatus: todayLog.dietStatus, dietNote: todayLog.dietNote,
      exerciseStatus: todayLog.exerciseStatus, exerciseNote: todayLog.exerciseNote, meditationStatus: todayLog.meditationStatus,
      meditationMinutes: todayLog.meditationMinutes, meditationNote: todayLog.meditationNote, note: todayLog.note,
    } : emptyLog(day));
    setMessage("");
  };
  const activitySet = (key: "dietStatus" | "exerciseStatus" | "meditationStatus", value: RecoveryLogInput["dietStatus"]) => setEditing(old => old ? { ...old, [key]: value } : old);
  const activityNote = (key: "dietNote" | "exerciseNote" | "meditationNote" | "note", value: string) => setEditing(old => old ? { ...old, [key]: value } : old);
  const openQuiz = () => setLocation("/quiz");

  return <main className="min-h-[100dvh] bg-[#f5f4ed] pb-16">
    <header className="sticky top-0 z-20 border-b border-[#dfe5db] bg-[#f5f4ed]/95 backdrop-blur"><div className="mx-auto flex max-w-[1160px] items-center justify-between px-4 py-3 sm:px-8"><Brand/><div className="flex items-center gap-2"><span className="hidden text-xs text-[#788176] sm:inline">{user?.firstName ? `A quiet place for ${user.firstName}` : "Your private journal"}</span><Link href="/privacy" className={tinyButton}><ShieldCheck size={14}/>Privacy</Link><button type="button" onClick={logout} className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-xs font-semibold text-[#63776b] hover:bg-[#e9eee6]" data-testid="button-sign-out"><LogOut size={14}/> <span className="hidden sm:inline">Sign out</span></button></div></div></header>
    <div className="mx-auto max-w-[1160px] px-4 pt-8 sm:px-8 sm:pt-12">
      <section className="relative overflow-hidden rounded-[30px] bg-[#345747] px-6 py-8 text-[#f7f6ed] sm:px-10 sm:py-10"><div className="absolute -right-24 -top-36 h-[350px] w-[350px] rounded-full border border-white/10"/><div className="absolute -right-2 -top-24 h-[250px] w-[250px] rounded-full border border-white/10"/><div className="relative grid gap-7 sm:grid-cols-[1fr_auto] sm:items-end"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#c5d5c6]">Your space, your pace</p><h1 className="display mt-3 max-w-[680px] text-[clamp(2.4rem,6vw,4.2rem)] leading-[1.02] tracking-[-.04em]">Make room for what today is.</h1><p className="mt-4 max-w-[560px] text-sm leading-6 text-[#dae3d7]">A personal journal for noticing patterns and choosing gentle routines. Nothing here is a diagnosis or a treatment prescription.</p></div><button type="button" onClick={() => beginEdit()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#f4f2e8] px-5 text-xs font-semibold text-[#355747] hover:bg-white"><Plus size={16}/>Today’s check-in</button></div></section>
      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-[#e8d8c9] bg-[#f5eee5] p-4 sm:flex-row sm:items-start"><CircleAlert size={17} className="mt-0.5 shrink-0 text-[#9a7258]"/><p className="text-xs leading-5 text-[#766b5f]"><strong className="font-semibold text-[#6e503d]">A safety note.</strong> Stillwell is not for a new injury or emergency. If symptoms are worsening, contact a clinician. Severe or urgent symptoms need emergency care now.</p></div>
      {message && <p role="status" className="mt-5 rounded-2xl border border-[#d7e3d6] bg-[#edf2ea] px-4 py-3 text-xs leading-5 text-[#4f6c58]" data-testid="status-dashboard-feedback">{message}</p>}
      {recoveryQuery.isLoading && <section className={`${panel} mt-6 animate-pulse p-6`} aria-label="Loading your journal"><div className="h-4 w-36 rounded bg-[#e6e9df]"/><div className="mt-5 h-24 rounded-2xl bg-[#edf0e8]"/><div className="mt-4 h-16 rounded-2xl bg-[#edf0e8]"/></section>}
      {recoveryQuery.isError && <section className={`${panel} mt-6 p-7`}><p className="eyebrow">We couldn’t open your journal</p><h2 className="display mt-2 text-3xl text-[#355345]">Your notes haven’t gone anywhere.</h2><p className="mt-3 text-sm leading-6 text-[#748075]">Check your connection, then try loading the private journal again.</p><button type="button" className={`${cta} mt-5`} onClick={() => recoveryQuery.refetch()}>Try again <ArrowRight size={15}/></button></section>}
      {!recoveryQuery.isLoading && !recoveryQuery.isError && !profile && !readDraft() && <section className={`${panel} mt-6 p-7 sm:p-9`}><div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e8eee5] text-[#68816e]"><Leaf size={19}/></div><p className="eyebrow mt-5">A beginning, not a blank template</p><h2 className="display mt-2 max-w-[540px] text-[clamp(2rem,5vw,3.3rem)] leading-tight text-[#355345]">Choose what you want this space to hold.</h2><p className="mt-4 max-w-[550px] text-sm leading-7 text-[#748075]">Start with a few optional preferences and a first daily reflection. You decide what belongs here, and your setup is not sent until you consent and sign in.</p><button type="button" className={`${cta} mt-6`} onClick={openQuiz}>Set up my journal <ArrowRight size={15}/></button><p className="mt-4 text-xs text-[#8a8c80]">No profile or recovery history is displayed until you create it.</p></section>}
      {!recoveryQuery.isLoading && !recoveryQuery.isError && !profile && !!readDraft() && <section className={`${panel} mt-6 p-7`}><p className="eyebrow">Saved setup, ready to retry</p><h2 className="display mt-2 text-3xl text-[#355345]">Your first summary is waiting.</h2><p className="mt-3 text-sm leading-6 text-[#748075]">We couldn’t finish saving the setup yet. It remains in this tab temporarily, and your existing preferences have not been replaced.</p><button type="button" disabled={start.isPending} onClick={() => { const draft = readDraft(); if (draft) persistDraft(draft); else setMessage("This setup has expired. Start a new quiz to continue."); }} className={`${cta} mt-5`}>{start.isPending ? "Trying…" : "Try again"} <ArrowRight size={15}/></button></section>}
      {!recoveryQuery.isLoading && profile && <>
        <div className="mt-7 grid gap-5 lg:grid-cols-[.88fr_1.12fr]">
          <section className={`${panel} p-5 sm:p-6`}>
            <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Your chosen routine</p><h2 className="display mt-2 text-2xl text-[#355345]">{supportNames[profile.supportMode]}</h2></div><button type="button" onClick={() => setRoutineOpen(v => !v)} className={tinyButton} aria-expanded={routineOpen} data-testid="button-edit-routine">{routineOpen ? "Close" : "Edit routine"}<ChevronDown size={14} className={routineOpen ? "rotate-180" : ""}/></button></div>
            <div className="mt-5 flex flex-wrap gap-2">{profile.priorities.map(value => { const item = priorityChoices.find(choice => choice.id === value); return <span key={value} className="rounded-full bg-[#edf2ea] px-3 py-2 text-[11px] font-medium text-[#58705d]">{item?.title}</span>; })}</div>
            <ol className="mt-5 space-y-4" aria-label="Your personalized daily protocol">{profile.priorities.map((value, index) => {
              const today = logs.find(item => item.date === localDate());
              const status = value === "food_hydration" ? today?.dietStatus : value === "movement" ? today?.exerciseStatus : value === "meditation" ? today?.meditationStatus : today?.note ? "done" : "not_planned";
              return <li key={value} className="rounded-2xl bg-[#edf2ea] p-4"><div className="flex items-center justify-between gap-3"><h3 className="text-xs font-semibold text-[#405849]">{index + 1}. {priorityChoices.find(item => item.id === value)?.title}</h3><span className="text-[10px] text-[#607863]">{status === "done" ? "Logged: done" : status === "not_done" ? "Logged: not today" : "Not planned"}</span></div><p className="mt-2 text-xs leading-5 text-[#66776b]">{routinePrompts[value]}</p></li>;
            })}</ol><p className="mt-4 text-[11px] leading-5 text-[#788176]">{profile.supportMode === "clinician_supported" ? "Bring these reflections to your clinician to review together." : "You can journal independently. Ask a clinician about symptoms or exercise safety whenever you need guidance."} Adapt or skip any routine; use today’s check-in to document what happened.</p>
            <div className="mt-4 rounded-2xl border border-[#dfe5db] p-4"><h3 className="flex items-center gap-2 text-xs font-semibold text-[#405849]"><ShieldCheck size={14}/>Supplement review</h3><p className="mt-2 text-[11px] leading-5 text-[#788176]">If you take or are considering supplements, review products and possible interactions with a clinician or pharmacist before changes. No supplement or dose is recommended here.</p><a href="https://www.nccih.nih.gov/health/know-science/how-medications-and-supplements-can-interact/talk-with-your-health-care-providers" target="_blank" rel="noreferrer" className="mt-2 inline-block text-[11px] text-[#526c5c] underline">NIH guidance on supplement interactions</a></div>
            {routineOpen && <div className="mt-5 border-t border-[#e6e9df] pt-4"><p className="text-xs leading-5 text-[#768075]">Choose what you want to keep in your routine. These are reflections, not treatment instructions.</p><div className="mt-3 space-y-2">{priorityChoices.map(item => <label key={item.id} className="flex cursor-pointer items-center gap-3 rounded-xl p-2 hover:bg-[#f2f3eb]"><input type="checkbox" checked={priorities.includes(item.id)} onChange={() => togglePriority(item.id)} className="h-4 w-4 accent-[#567b63]"/><span><b className="block text-xs text-[#4a6150]">{item.title}</b><small className="text-[10px] text-[#82877b]">{item.detail}</small></span></label>)}</div><label className="mt-4 block text-xs font-semibold text-[#526b5a]">Support approach<select value={supportMode} onChange={e => setSupportMode(e.target.value as RecoveryPreferences["supportMode"])} className="mt-2 block min-h-11 w-full rounded-xl border border-[#dfe5db] bg-[#fffefa] px-3 text-sm font-normal"><option value="self_guided">Self-guided</option><option value="clinician_supported">With clinician support</option></select></label><button type="button" onClick={saveSetup} disabled={priorities.length === 0 || updateProfile.isPending} className={`${cta} mt-4`}>{updateProfile.isPending ? "Saving…" : "Save routine"}</button>{updateProfile.isError && <p className="mt-3 text-xs text-[#9b5549]">Couldn’t save changes. Please try again.</p>}</div>}
          </section>
          <section className={`${panel} p-5 sm:p-6`}>
            <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">A small check-in</p><h2 className="display mt-2 text-2xl text-[#355345]">{logs.find(log => log.date === localDate()) ? "Today, in your own words" : "Today can be an entry"}</h2></div><button type="button" className={tinyButton} onClick={() => beginEdit()}><PencilLine size={14}/>{logs.some(log => log.date === localDate()) ? "Edit today" : "Start today"}</button></div>
            {logs.find(log => log.date === localDate()) ? <p className="mt-4 text-xs leading-6 text-[#788176]">You’ve already checked in for today. Editing replaces today’s entry; there is one entry per calendar day.</p> : <div className="mt-5 rounded-2xl bg-[#f1f3eb] p-4"><p className="text-sm text-[#536b59]">Nothing to catch up on. Begin when it feels useful.</p><p className="mt-2 text-xs leading-5 text-[#83887d]">No streaks. No missing-day reminders. Just your own record.</p></div>}
          </section>
        </div>
        {editing && <section className={`${panel} mt-5 p-5 sm:p-7`} aria-label="Daily check-in editor"><div className="flex flex-col justify-between gap-4 border-b border-[#e8ebe3] pb-4 sm:flex-row sm:items-end"><div><p className="eyebrow">{logs.some(item => item.date === editing.date) ? "Edit this day · replacing the existing entry" : "A new daily summary"}</p><h2 className="display mt-2 text-2xl text-[#355345]">{dateLabel(editing.date)}</h2></div><label className="text-xs font-medium text-[#64776a]">Calendar day<input type="date" value={editing.date} max={localDate()} onChange={e => setEditing(old => old ? { ...old, date: e.target.value } : old)} className="ml-2 min-h-10 rounded-xl border border-[#dfe5db] bg-[#fffefa] px-3 text-xs"/></label></div>
          <div className="mt-5 grid gap-5 lg:grid-cols-2"><div><h3 className="text-sm font-semibold text-[#405849]">Optional symptom notes</h3><p className="mt-1 text-xs text-[#85897e]">You choose which, if any, are worth tracking.</p><div className="mt-4 space-y-3">{symptomChoices.map(([name, label]) => { const found = editing.symptoms.find(s => s.name === name); return <div key={name} className="rounded-xl border border-[#e5e8df] p-3"><div className="flex items-center justify-between gap-3"><span className="text-xs font-medium text-[#506756]">{label}</span><button type="button" className="text-[11px] font-semibold text-[#68816e]" onClick={() => setEditing(old => old ? { ...old, symptoms: found ? old.symptoms.filter(x => x.name !== name) : replaceSymptom(old.symptoms, name, 0) } : old)}>{found ? "Remove" : "Add"}</button></div>{found && <div className="mt-2 flex items-center gap-3"><input type="range" min="0" max="10" value={found.severity} onChange={e => setEditing(old => old ? { ...old, symptoms: replaceSymptom(old.symptoms, name, Number(e.target.value)) } : old)} className="w-full accent-[#567b63]"/><span className="w-12 text-right text-[10px] text-[#798176]">{found.severity} / 10</span></div>}</div>; })}</div></div>
            <div><h3 className="text-sm font-semibold text-[#405849]">Your chosen routines</h3><p className="mt-1 text-xs text-[#85897e]">No targets or prescribed intensity. Activities can be left unplanned.</p><div className="mt-4 space-y-4">
              {profile.priorities.includes("food_hydration") && <div className="rounded-xl border border-[#e5e8df] p-3"><p className="text-xs font-medium text-[#506756]">Food & hydration</p><div className="mt-2 flex flex-wrap gap-2">{statusOptions.map(([v, label]) => <button key={v} type="button" onClick={() => activitySet("dietStatus", v)} className={`rounded-full border px-3 py-1.5 text-[10px] ${editing.dietStatus === v ? "border-[#77907a] bg-[#edf2ea] text-[#4b6751]" : "border-[#e2e7dd] text-[#798176]"}`}>{label}</button>)}</div><textarea maxLength={2000} value={editing.dietNote} onChange={e => activityNote("dietNote", e.target.value)} placeholder="Optional reflection" className="mt-3 min-h-[62px] w-full rounded-xl border border-[#e2e7dd] p-3 text-xs"/></div>}
              {profile.priorities.includes("movement") && <div className="rounded-xl border border-[#e5e8df] p-3"><p className="text-xs font-medium text-[#506756]">Movement <span className="font-normal text-[#8b8d81]">· only if cleared for you</span></p><div className="mt-2 flex flex-wrap gap-2">{statusOptions.map(([v, label]) => <button key={v} type="button" onClick={() => activitySet("exerciseStatus", v)} className={`rounded-full border px-3 py-1.5 text-[10px] ${editing.exerciseStatus === v ? "border-[#77907a] bg-[#edf2ea] text-[#4b6751]" : "border-[#e2e7dd] text-[#798176]"}`}>{label}</button>)}</div><textarea maxLength={2000} value={editing.exerciseNote} onChange={e => activityNote("exerciseNote", e.target.value)} placeholder="Optional reflection" className="mt-3 min-h-[62px] w-full rounded-xl border border-[#e2e7dd] p-3 text-xs"/></div>}
              {profile.priorities.includes("meditation") && <div className="rounded-xl border border-[#e5e8df] p-3"><p className="text-xs font-medium text-[#506756]">Meditation or a quiet pause</p><div className="mt-2 flex flex-wrap gap-2">{statusOptions.map(([v, label]) => <button key={v} type="button" onClick={() => activitySet("meditationStatus", v)} className={`rounded-full border px-3 py-1.5 text-[10px] ${editing.meditationStatus === v ? "border-[#77907a] bg-[#edf2ea] text-[#4b6751]" : "border-[#e2e7dd] text-[#798176]"}`}>{label}</button>)}</div><label className="mt-3 block text-[10px] text-[#80867a]">Optional duration, not a target <input type="number" min="0" max="240" value={editing.meditationMinutes || ""} onChange={e => setEditing(old => old ? { ...old, meditationMinutes: e.target.value === "" ? 0 : Math.min(240, Math.max(0, Number(e.target.value))) } : old)} className="ml-2 h-9 w-24 rounded-lg border border-[#e2e7dd] px-2 text-xs"/> min</label><textarea maxLength={2000} value={editing.meditationNote} onChange={e => activityNote("meditationNote", e.target.value)} placeholder="Optional reflection" className="mt-3 min-h-[62px] w-full rounded-xl border border-[#e2e7dd] p-3 text-xs"/></div>}
              <label className="block text-xs font-medium text-[#506756]">Pacing reflection <span className="font-normal text-[#8b8d81]">· optional</span><textarea maxLength={2000} value={editing.note} onChange={e => activityNote("note", e.target.value)} placeholder="How did you make room to pause or adjust?" className="mt-2 min-h-[85px] w-full rounded-xl border border-[#e2e7dd] bg-[#fffefa] p-3 text-xs"/></label>
            </div></div></div>
          {logs.some(item => item.date === editing.date) && <p className="mt-4 flex gap-2 rounded-xl bg-[#f4eee5] p-3 text-[11px] leading-5 text-[#766b5f]"><CircleAlert size={15} className="mt-0.5 shrink-0"/>Saving replaces the existing entry for this calendar day.</p>}
          <div className="mt-5 flex flex-col-reverse gap-3 border-t border-[#e8ebe3] pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={() => setEditing(null)} className={tinyButton}>Cancel</button><button type="button" onClick={submitLog} disabled={saveLog.isPending || !editing.date} className={cta}>{saveLog.isPending ? "Saving…" : <><Check size={15}/>Save this summary</>}</button></div>
        </section>}
        <section className={`${panel} mt-5 p-5 sm:p-7`}><div className="flex items-end justify-between gap-4 border-b border-[#e8ebe3] pb-4"><div><p className="eyebrow">Your own history</p><h2 className="display mt-2 text-2xl text-[#355345]">Days you chose to keep</h2></div><span className="text-[10px] text-[#81877c]">{logs.length} {logs.length === 1 ? "entry" : "entries"}</span></div>
          {logs.length === 0 ? <div className="py-9 text-center"><CalendarDays size={22} className="mx-auto text-[#8ba08b]"/><p className="mt-3 text-sm font-medium text-[#536a59]">Your history starts when you do.</p><p className="mt-1 text-xs text-[#858a7f]">No days are pre-filled or assumed.</p></div> : <div className="divide-y divide-[#e9ebe3]">{logs.map((log, index) => <article key={log.date} className="py-5" data-testid={`history-entry-${log.date}`}><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><p className="text-sm font-semibold text-[#405849]">{dateLabel(log.date)}{index === 0 && <span className="ml-2 rounded-full bg-[#edf2ea] px-2 py-1 text-[9px] font-medium text-[#627a65]">Most recent</span>}</p><div className="mt-3 grid gap-x-7 sm:grid-cols-2">{log.symptoms.map((symptom: SymptomEntry) => <p key={symptom.name} className="py-1 text-[11px] text-[#788176]">{symptomChoices.find(item => item[0] === symptom.name)?.[1]} <span className="ml-1 text-[#526e5b]">{symptom.severity}/10</span></p>)}</div></div><div className="flex shrink-0 gap-2"><button type="button" onClick={() => beginEdit(log)} className={tinyButton} aria-label={`Edit ${dateLabel(log.date)}`}><PencilLine size={13}/>Edit</button><button type="button" onClick={() => removeLog(log.date)} disabled={deleteLog.isPending} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#e3d4cc] px-4 text-xs font-semibold text-[#9a5c50] hover:bg-[#f8eeea]" aria-label={`Delete ${dateLabel(log.date)}`}><Trash2 size={13}/>Delete</button></div></div>
              <div className="mt-3 grid gap-0 md:grid-cols-2 md:gap-x-6">{log.dietStatus !== "not_planned" || log.dietNote ? <Readout label="Food & hydration" status={log.dietStatus} note={log.dietNote}/> : null}{log.exerciseStatus !== "not_planned" || log.exerciseNote ? <Readout label="Movement" status={log.exerciseStatus} note={log.exerciseNote}/> : null}{log.meditationStatus !== "not_planned" || log.meditationNote || log.meditationMinutes ? <Readout label="Quiet pause" status={log.meditationStatus} note={`${log.meditationMinutes ? `${log.meditationMinutes} optional minutes · ` : ""}${log.meditationNote}`}/> : null}{log.note && <Readout label="Pacing & notes" status="" note={log.note}/>}</div>
              <p className="mt-3 text-[9px] text-[#98998d]">Saved {new Date(log.updatedAt).toLocaleString()}</p>
            </article>)}</div>}
        </section>
      </>}
      <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#dce3d8] pt-5 text-[10px] text-[#82877c]"><span className="flex items-center gap-2"><Clock3 size={13}/>No streaks. No prescribed progression.</span><Link href="/privacy" className="underline decoration-[#bac9b9] underline-offset-4">Privacy &amp; data controls</Link></footer>
    </div>
  </main>;
}
