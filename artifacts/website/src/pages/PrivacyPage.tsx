import { useLocation } from "wouter";
import { useState } from "react";
import { useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { useDeleteRecovery, getGetRecoveryQueryKey } from "@workspace/api-client-react";
import { Check, ShieldCheck, Trash2 } from "lucide-react";
import { clearDraft } from "@/lib/recovery";
import { useClerk } from "@clerk/react";
import { Card } from "@workspace/stillwell-design-system/components/ui/card";
import { JOURNAL_SHARING_COPY } from "@/components/CareTeamSharingFeature";

// FOUNDER LEGAL REVIEW: all care-team disclosures below need review before release.
const careTeamDisclosures = [
  ["What is shared", "Sharing covers your whole journal: daily symptom ratings, routines, notes, routine focus areas and past entries. A connected clinician can read your journal, but cannot edit it. Your sign-in details are not shared. Entries you delete are removed from the live journal; deletion cannot change a frozen copy a former clinician already holds."],
  ["Who can read it", "Only clinicians you invite, or whose requests you accept, get care-team access. You can share with up to 5 clinicians. Stillwell does not verify clinicians; only share with someone you know. This patient-controlled access is separate from the service-operator and hosting access described above."],
  ["Your consent", "Tapping Send invite is your consent to offer read-only sharing to that clinician; they must accept before they can read it. For a clinician's request, tapping Share my journal is your consent. Stillwell records the consent version and time. Opening a request, creating an account or choosing Not now does not grant access."],
  ["Stopping sharing", "Stopping sharing ends access to new entries and updates right away. The clinician keeps a frozen, read-only copy of your journal and focus areas as they were when sharing stopped. Later edits and deleted days do not change that copy. It stays until the clinician removes it from their patient list, which permanently deletes their copy."],
  ["Deleting all recovery data", "Deleting all recovery data removes your recovery profile, daily entries, active sharing and pending invitations associated with your journal. Before active sharing ends, each connected clinician receives a frozen copy of what was shared up to that point. Copies already held by former clinicians remain with them until they delete them. Your Stillwell sign-in account remains."],
  ["Invitation and request emails", "Invite emails use first names only, not the patient's last name, and contain no symptom ratings, journal entries, routine logs or notes. A clinician's request email includes the clinician's professional name so you know who is asking. The recipient's email address is used for delivery. These emails include a private, expiring link; do not forward it. When email delivery is unavailable, Stillwell identifies that no email was sent."],
];

export default function PrivacyPage() {
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const deletion = useDeleteRecovery();
  const [feedback, setFeedback] = useState("");
  const remove = () => {
    if (!window.confirm("This permanently removes your recovery profile and every daily entry. Your Stillwell sign-in account will remain. Clinicians you've shared with keep what you shared up to now, but they won't see anything new.")) return;
    deletion.mutate(undefined, {
      onSuccess: () => {
        queryClient.setQueryData([...getGetRecoveryQueryKey(), user?.id ?? ""], { profile: null, logs: [] });
        clearDraft(); setFeedback("Your Stillwell recovery data has been deleted. You can begin again whenever you choose.");
      },
      onError: () => setFeedback("We could not delete your data just now. Your existing journal is unchanged. Please try again."),
    });
  };
  const logout = async () => { clearDraft(); queryClient.clear(); await signOut({ redirectUrl: import.meta.env.BASE_URL || "/" }); setLocation("/"); };
  return <main id="main" className="min-h-[55vh] bg-[#f5f4ed] px-5 py-6 sm:px-8">
    <div className="mx-auto max-w-3xl pb-16 pt-12"><p className="eyebrow">Privacy, plainly</p><h1 className="display mt-3 text-[clamp(2.6rem,7vw,4.5rem)] leading-none text-[#29463b]">Your notes belong to you.</h1><p className="mt-6 max-w-2xl text-base leading-8 text-[#69776c]">A recovery journal is personal. Stillwell asks for explicit consent before creating your journal and keeps your choices under your control.</p>
      <section className="mt-10 grid gap-px overflow-hidden rounded-[26px] border border-[#dce3d8] bg-[#dce3d8] sm:grid-cols-2">
        {[
          ["01", "Consent before saving", "Your quiz answers remain in the page until you explicitly accept. Only then is the setup temporarily held in this browser tab for up to 30 minutes during account creation. It is sent to the recovery service only after you are signed in."],
          ["02", "Account-restricted storage", "Your preferences, daily reflections, optional symptom ratings, and notes are stored in the hosted database. Your journal is private unless you choose to share its full history read-only with a clinician you know. Stillwell does not verify clinicians. Service operators and hosting providers may have access as part of operating, securing, or supporting the service. Stillwell does not claim HIPAA compliance or end-to-end encryption."],
          ["03", "Access is yours", "Your private dashboard shows your routine and history. You can edit an entry, replace a day’s entry, or remove individual days. You choose who can read your journal and can stop sharing at any time. When access ends, the clinician keeps a frozen copy of what was shared at that moment, but sees nothing new."],
          ["04", "Delete when you choose", "Delete one day or remove all Stillwell recovery data from your account. Deleting all data first ends active sharing and creates frozen copies for those clinicians. Later patient edits or deletions do not change a former clinician’s frozen copy; it remains until that clinician removes it. Your sign-in account is not deleted."],
          ["05", "Newsletter subscriptions", "The newsletter service stores only the submitted email address and signup timestamp. Repeated email addresses are deduplicated. You can remove an address using the unsubscribe page. Newsletter emails are not sent to analytics or request logs; Stillwell does not send newsletter messages yet."],
        ].map(([n, title, body]) => <article key={n} className="bg-[#fbfaf5] p-6 sm:p-7"><span className="display text-2xl text-[#91a18e]">{n}</span><h2 className="mt-4 text-sm font-semibold text-[#385343]">{title}</h2><p className="mt-2 text-xs leading-6 text-[#758075]">{body}</p></article>)}
      </section>
      {/* FOUNDER LEGAL REVIEW: sharing summary, scope, consent, retention, deletion and email disclosures. */}
      <section aria-labelledby="care-team-privacy" className="mt-8 space-y-5">
        <h2 id="care-team-privacy" className="font-serif text-3xl font-medium text-foreground">Sharing with your care team</h2>
        <p className="text-sm leading-7 text-muted-foreground">{JOURNAL_SHARING_COPY}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {careTeamDisclosures.map(([title, body]) => (
            <Card key={title} className="space-y-3 p-6 shadow-none">
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              <p className="text-sm leading-7 text-muted-foreground">{body}</p>
            </Card>
          ))}
        </div>
      </section>
      <div className="mt-8 rounded-[24px] border border-[#e6d8c9] bg-[#f4eee5] p-5 sm:p-6"><div className="flex gap-3"><ShieldCheck size={19} className="mt-0.5 shrink-0 text-[#9a7258]"/><div><h2 className="text-sm font-semibold text-[#66503f]">A clear boundary</h2><p className="mt-2 text-xs leading-6 text-[#786d60]">Stillwell provides educational reflection and user-chosen routine tracking. It is not a diagnosis, treatment plan, or emergency service. If symptoms worsen, seek clinical help; for severe or urgent symptoms, seek emergency care.</p></div></div></div>
      {feedback && <p data-testid="status-privacy-feedback" role="status" className="mt-5 rounded-xl bg-[#eaf0e7] p-4 text-sm text-[#466450]">{feedback}</p>}
      {isSignedIn && <div className="mt-8 flex flex-col gap-3 border-t border-[#dce3d8] pt-6 sm:flex-row"><button data-testid="button-delete-recovery-data" type="button" onClick={remove} disabled={deletion.isPending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#d9b7a9] px-5 text-sm font-semibold text-[#9b5549] disabled:opacity-50">{deletion.isPending ? "Deleting…" : <><Trash2 size={15}/>Delete all recovery data</>}</button><button data-testid="button-sign-out" type="button" onClick={logout} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#dce3d8] px-5 text-sm font-semibold text-[#597063]"><Check size={15}/>Sign out</button></div>}
      <p className="mt-8 text-[11px] leading-5 text-[#8a8e82]">Stillwell does not represent this journal as HIPAA compliant or end-to-end encrypted. Records are account-restricted in a hosted database; operator and hosting access may exist. Use the account controls above to access and delete recovery information.</p>
    </div>
  </main>;
}
