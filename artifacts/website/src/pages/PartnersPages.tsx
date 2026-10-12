import { useEffect, useRef, useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUser } from "@clerk/react";
import { useSignUp } from "@clerk/react/legacy";
import { ArrowRight, ArrowUpRight, Check, Clipboard, MapPin, Search, ShieldCheck } from "lucide-react";
import { Link, Redirect, useLocation, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetClinicianProfileQueryKey,
  getGetPublicClinicianQueryKey,
  getListClinicianProfilesForAdminQueryKey,
  getListPartnershipRequestsQueryKey,
  getListPublicCliniciansQueryKey,
  getGetAccountTypeQueryKey,
  useCompleteAccountRegistration,
  useCreateAccountRegistrationIntent,
  useCreatePartnershipRequest,
  useGetAccountType,
  useGetClinicianProfile,
  useGetPublicClinician,
  useListClinicianProfilesForAdmin,
  useListPartnershipRequests,
  useListPublicClinicians,
  useSaveClinicianProfile,
  useUpdateClinicianVerification,
} from "@workspace/api-client-react";
import type { ClinicianProfileInput, PartnerRequestInput, PartnerOrganizationType, PublicClinician } from "@workspace/api-client-react";
import { Button } from "@workspace/stillwell-design-system/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/stillwell-design-system/components/ui/card";
import { Checkbox } from "@workspace/stillwell-design-system/components/ui/checkbox";
import { Input } from "@workspace/stillwell-design-system/components/ui/input";
import { Textarea } from "@workspace/stillwell-design-system/components/ui/textarea";
import { PublicLayout } from "@/components/PublicSite";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { clearAccountChoice, clearRegistrationIntent, readRegistrationIntent, storeRegistrationIntent } from "@/lib/account";

const organizationTypes = [
  ["sports_program_or_club", "Sports program or club"],
  ["university_athletics", "University athletics"],
  ["university_research_team", "University research team"],
  ["clinic_network", "Clinic network"],
  ["community_or_advocacy_group", "Community or advocacy group"],
  ["other", "Other"],
] as const;
const supportedRanges = ["1-25", "26-100", "101-500", "501-2000", "2000+"] as const;

const partnerSchema = z.object({
  organizationName: z.string().trim().min(1, "Enter your organization name.").max(180),
  organizationType: z.enum(["sports_program_or_club", "university_athletics", "university_research_team", "clinic_network", "community_or_advocacy_group", "other"]),
  contactName: z.string().trim().min(1, "Enter your name.").max(120),
  contactRole: z.string().trim().min(1, "Enter your role.").max(120),
  workEmail: z.string().trim().email("Enter a valid work email.").max(254),
  phone: z.string().max(40).optional(),
  peopleSupported: z.enum(supportedRanges),
  message: z.string().max(2000).optional(),
});
type PartnerValues = z.infer<typeof partnerSchema>;

function Eyebrow({ children }: { children: string }) {
  return <p className="eyebrow">{children}</p>;
}

function SectionHeading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy?: string }) {
  return <div className="max-w-2xl"><Eyebrow>{eyebrow}</Eyebrow><h2 className="display mt-3 text-3xl leading-tight tracking-tight text-foreground sm:text-4xl">{title}</h2>{copy && <p className="mt-4 text-base leading-7 text-muted-foreground">{copy}</p>}</div>;
}

function SampleReflection() {
  const bars = [70, 60, 65, 45, 50, 35, 30];
  return <div className="partner-example-grain relative isolate mx-auto w-full max-w-xl overflow-hidden rounded-[calc(var(--radius)*1.75)] bg-secondary p-5 sm:p-8">
    <span aria-hidden="true" className="absolute left-0 top-0 z-0 h-56 w-56 rounded-full bg-primary/10"/>
    <span aria-hidden="true" className="absolute bottom-0 right-0 z-0 h-72 w-72 rounded-full bg-accent/40"/>
    <Card className="relative z-10 border-card-border bg-card shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-foreground">Shared with you by Jordan</p><span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">Example</span></div>
        <CardDescription>Headaches · last 7 days · less to more noticeable, 0–10</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex h-36 items-end justify-between gap-2 border-b border-border px-2 pb-2" aria-label="Example symptom ratings Monday through Sunday">
          {bars.map((bar, index) => <div key={index} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"><div className="w-full rounded-t-md bg-primary/70" style={{ height: `${bar}%` }}/><span className="text-[10px] text-muted-foreground">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index]}</span></div>)}
        </div>
        <div className="mt-5 rounded-lg bg-secondary p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Note for you</p>
          <p className="mt-2 text-sm leading-6 text-secondary-foreground">Screens felt easier after lunch this week. Want to ask about returning to half days.</p>
        </div>
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-2 text-xs text-accent-foreground"><ShieldCheck size={15}/> Jordan chooses what you see</p>
      </CardContent>
    </Card>
  </div>;
}

export function PartnersLandingPage() {
  const [, setLocation] = useLocation();
  const setupPaused = new URLSearchParams(window.location.search).get("setup") === "paused";
  const futureClinicianTools = [
    "The journal areas your patient chooses to share with you",
    "How noticeable symptoms have felt over time",
    "Notes they mark for you ahead of a visit",
    "Alerts for the symptoms you choose to follow, as soon as a patient shares an entry",
    "Send a recommendation when part of their protocol doesn't seem to fit how they're doing",
    "Join a community of clinicians and therapists sharing best practices and the latest concussion studies",
  ];
  const documentedBaseline = [
    "A consistent, dated record of how your patient says they've been feeling, written between visits rather than recalled in the room",
    "Establish their baseline early, so you can tell what's typical for them from what has really changed, at rest, at work or school, and in training",
    "Walk into each appointment with the trend already in front of you",
    "Built on trust: patients choose what they share and can stop any time",
  ];
  const waysToWork = [
    ["Clinicians & practices", "Grow your practice", "Planned: get matched with nearby patients who need your specialty. Today, people can find verified, opted-in public profiles; there is no automatic matching or in-app patient connection.", "/partners/join"],
    ["Athletic & university programs", "Support every athlete in your program", "Planned: one place across sports and departments to note recovery after a head injury and reach resources and specialists beyond the usual sports medicine team. Athletes would choose what staff see; no program is connected today.", "/partners/request?type=sports_program_or_club"],
    ["University research", "Advance concussion research", "Planned: list an approved study so Stillwell users can learn about it and choose to take part. Nobody would be enrolled or shared with a study unless they opt in; study listings are not available today.", "/partners/request?type=university_research_team"],
  ];
  return <PublicLayout><main id="main">
    {setupPaused && <section className="mx-auto max-w-6xl px-5 pt-8 sm:px-8 lg:px-12"><Card role="status"><CardHeader><CardTitle className="display text-xl">Your clinician setup is paused</CardTitle><CardDescription>Your details are saved in this browser for this session only. They are not saved to Stillwell yet.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-3"><Button asChild data-testid="link-resume-clinician-setup"><Link href="/partners/join?step=3">Continue setup</Link></Button><Button variant="outline" data-testid="button-discard-clinician-setup" onClick={() => { clearRegistrationIntent(); clearClinicianSetupDraft(); setLocation("/partners"); }}>Discard draft</Button></CardContent></Card></section>}
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 sm:px-8 lg:grid-cols-2 lg:gap-14 lg:px-12 lg:py-20">
      <div><Eyebrow>FOR CLINICIANS, PROGRAMS &amp; RESEARCHERS</Eyebrow><h1 className="display mt-5 max-w-2xl text-4xl leading-tight tracking-tight text-primary sm:text-5xl lg:text-6xl">Grow your practice, support your athletes, advance the research.</h1>
        <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground">Stillwell is a private, self-guided recovery journal for concussion and post-concussive symptoms. As sharing tools are developed, people will be able to choose whether to share with a clinician, their program's care team, or a study they opt into.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Button asChild data-testid="link-create-clinician-account"><Link href="/partners/join">Create a clinician account <ArrowRight/></Link></Button><Button asChild variant="outline" data-testid="link-partner-with-stillwell"><Link href="/partners/request">Partner with Stillwell <ArrowUpRight/></Link></Button></div>
        <p className="mt-5 max-w-lg text-sm leading-6 text-muted-foreground">Clinician accounts are separate from patient accounts. Patient reflections are not shared by default, and clinician sharing tools are still in development.</p>
      </div><SampleReflection/>
    </section>
    <section className="border-y border-border bg-secondary/50"><div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:px-12"><SectionHeading eyebrow="Two ways to connect" title="Your patients bring you in, or find you."/><div className="grid gap-4 sm:grid-cols-2">
      {[["A patient invites you", "Planned: someone already using Stillwell could invite you by email. Patient-to-clinician invites and shared journals are not available yet; the optional invite code only stays on your clinician profile."], ["You're matched with patients", "You can opt in to a public directory profile after manual licence verification. Find your clinician is a directory, not an automatic matching or patient-connection service."]].map(([title, copy]) => <Card key={title}><CardHeader><CardTitle className="display text-2xl">{title}</CardTitle><CardDescription className="leading-6">{copy}</CardDescription></CardHeader></Card>)}
    </div></div></section>
    <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:px-12 lg:py-20"><SectionHeading eyebrow="Getting set up" title="Four short steps to your clinician account"/>
      <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{["Choose your role", "Create your account", "Add your practice", "Confirm and connect"].map((step, i) => <div key={step} className="border-t border-border pt-4"><span className="display text-3xl text-muted-foreground">0{i + 1}</span><h3 className="mt-3 text-base font-semibold text-foreground">{step}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{["Tell us whether you are an individual clinician or representing an organization.", "Set up a separate clinician account with your work email.", "Add your professional details and choose whether to appear in the directory.", "Verify your email, then save your profile for manual licence review."][i]}</p></div>)}</div>
    </section>
    <section className="bg-secondary/50"><div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:px-12 lg:py-20"><SectionHeading eyebrow="What could be possible" title="Built around a documented baseline"/><div className="mt-8 grid gap-5 md:grid-cols-2">
      <Card><CardHeader><CardTitle className="display text-2xl">What you can do</CardTitle><CardDescription>Planned clinician tools — not available yet. Patient journal sharing is not currently supported.</CardDescription></CardHeader><CardContent><ul className="space-y-3">{futureClinicianTools.map(item => <li key={item} className="flex gap-3 text-sm leading-6 text-muted-foreground"><Check size={17} className="mt-1 shrink-0 text-primary"/><span>{item}</span></li>)}</ul></CardContent></Card>
      <Card><CardHeader><CardTitle className="display text-2xl">A documented baseline</CardTitle><CardDescription>A future view shaped by each person’s choices.</CardDescription></CardHeader><CardContent><ul className="space-y-3">{documentedBaseline.map(item => <li key={item} className="flex gap-3 text-sm leading-6 text-muted-foreground"><Check size={17} className="mt-1 shrink-0 text-primary"/><span>{item}</span></li>)}</ul></CardContent></Card>
    </div></div></section>
    <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:px-12 lg:py-20"><SectionHeading eyebrow="THREE WAYS TO WORK WITH STILLWELL" title="Which one sounds like you?"/><div className="mt-8 grid gap-5 md:grid-cols-3">{waysToWork.map(([audience, title, copy, href], i) => <Card key={audience}><CardHeader><p className="text-xs font-semibold uppercase tracking-widest text-primary">{audience}</p><CardTitle className="display mt-2 text-xl">{title}</CardTitle><CardDescription className="leading-6">{copy}</CardDescription></CardHeader><CardContent><p className="text-xs leading-5 text-muted-foreground">{i === 0 ? "Clinician directory listings require manual licence verification." : "Partnership conversations are exploratory; no organization is currently listed as a partner."}</p><Button asChild variant="link" data-testid={`link-persona-${i}`}><Link href={href}>Learn how to connect <ArrowRight/></Link></Button></CardContent></Card>)}</div></section>
    <section className="px-5 pb-16 sm:px-8 lg:px-12"><div className="mx-auto max-w-6xl rounded-xl bg-primary px-6 py-10 text-primary-foreground sm:px-10"><div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="display text-3xl sm:text-4xl">Ready when you are.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-primary-foreground/80">Start with a clinician profile or tell us about an organization.</p></div><div className="flex flex-col gap-3 sm:flex-row"><Button asChild variant="secondary" data-testid="link-clinician-cta"><Link href="/partners/join">Create a clinician account</Link></Button><Button asChild variant="outline" className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10" data-testid="link-partner-cta"><Link href="/partners/request">Partner with Stillwell</Link></Button></div></div></div><p className="mx-auto mt-5 max-w-6xl text-xs leading-5 text-muted-foreground">Stillwell is an educational, user-chosen reflection tool. It does not diagnose, prescribe treatment, or replace clinical care.</p></section>
  </main></PublicLayout>;
}

export function PartnerRequestPage() {
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const requestedType = params.get("type");
  const defaultType = organizationTypes.some(([value]) => value === requestedType) ? requestedType as PartnerOrganizationType : "other";
  const [saved, setSaved] = useState(false);
  const createRequest = useCreatePartnershipRequest();
  const queryClient = useQueryClient();
  const form = useForm<PartnerValues>({
    resolver: zodResolver(partnerSchema),
    defaultValues: { organizationName: "", organizationType: defaultType, contactName: "", contactRole: "", workEmail: "", phone: "", peopleSupported: "1-25", message: "" },
  });
  const submit = (values: PartnerValues) => {
    const data: PartnerRequestInput = { ...values, phone: values.phone?.trim() || null, message: values.message?.trim() || null };
    createRequest.mutate({ data }, { onSuccess: () => { void queryClient.invalidateQueries({ queryKey: getListPartnershipRequestsQueryKey() }); setSaved(true); } });
  };
  return <PublicLayout><main id="main" className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
    <section className="mx-auto max-w-3xl"><Eyebrow>Programs &amp; research</Eyebrow><h1 className="display mt-4 text-4xl leading-tight text-primary sm:text-5xl">Tell Stillwell about your organization</h1><p className="mt-4 text-base leading-7 text-muted-foreground">Share a little context about your program, clinic, or research team. The Stillwell team can review your request and follow up from the admin list.</p>
      {saved ? <Card className="mt-8"><CardHeader><CardTitle className="display text-2xl">Request received</CardTitle><CardDescription data-testid="status-partner-request-success" role="status" className="text-base leading-7">Your request is with the Stillwell team. They’ll reply by email with next steps.</CardDescription></CardHeader><CardContent><p className="text-sm leading-6 text-muted-foreground">Notifications are not configured yet; the team can follow up from the admin list.</p><Button className="mt-5" variant="outline" onClick={() => setLocation("/partners")}>Back to partners</Button></CardContent></Card> :
      <Card className="mt-8"><CardHeader><CardTitle>Organization request</CardTitle><CardDescription>All required fields are marked. Your contact details are used for follow-up only.</CardDescription></CardHeader><CardContent>
        <Form {...form}><form onSubmit={form.handleSubmit(submit)} className="space-y-5" noValidate>
          <FormField control={form.control} name="organizationName" render={({field})=><FormItem><FormLabel>Organization name</FormLabel><FormControl><Input {...field} data-testid="input-organization-name" autoComplete="organization"/></FormControl><FormMessage/></FormItem>}/>
          <fieldset aria-describedby={form.formState.errors.organizationType ? "organization-type-error" : undefined}><legend className="mb-2 text-sm font-medium text-foreground">Organization type</legend><div className="flex flex-wrap gap-2">{organizationTypes.map(([value, label])=><Button key={value} type="button" variant={form.watch("organizationType") === value ? "secondary" : "outline"} size="sm" data-testid={`button-org-type-${value}`} onClick={()=>form.setValue("organizationType", value, {shouldValidate:true})}>{label}</Button>)}</div>{form.formState.errors.organizationType?.message&&<p id="organization-type-error" role="alert" className="mt-1.5 text-sm text-destructive">{form.formState.errors.organizationType.message}</p>}</fieldset>
          <div className="grid gap-5 sm:grid-cols-2"><FormField control={form.control} name="contactName" render={({field})=><FormItem><FormLabel>Your name</FormLabel><FormControl><Input {...field} data-testid="input-contact-name" autoComplete="name"/></FormControl><FormMessage/></FormItem>}/><FormField control={form.control} name="contactRole" render={({field})=><FormItem><FormLabel>Your role</FormLabel><FormControl><Input {...field} data-testid="input-contact-role"/></FormControl><FormMessage/></FormItem>}/></div>
          <div className="grid gap-5 sm:grid-cols-2"><FormField control={form.control} name="workEmail" render={({field})=><FormItem><FormLabel>Work email</FormLabel><FormControl><Input {...field} data-testid="input-work-email" type="email" autoComplete="email" required/></FormControl><FormMessage/></FormItem>}/><FormField control={form.control} name="phone" render={({field})=><FormItem><FormLabel>Phone <span className="font-normal text-muted-foreground">(optional)</span></FormLabel><FormControl><Input {...field} data-testid="input-phone" type="tel" autoComplete="tel"/></FormControl><FormMessage/></FormItem>}/></div>
          <FormField control={form.control} name="peopleSupported" render={({field})=><FormItem><FormLabel>Approximate people supported</FormLabel><FormControl><select {...field} data-testid="select-people-supported" className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">{supportedRanges.map(range=><option key={range} value={range}>{range}</option>)}</select></FormControl><FormMessage/></FormItem>}/>
          <FormField control={form.control} name="message" render={({field})=><FormItem><FormLabel>Anything else you’d like us to know? <span className="font-normal text-muted-foreground">(optional)</span></FormLabel><FormControl><Textarea {...field} data-testid="input-request-message" rows={4}/></FormControl><FormMessage/></FormItem>}/>
          {createRequest.isError && <p data-testid="status-partner-request-error" role="alert" className="text-sm text-destructive">We couldn’t save your request just now. Please try again.</p>}
          <Button type="submit" disabled={createRequest.isPending} data-testid="button-submit-partner-request">{createRequest.isPending ? "Saving request…" : "Send request"}</Button>
        </form></Form>
      </CardContent></Card>}
    </section>
  </main></PublicLayout>;
}

export function FindClinicianPage() {
  const [search, setSearch] = useState("");
  const clinicians = useListPublicClinicians({ query: { queryKey: getListPublicCliniciansQueryKey() } });
  const items = (clinicians.data ?? []).filter(item => `${item.displayName} ${item.profession} ${item.practiceName} ${item.location} ${item.areas.join(" ")}`.toLowerCase().includes(search.toLowerCase()));
  return <PublicLayout><main id="main" className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:px-12 lg:py-16"><Eyebrow>Find your clinician</Eyebrow><h1 className="display mt-4 text-4xl text-primary sm:text-5xl">Find a clinician</h1><p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">Browse clinicians who have opted into the directory and had their professional licence verified. Patient reflections are not shared through this directory.</p>
    <label className="mt-7 flex max-w-xl items-center gap-3 rounded-lg border border-input bg-card px-3"><Search size={18} className="text-muted-foreground"/><Input data-testid="input-clinician-search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search by name, area, practice, or location" className="border-0 bg-transparent shadow-none focus-visible:ring-0"/></label>
    {clinicians.isPending ? <div role="status" data-testid="status-directory-loading" className="mt-8 grid gap-4 sm:grid-cols-2"><div className="h-44 animate-pulse rounded-lg bg-secondary"/><div className="h-44 animate-pulse rounded-lg bg-secondary"/></div> :
      clinicians.isError ? <Card className="mt-8"><CardHeader><CardTitle>Directory unavailable</CardTitle><CardDescription>We couldn’t load the clinician directory.</CardDescription></CardHeader><CardContent><Button variant="outline" onClick={()=>void clinicians.refetch()}>Try again</Button></CardContent></Card> :
      items.length === 0 ? <Card className="mt-8"><CardHeader><CardTitle>{clinicians.data?.length ? "No clinicians match that search" : "No verified clinicians listed yet"}</CardTitle><CardDescription>{clinicians.data?.length ? "Try a different name, support area, or location." : "Only verified clinicians who opt in appear here. You can check again later."}</CardDescription></CardHeader></Card> :
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map(clinician=><ClinicianCard key={clinician.connectCode} clinician={clinician}/>)}</div>}
  </main></PublicLayout>;
}

function ClinicianCard({ clinician }: { clinician: PublicClinician }) {
  return <Card data-testid={`card-clinician-${clinician.connectCode}`}><CardHeader><CardTitle className="display text-2xl">{clinician.displayName}</CardTitle><CardDescription>{clinician.profession}</CardDescription></CardHeader><CardContent><p className="font-medium text-foreground">{clinician.practiceName}</p><p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><MapPin size={15}/>{clinician.location}</p><p className="mt-4 text-sm leading-6 text-muted-foreground">{clinician.areas.join(" · ")}</p>{clinician.openToNewPatients && <p className="mt-3 text-xs font-semibold text-primary">Open to new patients</p>}<Button asChild variant="link" className="mt-3 px-0" data-testid={`link-clinician-profile-${clinician.connectCode}`}><Link href={`/clinicians/${clinician.connectCode}`}>View profile <ArrowRight/></Link></Button></CardContent></Card>;
}

export function PublicClinicianProfilePage() {
  const params = useParams<{ connectCode: string }>();
  const profile = useGetPublicClinician(params.connectCode ?? "", { query: { queryKey: getGetPublicClinicianQueryKey(params.connectCode ?? ""), enabled: Boolean(params.connectCode) } });
  return <PublicLayout><main id="main" className="mx-auto max-w-4xl px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
    {profile.isPending ? <div role="status" data-testid="status-clinician-profile-loading" className="h-64 animate-pulse rounded-lg bg-secondary"/> :
      profile.isError ? <Card><CardHeader><CardTitle>Profile unavailable</CardTitle><CardDescription>This public clinician profile could not be found. It may no longer be listed.</CardDescription></CardHeader><CardContent><Button asChild variant="outline"><Link href="/find-your-clinician">Back to the directory</Link></Button></CardContent></Card> :
      <Card><CardHeader><Eyebrow>Verified clinician</Eyebrow><CardTitle className="display mt-3 text-4xl">{profile.data.displayName}</CardTitle><CardDescription className="text-base">{profile.data.profession}</CardDescription></CardHeader><CardContent><div className="space-y-4"><p className="font-semibold text-foreground">{profile.data.practiceName}</p><p className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin size={16}/>{profile.data.location}</p><div><p className="text-sm font-semibold text-foreground">Areas of support</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{profile.data.areas.join(" · ")}</p></div>{profile.data.openToNewPatients && <p className="rounded-lg bg-secondary p-3 text-sm text-secondary-foreground">Open to new patients</p>}<p className="text-sm leading-6 text-muted-foreground">Contact this clinician through their practice. Stillwell does not share your journal or connect patient accounts through this profile.</p><Button asChild variant="outline"><Link href="/find-your-clinician">Back to the directory</Link></Button></div></CardContent></Card>}
  </main></PublicLayout>;
}

const clinicianProfessionOptions = ["Physician", "Physiotherapist", "Occupational therapist", "Neuropsychologist", "Vestibular therapist", "Athletic trainer", "Speech-language pathologist", "Other"] as const;
const clinicianAreaOptions = ["Headaches", "Neck & headaches", "Dizziness & balance", "Vision", "Sleep", "Mood & anxiety", "Concentration & memory", "Return to sport", "Return to school", "Return to work"] as const;
const clinicianProfileSchema = z.object({
  profession: z.enum(clinicianProfessionOptions),
  licenseNumber: z.string().trim().min(1, "Enter your licence number.").max(100),
  licenseRegion: z.string().trim().min(1, "Enter the region where your licence was issued.").max(120),
  practiceName: z.string().trim().min(1, "Enter your practice name.").max(180),
  location: z.string().trim().min(1, "Enter a city or ZIP.").max(180),
  areas: z.array(z.enum(clinicianAreaOptions)).min(1, "Choose at least one area of support."),
  listInDirectory: z.boolean(),
  openToNewPatients: z.boolean(),
  termsAccepted: z.boolean().refine(value => value, "Agree to the clinician terms and privacy notice to continue."),
});
type ClinicianProfileValues = z.infer<typeof clinicianProfileSchema>;
const clinicianProfileDraftSchema = z.object({
  profession: z.enum(clinicianProfessionOptions).optional(),
  licenseNumber: z.string().optional(),
  licenseRegion: z.string().optional(),
  practiceName: z.string().optional(),
  location: z.string().optional(),
  areas: z.array(z.enum(clinicianAreaOptions)).optional(),
  listInDirectory: z.boolean().optional(),
  openToNewPatients: z.boolean().optional(),
  termsAccepted: z.boolean().optional(),
});
type ClinicianProfileDraft = z.infer<typeof clinicianProfileDraftSchema>;
const clinicianProfileDetailsKey = "stillwell.clinician-profile-details";
function storeClinicianProfileDraft(value: ClinicianProfileDraft) {
  try { sessionStorage.setItem(clinicianProfileDetailsKey, JSON.stringify(value)); return true; } catch { return false; }
}
function readClinicianProfileDraft(): ClinicianProfileDraft | null {
  try { const value = sessionStorage.getItem(clinicianProfileDetailsKey); return value ? clinicianProfileDraftSchema.parse(JSON.parse(value)) : null; } catch { return null; }
}
export function clearClinicianSetupDraft() {
  try { sessionStorage.removeItem(clinicianProfileDetailsKey); sessionStorage.removeItem(clinicianDraftKey); } catch { /* optional draft cleanup */ }
}
function ProgressStep({ step }: { step: number }) {
  return <div className="mb-6" aria-label={`Step ${step} of 4`}>
    <div className="flex justify-between text-xs font-semibold text-muted-foreground"><span>Step {step} of 4</span><span>{Math.round(step * 25)}% complete</span></div>
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={step * 25} aria-label="Clinician setup progress"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${step * 25}%` }}/></div></div>
}

export function ClinicianProfileFormPage() {
  const [, setLocation] = useLocation();
  const [storageError, setStorageError] = useState(false);
  const savedDraft = readClinicianProfileDraft() ?? {};
  const contactDraft = readClinicianDraft();
  const form = useForm<ClinicianProfileValues>({
    resolver: zodResolver(clinicianProfileSchema),
    defaultValues: {
      profession: savedDraft.profession ?? "Physician",
      licenseNumber: savedDraft.licenseNumber ?? "",
      licenseRegion: savedDraft.licenseRegion ?? "",
      practiceName: savedDraft.practiceName ?? "",
      location: savedDraft.location ?? "",
      areas: savedDraft.areas ?? [],
      listInDirectory: savedDraft.listInDirectory ?? false,
      openToNewPatients: savedDraft.openToNewPatients ?? false,
      termsAccepted: savedDraft.termsAccepted ?? contactDraft?.termsAccepted ?? false,
    },
  });
  const submit = (values: ClinicianProfileValues) => {
    if (!storeClinicianProfileDraft(values)) { setStorageError(true); return; }
    setStorageError(false);
    setLocation("/partners/join?step=4");
  };
  const finishLater = () => {
    if (!storeClinicianProfileDraft(form.getValues())) { setStorageError(true); return; }
    setLocation("/partners?setup=paused");
  };
  return <PublicLayout><main id="main" className="mx-auto max-w-3xl px-5 py-10 sm:px-8 lg:py-14"><Card><CardHeader><ProgressStep step={3}/><Eyebrow>Tell patients about your practice</Eyebrow><CardTitle className="display text-3xl">Your professional profile</CardTitle><CardDescription className="leading-6">Your licence is pending manual verification and stays hidden from Find your clinician until verified. For account safety, these details stay in this browser until your work email is confirmed in step 4.</CardDescription></CardHeader><CardContent>
    <Form {...form}><form className="space-y-5" onSubmit={form.handleSubmit(submit)} noValidate>
    <FormField control={form.control} name="profession" render={({field})=><FormItem><FormLabel>Profession</FormLabel><div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Choose your profession">{clinicianProfessionOptions.map(item=><Button key={item} type="button" size="sm" variant={field.value===item?"secondary":"outline"} aria-pressed={field.value===item} data-testid={`button-profession-${item.toLowerCase().replaceAll(" ","-")}`} onClick={()=>field.onChange(item)}>{field.value===item&&<Check size={14}/>} {item}</Button>)}</div><FormMessage/></FormItem>}/>
    <div className="grid gap-4 sm:grid-cols-2"><FormField control={form.control} name="licenseNumber" render={({field})=><FormItem><FormLabel>Licence number</FormLabel><FormControl><Input {...field} data-testid="input-license-number" autoComplete="off"/></FormControl><FormMessage/></FormItem>}/><FormField control={form.control} name="licenseRegion" render={({field})=><FormItem><FormLabel>Licence region</FormLabel><FormControl><Input {...field} data-testid="input-license-region" placeholder="State, province, or territory"/></FormControl><FormMessage/></FormItem>}/></div>
    <FormField control={form.control} name="practiceName" render={({field})=><FormItem><FormLabel>Practice name</FormLabel><FormControl><Input {...field} data-testid="input-practice-name"/></FormControl><FormMessage/></FormItem>}/>
    <FormField control={form.control} name="location" render={({field})=><FormItem><FormLabel>City or ZIP</FormLabel><FormControl><Input {...field} data-testid="input-clinician-location"/></FormControl><FormMessage/></FormItem>}/>
    <FormField control={form.control} name="areas" render={({field})=><FormItem><FormLabel>Areas of support</FormLabel><div className="flex flex-wrap gap-2">{clinicianAreaOptions.map(area=><Button key={area} type="button" size="sm" variant={field.value.includes(area)?"secondary":"outline"} data-testid={`button-area-${area.toLowerCase().replaceAll(" ","-")}`} onClick={()=>field.onChange(field.value.includes(area)?field.value.filter(item=>item!==area):[...field.value,area])}>{field.value.includes(area)&&<Check size={14}/>} {area}</Button>)}</div><FormMessage/></FormItem>}/>
    <FormField control={form.control} name="listInDirectory" render={({field})=><FormItem><label className="flex items-start gap-3 rounded-lg border border-border p-3"><FormControl><Checkbox checked={field.value} onCheckedChange={value=>field.onChange(value===true)} data-testid="checkbox-directory-opt-in"/></FormControl><span><FormLabel>List my profile in Find your clinician</FormLabel><FormDescription className="mt-1">Optional. Your listing appears only after verification and only while you opt in.</FormDescription></span></label></FormItem>}/>
    <FormField control={form.control} name="openToNewPatients" render={({field})=><FormItem><label className="flex items-center gap-3 rounded-lg border border-border p-3"><FormControl><Checkbox checked={field.value} onCheckedChange={value=>field.onChange(value===true)} data-testid="checkbox-new-patients"/></FormControl><FormLabel>I am open to new patients</FormLabel></label></FormItem>}/>
    <FormField control={form.control} name="termsAccepted" render={({field})=><FormItem><label className="flex items-start gap-3 rounded-lg border border-border p-3"><FormControl><Checkbox checked={field.value} onCheckedChange={value=>field.onChange(value===true)} data-testid="checkbox-clinician-profile-terms"/></FormControl><span><FormLabel className="leading-5">I agree to the clinician terms and <Link href="/privacy" className="underline underline-offset-2">privacy notice</Link>.</FormLabel><FormDescription className="mt-1">You only see the journal areas each person chooses to share. Patient-to-clinician linking is not available yet.</FormDescription></span></label><FormMessage/></FormItem>}/>
    <p className="text-sm leading-6 text-muted-foreground">Patient-to-clinician linking is not available yet. An optional patient invite code is stored on your clinician profile only; it does not connect accounts or reveal patient data.</p>
    {storageError && <p role="alert" className="text-sm text-destructive">We couldn’t keep these details for the next step. Please try again.</p>}
    <div className="flex flex-col gap-3 sm:flex-row"><Button type="submit" data-testid="button-save-clinician-profile">Save and continue</Button><Button type="button" variant="outline" onClick={finishLater} data-testid="button-finish-later">Finish later</Button></div>
    </form></Form>
  </CardContent></Card></main></PublicLayout>;
}

export function ClinicianJoinPage() {
  const params = new URLSearchParams(window.location.search);
  const step = params.get("step");
  const [selectedRole, setSelectedRole] = useState("");
  const account = useUser();
  const accountType = useGetAccountType({ query: { queryKey: getGetAccountTypeQueryKey(), enabled: account.isLoaded && Boolean(account.isSignedIn) } });
  const [, setLocation] = useLocation();
  const pendingClinicianSignup = Boolean(readRegistrationIntent() && readClinicianDraft());
  if (!account.isLoaded) return <PublicLayout><main id="main" className="mx-auto max-w-3xl px-5 py-12"><div role="status" className="h-72 animate-pulse rounded-lg bg-secondary"/></main></PublicLayout>;
  if (account.isSignedIn && !pendingClinicianSignup) {
    if (accountType.isError) return <PublicLayout><main id="main" className="mx-auto max-w-3xl px-5 py-12"><Card><CardHeader><CardTitle>We couldn’t confirm your account type</CardTitle><CardDescription>Please try again before continuing to clinician setup.</CardDescription></CardHeader><CardContent><Button variant="outline" onClick={() => void accountType.refetch()}>Try again</Button></CardContent></Card></main></PublicLayout>;
    if (accountType.isPending || !accountType.data) return <PublicLayout><main id="main" className="mx-auto max-w-3xl px-5 py-12"><div role="status" className="h-72 animate-pulse rounded-lg bg-secondary"/></main></PublicLayout>;
    if (accountType.data.accountType !== "clinician") return <Redirect to="/dashboard"/>;
  }
  if (step === "3") return <ClinicianProfileFormPage/>;
  if (step === "4") return <ClinicianVerificationStep/>;
  if (step === "2") return <ClinicianAccountStep/>;
  return <PublicLayout><main id="main" className="mx-auto max-w-3xl px-5 py-12 sm:px-8 lg:py-16"><Card><CardHeader><ProgressStep step={1}/><Eyebrow>Choose your role</Eyebrow><CardTitle className="display text-3xl">A place for your professional work</CardTitle><CardDescription>Select the path that best describes you.</CardDescription></CardHeader><CardContent className="grid gap-3">{[
    ["Individual clinician", "Build your own clinician profile."], ["Clinic or practice", "Set up a profile for a clinician at your practice."], ["Athletic or university program", "Start an organization request with your program type selected."], ["University research team", "Start an organization request for your research team."]
  ].map(([role, desc])=><Button key={role} type="button" variant={selectedRole===role?"secondary":"outline"} aria-pressed={selectedRole===role} onClick={()=>setSelectedRole(role)} data-testid={`button-role-${role.toLowerCase().replaceAll(" ","-")}`} className="h-auto w-full justify-between whitespace-normal px-4 py-4 text-left"><span><span className="block font-semibold text-foreground">{role}</span><span className="mt-1 block text-sm font-normal leading-5 text-muted-foreground">{desc}</span></span>{selectedRole===role&&<Check size={18}/>}</Button>)}
    <p className="mt-2 text-sm leading-6 text-muted-foreground">Invited by a patient? Open the invite link in your email instead. Patient-to-clinician invites are not available yet.</p>
    <Button disabled={!selectedRole} data-testid="button-continue-role" onClick={()=>setLocation(selectedRole.startsWith("Athletic")?"/partners/request?type=sports_program_or_club":selectedRole.startsWith("University research")?"/partners/request?type=university_research_team":"/partners/join?step=2")}>Continue <ArrowRight/></Button>
  </CardContent></Card>{step === "2" && <ClinicianAccountStep/>}</main></PublicLayout>;
}

function JoinConfirmation({ emailConfirmed }: { emailConfirmed: boolean }) {
  const { isLoaded, isSignedIn } = useUser();
  const { data, isPending } = useGetClinicianProfile({ query: { queryKey: getGetClinicianProfileQueryKey(), enabled: isLoaded && Boolean(isSignedIn) } });
  const [copied, setCopied] = useState(false);
  const profile = data?.profile;
  const publicUrl = profile?.connectCode ? `${window.location.origin}${import.meta.env.BASE_URL}clinicians/${profile.connectCode}` : "";
  const [linkError, setLinkError] = useState(false);
  const copy = async () => {
    if (!publicUrl) return;
    try { await navigator.clipboard.writeText(publicUrl); setCopied(true); setLinkError(false); }
    catch { setLinkError(true); }
  };
  if (!isLoaded || !isSignedIn) return <PublicLayout><main id="main" className="mx-auto max-w-2xl px-5 py-12"><Card><CardHeader><CardTitle>Sign in to continue</CardTitle><CardDescription>Your clinician account is needed to view its saved profile.</CardDescription></CardHeader><CardContent><Button asChild><Link href="/clinician/sign-in">Clinician sign in</Link></Button></CardContent></Card></main></PublicLayout>;
  if (isPending) return <PublicLayout><main id="main" className="mx-auto max-w-2xl px-5 py-12"><div role="status" className="h-72 animate-pulse rounded-lg bg-secondary"/></main></PublicLayout>;
  if (!profile) return <PublicLayout><main id="main" className="mx-auto max-w-2xl px-5 py-12"><Card><CardHeader><CardTitle>Profile not found</CardTitle><CardDescription>We couldn’t find a saved clinician profile for this account.</CardDescription></CardHeader><CardContent><Button asChild><Link href="/partners/join?step=3">Continue profile setup</Link></Button></CardContent></Card></main></PublicLayout>;
  return <PublicLayout><main id="main" className="mx-auto max-w-2xl px-5 py-12 sm:py-16"><Card><CardHeader><ProgressStep step={4}/><Eyebrow>Check your email</Eyebrow><CardTitle className="display text-3xl">Your profile is saved</CardTitle><CardDescription className="leading-6">Your licence is pending review. Your profile will remain private and won’t appear in the public directory until verified and opted in.</CardDescription></CardHeader><CardContent className="space-y-5"><div className="rounded-lg bg-secondary p-4"><p className="font-semibold text-secondary-foreground">What happens next</p><ul className="mt-3 space-y-2 text-sm leading-6 text-secondary-foreground"><li>{emailConfirmed ? "Your work email was confirmed through Clerk." : "Your existing clinician account is signed in."}</li><li>Stillwell will review the licence details on your profile.</li><li>Patient-controlled sharing and account linking are not available yet.</li></ul></div>
    {profile?.connectCode && <div><p className="text-sm font-semibold">Your clinician profile link</p><p className="mt-1 text-xs leading-5 text-muted-foreground">This public listing link becomes available only after licence verification and directory opt-in. It does not connect patient accounts.</p><div className="mt-2 flex flex-col gap-2 sm:flex-row"><Input readOnly value={publicUrl} data-testid="input-clinician-profile-link"/><Button type="button" variant="outline" onClick={()=>void copy()} data-testid="button-copy-profile-link"><Clipboard size={16}/>{copied?"Copied":"Copy link"}</Button></div>{linkError&&<p role="status" className="mt-2 text-xs text-muted-foreground">Could not copy automatically. Select and copy the profile link above.</p>}</div>}
    <Button asChild data-testid="link-clinician-home"><Link href="/clinician/portal">Go to your clinician home <ArrowRight/></Link></Button>
  </CardContent></Card></main></PublicLayout>;
}

const clinicianDraftKey = "stillwell.clinician-profile-draft";
type ClinicianDraft = { phone: string | null; inviteCode: string | null; termsAccepted: boolean };
function readClinicianDraft(): ClinicianDraft | null {
  try { const value = sessionStorage.getItem(clinicianDraftKey); return value ? JSON.parse(value) as ClinicianDraft : null; } catch { return null; }
}
function clearClinicianDraft() {
  try { sessionStorage.removeItem(clinicianDraftKey); } catch { /* optional draft cleanup */ }
}

const clinicianAccountSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name."),
  lastName: z.string().trim().min(1, "Enter your last name."),
  email: z.string().trim().email("Enter a valid work email."),
  password: z.string().min(12, "Use at least 12 characters."),
  phone: z.string().max(40).optional(),
  inviteCode: z.string().max(100).optional(),
  terms: z.boolean().refine(value => value, "Accept the clinician terms and privacy notice to continue."),
});
type ClinicianAccountValues = z.infer<typeof clinicianAccountSchema>;

function ClinicianAccountStep() {
  const { isLoaded, signUp } = useSignUp();
  const user = useUser();
  const createIntent = useCreateAccountRegistrationIntent();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const form = useForm<ClinicianAccountValues>({
    resolver: zodResolver(clinicianAccountSchema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "", phone: "", inviteCode: "", terms: false },
  });
  if (user.isLoaded && user.isSignedIn) return <PublicLayout><main id="main" className="mx-auto max-w-3xl px-5 py-10 sm:px-8 lg:py-14"><Card><CardHeader><ProgressStep step={2}/><Eyebrow>Create your account</Eyebrow><CardTitle className="display text-3xl">You’re signed in</CardTitle><CardDescription>Your existing clinician account is ready for its professional profile.</CardDescription></CardHeader><CardContent><Button asChild><Link href="/partners/join?step=3">Continue to your practice profile</Link></Button></CardContent></Card></main></PublicLayout>;
  const createAccount = async (values: ClinicianAccountValues) => {
    if (!isLoaded) return;
    setFeedback(null);
    setBusy(true);
    try {
      const intent = await createIntent.mutateAsync({ data: { accountType: "clinician" } });
      if (!storeRegistrationIntent(intent.registrationToken)) throw new Error("storage");
      try { sessionStorage.setItem(clinicianDraftKey, JSON.stringify({ phone: values.phone?.trim() || null, inviteCode: values.inviteCode?.trim() || null, termsAccepted: values.terms } satisfies ClinicianDraft)); } catch { throw new Error("storage"); }
      await signUp.create({ firstName: values.firstName, lastName: values.lastName, emailAddress: values.email, password: values.password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setLocation("/partners/join?step=3");
    } catch {
      clearRegistrationIntent();
      clearClinicianDraft();
      setFeedback("We couldn’t start account setup. Please review your details and try again.");
    } finally { setBusy(false); }
  };
  return <PublicLayout><main id="main" className="mx-auto max-w-3xl px-5 py-10 sm:px-8 lg:py-14">
    <Card><CardHeader><ProgressStep step={2}/><Eyebrow>Create your account</Eyebrow><CardTitle className="display text-3xl">A separate clinician account</CardTitle><CardDescription className="leading-6">Use your work email. You’ll verify it with a Clerk code in step 4, after adding your professional profile.</CardDescription></CardHeader>
    <CardContent><Form {...form}><form onSubmit={form.handleSubmit(createAccount)} className="space-y-5" noValidate>
        <div className="grid gap-5 sm:grid-cols-2"><FormField control={form.control} name="firstName" render={({field})=><FormItem><FormLabel>First name</FormLabel><FormControl><Input {...field} autoComplete="given-name" data-testid="input-clinician-first-name"/></FormControl><FormMessage/></FormItem>}/><FormField control={form.control} name="lastName" render={({field})=><FormItem><FormLabel>Last name</FormLabel><FormControl><Input {...field} autoComplete="family-name" data-testid="input-clinician-last-name"/></FormControl><FormMessage/></FormItem>}/></div>
        <FormField control={form.control} name="email" render={({field})=><FormItem><FormLabel>Work email</FormLabel><FormControl><Input {...field} type="email" autoComplete="email" data-testid="input-clinician-email"/></FormControl><FormMessage/></FormItem>}/>
        <FormField control={form.control} name="password" render={({field})=><FormItem><FormLabel>Password</FormLabel><FormControl><div className="flex gap-2"><Input {...field} type={showPassword?"text":"password"} autoComplete="new-password" data-testid="input-clinician-password"/><Button type="button" variant="outline" onClick={()=>setShowPassword(value=>!value)} data-testid="button-toggle-password">{showPassword?"Hide":"Show"}</Button></div></FormControl><FormDescription>Use at least 12 characters.</FormDescription><FormMessage/></FormItem>}/>
        <div className="grid gap-5 sm:grid-cols-2"><FormField control={form.control} name="phone" render={({field})=><FormItem><FormLabel>Phone <span className="font-normal text-muted-foreground">(optional)</span></FormLabel><FormControl><Input {...field} type="tel" autoComplete="tel" data-testid="input-clinician-phone"/></FormControl><FormMessage/></FormItem>}/><FormField control={form.control} name="inviteCode" render={({field})=><FormItem><FormLabel>Patient invite code <span className="font-normal text-muted-foreground">(optional)</span></FormLabel><FormControl><Input {...field} data-testid="input-patient-invite-code"/></FormControl><FormDescription>Account linking is not available yet. This code does not reveal patient data.</FormDescription><FormMessage/></FormItem>}/></div>
        <FormField control={form.control} name="terms" render={({field})=><FormItem><div className="flex items-start gap-3 rounded-lg border border-border p-3"><FormControl><Checkbox checked={field.value} onCheckedChange={value=>field.onChange(value===true)} data-testid="checkbox-clinician-terms"/></FormControl><div><FormLabel className="leading-5">I agree to the clinician terms and <Link href="/privacy" className="underline underline-offset-2">privacy notice</Link>.</FormLabel><FormDescription>Patients choose whether to share any reflections. Stillwell does not provide diagnosis or treatment.</FormDescription></div></div><FormMessage/></FormItem>}/>
        <p className="text-sm leading-6 text-muted-foreground">This separate account does not grant access to patient records. An optional invite code does not connect accounts or reveal patient information.</p>
        {feedback && <p role="alert" data-testid="status-clinician-account-feedback" className="text-sm text-destructive">{feedback}</p>}
          <div className="flex flex-wrap gap-3"><Button type="submit" disabled={busy || createIntent.isPending} data-testid="button-create-clinician-account">{busy?"Preparing account…":"Create account"}</Button><Button type="button" variant="outline" data-testid="button-cancel-clinician-signup" onClick={()=>{clearRegistrationIntent();clearClinicianSetupDraft();setLocation("/partners");}}>Cancel setup</Button></div>
        </form></Form>
    </CardContent></Card>
  </main></PublicLayout>;
}

function ClinicianVerificationStep() {
  const user = useUser();
  const { isLoaded, signUp, setActive } = useSignUp();
  const completion = useCompleteAccountRegistration();
  const saveProfile = useSaveClinicianProfile();
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const emailIsVerified = user.user?.primaryEmailAddress?.verification.status === "verified";
  const verifiedRef = useRef(emailIsVerified);
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const registrationCompleteRef = useRef(false);
  const currentUserId = user.user?.id ?? null;
  const previousUserId = useRef(currentUserId);
  useEffect(() => {
    if (previousUserId.current && previousUserId.current !== currentUserId) {
      clearClinicianSetupDraft();
      clearRegistrationIntent();
    }
    previousUserId.current = currentUserId;
  }, [currentUserId]);

  const finishProfile = async () => {
    const profile = clinicianProfileSchema.parse(readClinicianProfileDraft());
    const contact = readClinicianDraft();
    const registrationToken = readRegistrationIntent();
    if (registrationToken && !verifiedRef.current) {
      if (!isLoaded || !signUp || !setActive) throw new Error("Clerk not ready");
      const result = await signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (result.status !== "complete" || !result.createdSessionId) throw new Error("verification");
      await setActive({ session: result.createdSessionId });
      verifiedRef.current = true;
      setEmailConfirmed(true);
    }
    const token = readRegistrationIntent();
    if (token && !registrationCompleteRef.current) {
      await completion.mutateAsync({ data: { registrationToken: token } });
      registrationCompleteRef.current = true;
    }
    const payload: ClinicianProfileInput = {
      ...profile,
      phone: contact?.phone ?? null,
      inviteCode: contact?.inviteCode ?? null,
      termsAccepted: true,
    };
    const saved = await saveProfile.mutateAsync({ data: payload });
    queryClient.setQueryData(getGetClinicianProfileQueryKey(), { profile: saved });
    await queryClient.invalidateQueries({ queryKey: getListPublicCliniciansQueryKey() });
    clearRegistrationIntent();
    clearAccountChoice();
    clearClinicianDraft();
    clearClinicianSetupDraft();
    await queryClient.invalidateQueries({ queryKey: getGetAccountTypeQueryKey() });
    setComplete(true);
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user.isSignedIn && !code.trim()) {
      setFeedback("Enter the verification code sent by Clerk.");
      return;
    }
    setBusy(true);
    setFeedback("");
    try { await finishProfile(); }
    catch {
      setFeedback(verifiedRef.current ? "Your email is confirmed, but we couldn’t save the profile. Please try again." : "That code could not be verified. Check it and try again, or request a new one.");
    } finally { setBusy(false); }
  };
  const resend = async () => {
    if (!isLoaded) return;
    setBusy(true);
    setFeedback("");
    try { await signUp.prepareEmailAddressVerification({ strategy: "email_code" }); setFeedback("A new verification code has been requested from Clerk."); }
    catch { setFeedback("We couldn’t request a new code just now. Please try again."); }
    finally { setBusy(false); }
  };
  if (complete) return <JoinConfirmation emailConfirmed={emailConfirmed}/>;
  if (!user.isLoaded || !isLoaded) return <PublicLayout><main id="main" className="mx-auto max-w-3xl px-5 py-12"><div role="status" className="h-72 animate-pulse rounded-lg bg-secondary"/></main></PublicLayout>;
  const savedProfileDraft = readClinicianProfileDraft();
  if (!savedProfileDraft || !clinicianProfileSchema.safeParse(savedProfileDraft).success) return <PublicLayout><main id="main" className="mx-auto max-w-3xl px-5 py-12"><Card><CardHeader><CardTitle>Profile details needed</CardTitle><CardDescription>Complete step 3 before verifying your email.</CardDescription></CardHeader><CardContent><Button asChild><Link href="/partners/join?step=3">Return to your profile</Link></Button></CardContent></Card></main></PublicLayout>;
  return <PublicLayout><main id="main" className="mx-auto max-w-3xl px-5 py-10 sm:px-8 lg:py-14"><Card><CardHeader><ProgressStep step={4}/><Eyebrow>Check your email</Eyebrow><CardTitle className="display text-3xl">{readRegistrationIntent()&&!verifiedRef.current ? "Check your email" : "Confirm and connect"}</CardTitle><CardDescription className="leading-6">{readRegistrationIntent()&&!verifiedRef.current ? "Enter the email verification code Clerk sent when you created your clinician account. Your profile is saved after verification." : "Save these details to your clinician account. Your profile stays private until licence review and directory opt-in are complete."}</CardDescription></CardHeader><CardContent className="space-y-5">
    {!user.isSignedIn || (readRegistrationIntent()&&!verifiedRef.current) ? <form onSubmit={submit} className="space-y-5"><label className="block space-y-2 text-sm font-medium">Email verification code<Input autoComplete="one-time-code" inputMode="numeric" value={code} onChange={event=>setCode(event.target.value)} data-testid="input-clinician-verification-code"/></label><div className="flex flex-wrap gap-3"><Button type="submit" disabled={busy || saveProfile.isPending || completion.isPending} data-testid="button-verify-clinician-email">{busy?"Verifying…":"Verify email and save profile"}</Button><Button type="button" variant="outline" disabled={busy} onClick={()=>void resend()} data-testid="button-clinician-resend-code">Resend code</Button></div></form> : <><p className="text-sm leading-6 text-muted-foreground">Your clinician account is signed in. Saving this profile will keep it private until licence review and directory opt-in are complete.</p><Button type="button" disabled={busy || saveProfile.isPending} onClick={()=>void finishProfile().catch(()=>setFeedback("We couldn’t save your profile. Please try again."))} data-testid="button-save-existing-clinician-profile">Save profile and continue</Button></>}
    {feedback&&<p role="alert" data-testid="status-clinician-verification-feedback" className="text-sm text-destructive">{feedback}</p>}
    <p className="text-sm leading-6 text-muted-foreground">Verification creates a clinician account only. Patient reflections and invite codes do not become linked or visible through this process.</p>
  </CardContent></Card></main></PublicLayout>;
}

export function PartnerAdminPage() {
  const queryClient = useQueryClient();
  const requests = useListPartnershipRequests({ query: { queryKey: getListPartnershipRequestsQueryKey() } });
  const clinicians = useListClinicianProfilesForAdmin({ query: { queryKey: getListClinicianProfilesForAdminQueryKey() } });
  const verify = useUpdateClinicianVerification();
  const [noAccess, setNoAccess] = useState(false);
  useEffect(() => {
    if (requests.isError || clinicians.isError) setNoAccess(true);
  }, [requests.isError, clinicians.isError]);
  return <PublicLayout><main id="main" className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:px-12"><Eyebrow>Stillwell administration</Eyebrow><h1 className="display mt-4 text-4xl text-primary">Partner requests &amp; verification</h1>
    {noAccess ? <Card className="mt-8"><CardHeader><CardTitle>No access</CardTitle><CardDescription>This page is available to authorized Stillwell administrators only. No request or clinician data is available.</CardDescription></CardHeader></Card> :
    <div className="mt-8 space-y-10">
      <section><h2 className="display text-2xl">Organization requests</h2>{requests.isPending?<div role="status" className="mt-4 h-24 animate-pulse rounded-lg bg-secondary"/>:requests.isError?<Card className="mt-4"><CardContent className="pt-6"><p className="text-sm text-muted-foreground">We couldn’t load organization requests.</p><Button variant="outline" className="mt-3" onClick={()=>void requests.refetch()}>Try again</Button></CardContent></Card>:requests.data.items.length===0?<Card className="mt-4"><CardContent className="pt-6"><p className="text-sm text-muted-foreground">No organization requests yet.</p></CardContent></Card>:<div className="mt-4 space-y-3">{requests.data.items.map(item=><Card key={item.id} data-testid={`card-partner-request-${item.id}`}><CardContent className="grid gap-3 p-5 md:grid-cols-[1fr_1fr_1fr]"><div><p className="font-semibold">{item.organizationName}</p><p className="mt-1 text-xs text-muted-foreground">{organizationTypes.find(([value])=>value===item.organizationType)?.[1]}</p></div><div><p className="text-sm">{item.contactName} · {item.contactRole}</p><p className="mt-1 text-sm text-muted-foreground">{item.workEmail}</p>{item.phone&&<p className="mt-1 text-sm text-muted-foreground">{item.phone}</p>}</div><div><p className="text-sm">People supported: {item.peopleSupported}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</p></div>{item.message&&<p className="text-sm leading-6 text-muted-foreground md:col-span-3">{item.message}</p>}</CardContent></Card>)}</div>}</section>
      <section><h2 className="display text-2xl">Clinician licence review</h2>{verify.isError&&<p role="alert" data-testid="status-license-verification-error" className="mt-3 text-sm text-destructive">We couldn’t update the verification status. Please try again.</p>}{clinicians.isPending?<div role="status" className="mt-4 h-24 animate-pulse rounded-lg bg-secondary"/>:clinicians.isError?<Card className="mt-4"><CardContent className="pt-6"><p className="text-sm text-muted-foreground">We couldn’t load clinician profiles.</p><Button variant="outline" className="mt-3" onClick={()=>void clinicians.refetch()}>Try again</Button></CardContent></Card>:clinicians.data.items.length===0?<Card className="mt-4"><CardContent className="pt-6"><p className="text-sm text-muted-foreground">No clinician profiles need review yet.</p></CardContent></Card>:<div className="mt-4 space-y-3">{clinicians.data.items.map(item=><Card key={item.userId} data-testid={`card-clinician-review-${item.userId}`}><CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_1fr_1fr_auto] md:items-center"><div><p className="font-semibold">{item.displayName}</p><p className="text-sm text-muted-foreground">{item.email ?? "Email unavailable"}</p></div><div><p className="text-sm">{item.profession} · {item.practiceName}</p><p className="text-sm text-muted-foreground">{item.location}</p></div><div><p className="text-sm">Licence {item.licenseNumber} · {item.licenseRegion}</p><p className="text-xs text-muted-foreground">{item.verificationStatus === "verified"?"Verified":"Pending review"}</p></div><Button disabled={verify.isPending} variant={item.verificationStatus==="verified"?"outline":"default"} data-testid={`button-verify-${item.userId}`} onClick={()=>verify.mutate({data:{userId:item.userId,verificationStatus:item.verificationStatus==="verified"?"pending":"verified"}},{onSuccess:()=>{void queryClient.invalidateQueries({queryKey:getListClinicianProfilesForAdminQueryKey()});void queryClient.invalidateQueries({queryKey:getListPublicCliniciansQueryKey()});}})}>{item.verificationStatus==="verified"?"Mark pending":"Verify licence"}</Button></CardContent></Card>)}</div>}</section>
    </div>}
  </main></PublicLayout>;
}
