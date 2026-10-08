import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { useDeleteRecovery, getGetRecoveryQueryKey } from "@workspace/api-client-react";
import { ArrowLeft, Check, ShieldCheck, Trash2 } from "lucide-react";
import { clearDraft } from "@/lib/recovery";
import { useClerk } from "@clerk/react";

function Brand() { return <Link href="/" className="flex items-center gap-3 text-[#29463b]"><span className="brand-mark"/><span className="display text-xl font-semibold">stillwell</span></Link>; }
export default function PrivacyPage() {
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const deletion = useDeleteRecovery();
  const [feedback, setFeedback] = useState("");
  const remove = () => {
    if (!window.confirm("Delete all Stillwell recovery data, including your routine and every daily entry? This does not delete your sign-in account.")) return;
    deletion.mutate(undefined, {
      onSuccess: () => {
        queryClient.setQueryData([...getGetRecoveryQueryKey(), user?.id ?? ""], { profile: null, logs: [] });
        clearDraft(); setFeedback("Your Stillwell recovery data has been deleted. You can begin again whenever you choose.");
      },
      onError: () => setFeedback("We could not delete your data just now. Your existing journal is unchanged. Please try again."),
    });
  };
  const logout = async () => { clearDraft(); queryClient.clear(); await signOut({ redirectUrl: import.meta.env.BASE_URL || "/" }); setLocation("/"); };
  return <main className="min-h-[100dvh] bg-[#f5f4ed] px-5 py-6 sm:px-8">
    <header className="mx-auto flex max-w-4xl items-center justify-between"><Brand/><Link href={isSignedIn ? "/dashboard" : "/"} className="inline-flex items-center gap-2 text-xs font-semibold text-[#587064]"><ArrowLeft size={14}/>Back</Link></header>
    <div className="mx-auto max-w-3xl pb-16 pt-12"><p className="eyebrow">Privacy, plainly</p><h1 className="display mt-3 text-[clamp(2.6rem,7vw,4.5rem)] leading-none text-[#29463b]">Your notes belong to you.</h1><p className="mt-6 max-w-2xl text-base leading-8 text-[#69776c]">A recovery journal is personal. Stillwell asks for explicit consent before creating your journal and keeps your choices under your control.</p>
      <section className="mt-10 grid gap-px overflow-hidden rounded-[26px] border border-[#dce3d8] bg-[#dce3d8] sm:grid-cols-2">
        {[["01", "Consent before saving", "Your quiz answers remain in the page until you explicitly accept. Only then is the setup temporarily held in this browser tab for up to 30 minutes during account creation. It is sent to the recovery service only after you are signed in."], ["02", "Account-restricted storage", "Your preferences, daily reflections, optional symptom ratings, and notes are stored in the hosted database and restricted to your account through the service. Service operators and hosting providers may have access as part of operating, securing, or supporting the service. Stillwell does not claim HIPAA compliance or end-to-end encryption."], ["03", "Access is yours", "Your private dashboard shows your routine and history. You can edit an entry, replace a day’s entry, or remove individual days."], ["04", "Delete when you choose", "Delete one day or remove all Stillwell recovery data from your account. Deleting journal data does not delete your authentication account."]].map(([n, title, body]) => <article key={n} className="bg-[#fbfaf5] p-6 sm:p-7"><span className="display text-2xl text-[#91a18e]">{n}</span><h2 className="mt-4 text-sm font-semibold text-[#385343]">{title}</h2><p className="mt-2 text-xs leading-6 text-[#758075]">{body}</p></article>)}
      </section>
      <div className="mt-8 rounded-[24px] border border-[#e6d8c9] bg-[#f4eee5] p-5 sm:p-6"><div className="flex gap-3"><ShieldCheck size={19} className="mt-0.5 shrink-0 text-[#9a7258]"/><div><h2 className="text-sm font-semibold text-[#66503f]">A clear boundary</h2><p className="mt-2 text-xs leading-6 text-[#786d60]">Stillwell provides educational reflection and user-chosen routine tracking. It is not a diagnosis, treatment plan, or emergency service. If symptoms worsen, seek clinical help; for severe or urgent symptoms, seek emergency care.</p></div></div></div>
      {feedback && <p role="status" className="mt-5 rounded-xl bg-[#eaf0e7] p-4 text-sm text-[#466450]">{feedback}</p>}
      {isSignedIn && <div className="mt-8 flex flex-col gap-3 border-t border-[#dce3d8] pt-6 sm:flex-row"><button type="button" onClick={remove} disabled={deletion.isPending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#d9b7a9] px-5 text-sm font-semibold text-[#9b5549] disabled:opacity-50">{deletion.isPending ? "Deleting…" : <><Trash2 size={15}/>Delete all recovery data</>}</button><button type="button" onClick={logout} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#dce3d8] px-5 text-sm font-semibold text-[#597063]"><Check size={15}/>Sign out</button></div>}
      <p className="mt-8 text-[11px] leading-5 text-[#8a8e82]">Stillwell does not represent this journal as HIPAA compliant or end-to-end encrypted. Records are account-restricted in a hosted database; operator and hosting access may exist. Use the account controls above to access and delete recovery information.</p>
    </div>
  </main>;
}
