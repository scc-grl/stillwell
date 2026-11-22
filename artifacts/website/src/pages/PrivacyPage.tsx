import { useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { useClerk } from "@clerk/react";
import { Link } from "wouter";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card } from "@workspace/stillwell-design-system/components/ui/card";
import { clearDraft } from "@/lib/recovery";

// FOUNDER LEGAL REVIEW REQUIRED: verify processing, sharing, retention and erasure disclosures before launch.
const disclosures = [
  {
    title: "Your journal is private",
    body: "Your daily symptom scores, recovery-plan score, and optional written or dictated notes are saved to your account. Notes are private and are never shown to an invited doctor. Browser dictation is used only to create a note; it does not infer symptom scores.",
  },
  {
    title: "Intake uses your consent",
    body: "Before you agree, your story and answers stay in the intake page. After consent, the story and answers are sent to the configured intake-reading service without your account name, email, or ID. Stillwell saves the structured intake result to your account, not the raw story. Avoid identifying details in the story.",
  },
  {
    title: "Optional weekly note reading",
    body: "You can separately opt in to send one private journal note for a later weekly explanation. TypeSafe reads only that note after basic email/phone removal; account metadata is excluded. Saving the journal entry itself makes no AI call. The note remains private in your account, raw note text is not traced for weekly processing, and this is not full de-identification. It never determines your numeric stage. An invited doctor may see the numeric stage/result, but never the note.",
  },
  {
    title: "Doctor access is optional",
    body: "When you invite a doctor and they accept, they can see your symptom scores, recovery-plan scores, current stage, stage reasons, and stage history. They may change your stage and record a review note. They cannot see your written or dictated journal notes. Invite only someone you know and trust; Stillwell does not verify clinician credentials.",
  },
  {
    title: "Deleting recovery data",
    body: "Delete all recovery data to remove your Stillwell recovery record and end active access. Doctors who previously received your shared information may keep a frozen copy of that information. Your Stillwell sign-in account remains, and these former copies are not erased by this action.",
  },
  {
    title: "Deleting your account",
    body: "Account deletion is separate from deleting recovery data. It removes your account and all recovery records, doctor copies, doctor notes, and access. Doctor accounts remain. If deletion needs a retry, account controls stay available while recovery areas may temporarily be unavailable.",
  },
] as const;

export default function PrivacyPage() {
  const { isSignedIn } = useUser();
  const { signOut } = useClerk();
  const queryClient = useQueryClient();
  async function logout() {
    clearDraft();
    queryClient.clear();
    try { sessionStorage.clear(); } catch {}
    await signOut({ redirectUrl: import.meta.env.BASE_URL || "/" });
  }
  return <main id="main" className="mx-auto min-h-[60dvh] max-w-5xl space-y-7 px-4 py-10 sm:px-8 sm:py-14">
    <header className="space-y-3"><p className="eyebrow">Privacy, plainly</p><h1 className="display text-4xl leading-tight sm:text-5xl">Your notes belong to you.</h1><p className="max-w-3xl text-base leading-7 text-muted-foreground">Stillwell is a private concussion recovery notebook. This page describes the current product behavior and is marked for legal review before launch.</p></header>
    <div className="grid gap-4 md:grid-cols-2">{disclosures.map(({ title, body }) => <Card key={title} className="space-y-3 p-5 sm:p-6"><h2 className="display text-2xl">{title}</h2><p className="text-base leading-7 text-muted-foreground">{body}</p></Card>)}</div>
    <Card className="space-y-3 border-notice-border bg-notice p-5 sm:p-6"><h2 className="font-semibold text-notice-foreground">A clear boundary</h2><p className="text-base leading-7 text-notice-foreground">Stillwell provides general educational information, not a diagnosis, treatment plan, medical clearance, or emergency service. Follow guidance from your clinician. Seek urgent medical care for emergency symptoms.</p><p className="text-base leading-7 text-notice-foreground">Stillwell does not claim HIPAA compliance or end-to-end encryption. Hosted service operators may access information as needed to operate, secure, and support the service.</p></Card>
    <div className="flex flex-wrap gap-3 border-t border-border pt-5">
      {isSignedIn && <><Button asChild className="min-h-12"><Link href="/dashboard/account">Manage account and data</Link></Button><Button variant="outline" className="min-h-12" onClick={() => void logout()}>Sign out</Button></>}
      <Button asChild variant="outline" className="min-h-12"><Link href="/">Return home</Link></Button>
    </div>
    <p className="text-base leading-7 text-muted-foreground">FOUNDER LEGAL REVIEW REQUIRED before launch: confirm service-provider terms, data retention, doctor access, and distinct recovery-data versus full-account deletion behavior.</p>
  </main>;
}
