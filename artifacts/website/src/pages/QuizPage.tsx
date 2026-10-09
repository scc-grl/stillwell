import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useUser } from "@clerk/react";
import { ArrowLeft, ArrowRight, Check, CircleHelp, Leaf, ShieldCheck } from "lucide-react";
import type { RecoveryLogInput, RecoveryPreferences, SymptomEntry } from "@workspace/api-client-react";
import { emptyLog, localDate, priorityChoices, replaceSymptom, symptomChoices, writeDraft } from "@/lib/recovery";

const button = "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#315b49] px-6 text-sm font-semibold text-[#fbfaf4] transition hover:bg-[#274b3b] disabled:cursor-not-allowed disabled:opacity-45";
const choiceCard = "rounded-[20px] border p-4 text-left transition";
export default function QuizPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);
  const [supportMode, setSupportMode] = useState<RecoveryPreferences["supportMode"]>("self_guided");
  const [priorities, setPriorities] = useState<RecoveryPreferences["priorities"]>(["pacing"]);
  const [log, setLog] = useState<RecoveryLogInput>(() => emptyLog());
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const togglePriority = (value: RecoveryPreferences["priorities"][number]) => setPriorities(current => current.includes(value) ? current.filter(x => x !== value) : [...current, value]);
  const next = () => { setError(""); setStep(s => Math.min(2, s + 1)); };
  const continueToAccount = () => {
    if (!consent) { setError("Please review and accept before creating your private journal."); return; }
    try {
      writeDraft({ preferences: { supportMode, priorities }, consentAccepted: true, firstLog: { ...log, date: localDate() } }, isSignedIn ? user?.id ?? null : null);
      setLocation(isSignedIn ? "/dashboard" : "/sign-up");
    } catch { setError("This browser could not keep your consented setup in this tab. Please enable session storage and try again."); }
  };
  if (!isLoaded) return <main className="min-h-[100dvh] animate-pulse bg-[#f5f4ed] p-8"><div className="mx-auto h-12 max-w-3xl rounded-2xl bg-[#e8ece3]"/></main>;
  return <main className="min-h-[100dvh] bg-[#f5f4ed] px-4 pb-12 pt-5 sm:px-8">
    <header className="mx-auto flex max-w-5xl items-center justify-between">
      <Link href="/" className="flex items-center gap-3 text-[#29463b]"><span className="brand-mark" aria-hidden="true"/><span className="display text-xl font-semibold tracking-tight">stillwell</span></Link>
      <span className="text-xs text-[#738176]">A private recovery journal</span>
    </header>
    <div className="mx-auto mt-8 max-w-[760px]">
      <div className="mb-8 flex items-center justify-between gap-5">
        <div><p className="eyebrow">A small beginning</p><h1 className="display mt-2 text-[clamp(2rem,6vw,3.5rem)] leading-tight text-[#29463b]">{["What would feel useful?", "A note about today", "Your privacy, first"][step]}</h1></div>
        <span className="rounded-full bg-[#e8eee5] px-3 py-2 text-xs font-semibold text-[#567263]">{String(step + 1).padStart(2, "0")} / 03</span>
      </div>
      <div className="mb-7 h-1 rounded-full bg-[#e1e6dc]"><div className="h-1 rounded-full bg-[#78917b] transition-all" style={{ width: `${((step + 1) / 3) * 100}%` }} /></div>
      <section className="rounded-[28px] border border-[#dde4d9] bg-[#fbfaf5] p-5 shadow-[0_20px_60px_rgba(45,67,51,.05)] sm:p-8">
        {step === 0 && <div className="space-y-8">
          <fieldset><legend className="text-sm font-semibold text-[#334c3e]">How would you like Stillwell to fit alongside your recovery?</legend><div className="mt-4 grid gap-3 sm:grid-cols-2">
            {([["self_guided", "Self-guided", "A personal place to notice patterns and shape gentle routines."], ["clinician_supported", "With clinician support", "Keep your own journal, with room to bring reflections to a clinician."]] as const).map(([id, title, text]) => <button type="button" key={id} onClick={() => setSupportMode(id)} aria-pressed={supportMode === id} className={`${choiceCard} ${supportMode === id ? "border-[#6c8b74] bg-[#edf2ea]" : "border-[#e1e5dc] bg-white/40 hover:border-[#aebeaa]"}`}><span className="flex items-center justify-between text-sm font-semibold text-[#385544]">{title}{supportMode === id && <Check size={16} />}</span><span className="mt-2 block text-xs leading-5 text-[#748075]">{text}</span></button>)}
          </div></fieldset>
          <fieldset><legend className="text-sm font-semibold text-[#334c3e]">Choose one or more areas you want to make room for.</legend><div className="mt-4 grid gap-2 sm:grid-cols-2">{priorityChoices.map(item => <button type="button" key={item.id} onClick={() => togglePriority(item.id)} aria-pressed={priorities.includes(item.id)} className={`${choiceCard} flex items-start gap-3 ${priorities.includes(item.id) ? "border-[#6c8b74] bg-[#edf2ea]" : "border-[#e1e5dc] bg-white/40 hover:border-[#aebeaa]"}`}><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${priorities.includes(item.id) ? "border-[#54755f] bg-[#54755f] text-white" : "border-[#cbd5c9]"}`}>{priorities.includes(item.id) && <Check size={12}/>}</span><span><b className="block text-sm text-[#385544]">{item.title}</b><small className="mt-1 block text-xs leading-5 text-[#748075]">{item.detail}</small></span></button>)}</div><p className="mt-2 text-[11px] text-[#857f70]">These are your chosen areas, not a prescribed care plan.</p></fieldset>
        </div>}
        {step === 1 && <div className="space-y-7">
          <div className="flex gap-3 rounded-2xl bg-[#edf2ea] p-4"><CircleHelp className="mt-0.5 shrink-0 text-[#6c8974]" size={18}/><p className="text-xs leading-5 text-[#617265]">Only record what you choose. Leave every symptom blank if you would rather not track it.</p></div>
          <fieldset><legend className="text-sm font-semibold text-[#334c3e]">Anything you want to notice today?</legend><div className="mt-4 space-y-4">{symptomChoices.map(([name, label]) => {
            const item = log.symptoms.find(s => s.name === name);
            return <div key={name} className="rounded-2xl border border-[#e2e6dc] p-4"><div className="flex items-center justify-between gap-4"><label htmlFor={`symptom-${name}`} className="text-sm font-medium text-[#405849]">{label}</label><button type="button" aria-pressed={!!item} aria-label={`${item ? "Remove" : "Add"} ${label}`} onClick={() => setLog(v => ({ ...v, symptoms: item ? v.symptoms.filter(s => s.name !== name) : replaceSymptom(v.symptoms, name, 0) }))} className={`rounded-full px-3 py-1.5 text-[11px] ${item ? "bg-[#e7eee5] text-[#4c6d57]" : "bg-[#f0efe8] text-[#727c71]"}`}>{item ? "Tracking" : "Add if useful"}</button></div>{item && <div className="mt-3"><div className="flex justify-between text-[11px] text-[#778176]"><span>Less noticeable</span><span>More noticeable · {item.severity}/10</span></div><input id={`symptom-${name}`} type="range" min="0" max="10" value={item.severity} onChange={e => setLog(v => ({ ...v, symptoms: replaceSymptom(v.symptoms, name, Number(e.target.value)) }))} className="mt-2 w-full accent-[#567b63]"/></div>}</div>;
          })}</div></fieldset>
          <fieldset><legend className="text-sm font-semibold text-[#334c3e]">How did your chosen routine areas fit today?</legend><div className="mt-3 space-y-4">{priorities.map(priority => {
            const map = { food_hydration: ["Food & hydration", "dietStatus", "dietNote"], movement: ["Movement", "exerciseStatus", "exerciseNote"], meditation: ["Quiet pause", "meditationStatus", "meditationNote"], pacing: ["Pacing reflection", "note", "note"] } as const;
            const [label, statusKey, noteKey] = map[priority];
            const status = statusKey === "dietStatus" ? log.dietStatus : statusKey === "exerciseStatus" ? log.exerciseStatus : statusKey === "meditationStatus" ? log.meditationStatus : undefined;
            const setStatus = (value: "done" | "not_done" | "not_planned") => setLog(v => statusKey === "dietStatus" ? { ...v, dietStatus: value } : statusKey === "exerciseStatus" ? { ...v, exerciseStatus: value } : statusKey === "meditationStatus" ? { ...v, meditationStatus: value } : v);
            const note = noteKey === "dietNote" ? log.dietNote : noteKey === "exerciseNote" ? log.exerciseNote : noteKey === "meditationNote" ? log.meditationNote : log.note;
            const setNote = (value: string) => setLog(v => noteKey === "dietNote" ? { ...v, dietNote: value } : noteKey === "exerciseNote" ? { ...v, exerciseNote: value } : noteKey === "meditationNote" ? { ...v, meditationNote: value } : { ...v, note: value });
            return <div key={priority} className="rounded-2xl border border-[#e2e6dc] p-4"><p className="text-sm font-medium text-[#405849]">{label}</p>{status !== undefined && <div className="mt-2 flex flex-wrap gap-2">{([["done", "It fit"], ["not_done", "Not today"], ["not_planned", "Not planned"]] as const).map(([value, title]) => <button key={value} type="button" onClick={() => setStatus(value)} className={`rounded-full border px-3 py-1.5 text-[11px] ${status === value ? "border-[#78917b] bg-[#edf2ea] text-[#42614b]" : "border-[#e1e5dc] text-[#788176]"}`}>{title}</button>)}</div>}{priority === "meditation" && <label className="mt-3 block text-[11px] text-[#7d8479]">Optional duration, not a target <input type="number" min="0" max="240" value={log.meditationMinutes || ""} onChange={e => setLog(v => ({ ...v, meditationMinutes: e.target.value === "" ? 0 : Math.min(240, Math.max(0, Number(e.target.value))) }))} className="ml-2 h-9 w-24 rounded-lg border border-[#e1e5dc] bg-[#fffefa] px-2 text-xs"/> min</label>}<textarea maxLength={2000} value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note for yourself" className="mt-3 min-h-[68px] w-full resize-y rounded-xl border border-[#e1e5dc] bg-[#fffefa] p-3 text-xs text-[#405849] placeholder:text-[#9a9c8e]"/></div>;
          })}</div><label className="mt-5 block text-sm font-semibold text-[#334c3e]" htmlFor="first-note">Anything else you want to remember? <span className="font-normal text-[#8a8b7f]">Optional</span></label><textarea id="first-note" maxLength={2000} value={log.note} onChange={e => setLog(v => ({ ...v, note: e.target.value }))} className="mt-2 min-h-[90px] w-full rounded-xl border border-[#e1e5dc] bg-[#fffefa] p-3 text-sm" placeholder="Your words, for you."/><p className="mt-2 text-[11px] text-[#85897d]">No durations are goals. If you record a pause, the time is optional.</p></fieldset>
        </div>}
        {step === 2 && <div className="space-y-6">
          <div className="rounded-2xl border border-[#dce5d9] p-4"><p className="text-sm font-semibold text-[#3d5948]">Your first summary · {localDate()}</p><p className="mt-2 text-xs leading-5 text-[#66776b]">{supportMode === "self_guided" ? "Self-guided" : "With clinician support"} · {priorityChoices.filter(item => priorities.includes(item.id)).map(item => item.title).join(", ")}</p><ul className="mt-3 space-y-1 text-xs text-[#66776b]">{log.symptoms.map(item => <li key={item.name}>{symptomChoices.find(choice => choice[0] === item.name)?.[1]}: {item.severity}/10</li>)}</ul><p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-[#66776b]">{log.note || "No additional reflection entered."}</p><p className="mt-2 text-[11px] text-[#7e857a]">Use Back to review or change today's activity details before saving.</p></div>
          <div className="flex gap-3 rounded-2xl border border-[#dce5d9] bg-[#edf2ea] p-4"><ShieldCheck size={19} className="mt-0.5 shrink-0 text-[#567b63]"/><div><p className="text-sm font-semibold text-[#3d5948]">You are in control of this journal.</p><p className="mt-1 text-xs leading-5 text-[#66776b]">Stillwell is an educational, user-chosen reflection tool. It does not diagnose, prescribe treatment, or replace clinical care. You can choose self-guided use or optional clinician support at any time.</p></div></div>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#e1e5dc] bg-[#fffefa] p-4"><input type="checkbox" checked={consent} onChange={e => { setConsent(e.target.checked); setError(""); }} className="mt-1 h-4 w-4 accent-[#567b63]"/><span className="text-sm leading-6 text-[#4b6052]">I explicitly consent to Stillwell storing the preferences and journal entry I chose above in my account. I understand I can access and delete these recovery records from my account.</span></label>
          <div className="rounded-2xl border border-[#e7d6c7] bg-[#f5eee5] p-4"><p className="text-xs font-semibold text-[#775943]">Not for a new injury or an emergency</p><p className="mt-1 text-xs leading-5 text-[#7c6f62]">If symptoms are worsening, contact a clinician. Severe or urgent symptoms need emergency care now.</p></div>
          {error && <p role="alert" className="rounded-xl bg-[#f9e9e5] p-3 text-xs text-[#9b4f43]">{error}</p>}
          <p className="text-[11px] leading-5 text-[#7e857a]">Before you make an account, your answers stay on this page. After you accept, the setup is temporarily kept in this tab up to 30 minutes during signup so it can survive sign-in or an OAuth return. It is not sent until you are signed in.</p>
        </div>}
        <div className="mt-8 flex flex-col-reverse justify-between gap-3 border-t border-[#e7e9df] pt-5 sm:flex-row">
          {step > 0 ? <button type="button" onClick={() => setStep(s => s - 1)} className="inline-flex min-h-12 items-center gap-2 rounded-full px-4 text-sm font-semibold text-[#61766a]"><ArrowLeft size={16}/>Back</button> : <Link href="/" className="inline-flex min-h-12 items-center rounded-full px-4 text-sm font-semibold text-[#61766a]">Leave setup</Link>}
          {step < 2 ? <button type="button" onClick={next} disabled={step === 0 && priorities.length === 0} className={button}>Continue <ArrowRight size={16}/></button> : <button type="button" onClick={continueToAccount} disabled={!consent} className={button}>{isSignedIn ? "Accept & save first summary" : "Accept & create account"} <ArrowRight size={16}/></button>}
        </div>
      </section>
      <p className="mt-5 text-center text-[11px] text-[#8a8b80]"><Leaf size={13} className="mr-1 inline"/>Your first summary is yours to keep, revise, or remove.</p>
    </div>
  </main>;
}
