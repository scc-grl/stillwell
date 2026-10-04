import { useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Check,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  FileHeart,
  HeartHandshake,
  LifeBuoy,
  LockKeyhole,
  MessageCircle,
  MoveRight,
  Phone,
  ShieldCheck,
  Stethoscope,
  X,
} from "lucide-react";

type ModalStep = "intro" | "sample";

const eligibility = [
  "Adult (18+) with a concussion assessed by a clinician",
  "Discharged home from the ED, clinic, or another care setting",
  "Injury occurred within the past six months",
  "Needs practical support navigating recovery at home",
];

const outsideScope = [
  {
    title: "New or worsening urgent symptoms",
    description:
      "Not a substitute for emergency assessment or acute medical care.",
    icon: CircleAlert,
  },
  {
    title: "Children and adolescents",
    description: "This concept is for adults 18 and older only.",
    icon: ShieldCheck,
  },
  {
    title: "Inpatient or complex rehabilitation",
    description:
      "People needing hospital-level care or highly coordinated rehab need an appropriate local pathway.",
    icon: LifeBuoy,
  },
];

function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.17em] text-[#47766e]">
      <span className="h-px w-5 bg-[#83a99e]" />
      {children}
    </div>
  );
}

export function PartnerExperience() {
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<ModalStep>("intro");
  const [activeTab, setActiveTab] = useState<"fit" | "handoff">("fit");

  const openDemo = () => {
    setStep("intro");
    setModalOpen(true);
  };

  return (
    <main className="min-h-[100dvh] bg-[#f6f7f3] font-sans text-[#233a39]">
      <div className="border-b border-[#dce6df] bg-[#edf4ef] px-4 py-2.5 text-center text-xs font-medium text-[#365e55] sm:text-sm">
        <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[#668f7d] align-middle" />
        Concept-stage service model · For discussion, not a live referral pathway
      </div>

      <header className="mx-auto flex max-w-[1240px] items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <a href="#top" className="flex items-center gap-3 text-inherit no-underline">
          <span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#244b48] text-[#f3ead9]">
            <Stethoscope size={19} strokeWidth={1.8} />
          </span>
          <span>
            <span className="block font-serif text-[17px] font-semibold leading-5 tracking-[-0.03em]">
              Clearway
            </span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-[#738783]">
              Recovery, with a clinician
            </span>
          </span>
        </a>
        <nav className="hidden items-center gap-8 text-[13px] font-medium text-[#526966] md:flex">
          <a className="transition-colors hover:text-[#1d5149]" href="#who">
            Who may fit
          </a>
          <a className="transition-colors hover:text-[#1d5149]" href="#handoff">
            Handoff
          </a>
          <a className="transition-colors hover:text-[#1d5149]" href="#boundaries">
            Scope & safety
          </a>
        </nav>
        <button
          onClick={openDemo}
          className="inline-flex items-center gap-2 rounded-full bg-[#244b48] px-4 py-2.5 text-xs font-semibold text-white shadow-[0_5px_15px_rgba(36,75,72,.12)] transition hover:-translate-y-0.5 hover:bg-[#183d3a] sm:px-5 sm:text-sm"
        >
          <span className="hidden sm:inline">Explore sample handoff</span>
          <span className="sm:hidden">Sample handoff</span>
          <ArrowUpRight size={15} />
        </button>
      </header>

      <section id="top" className="relative overflow-hidden px-5 pb-16 pt-10 sm:px-8 sm:pb-20 sm:pt-14 lg:px-10 lg:pt-16">
        <div className="pointer-events-none absolute -right-32 top-0 h-[500px] w-[500px] rounded-full border border-[#d6e5dc] opacity-70" />
        <div className="pointer-events-none absolute -right-6 top-10 h-[370px] w-[370px] rounded-full border border-[#d6e5dc] opacity-65" />
        <div className="mx-auto grid max-w-[1240px] items-center gap-12 lg:grid-cols-[1.06fr_.94fr] lg:gap-16">
          <div className="relative z-10">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#d8e6dd] bg-[#eef5f0] px-3 py-1.5 text-[11px] font-semibold tracking-[0.04em] text-[#477168]">
              <HeartHandshake size={14} />
              A concept for care transitions
            </div>
            <h1 className="max-w-[690px] font-serif text-[clamp(2.9rem,6.8vw,5.7rem)] font-medium leading-[.99] tracking-[-0.055em] text-[#1f3937]">
              Recovery doesn’t end at the{" "}
              <span className="italic text-[#64897d]">discharge door.</span>
            </h1>
            <p className="mt-7 max-w-[555px] text-base leading-7 text-[#5b706d] sm:text-lg sm:leading-8">
              A clinician-led virtual recovery concept for adults returning home
              after a clinician-assessed concussion—built to complement the
              care already around them.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={openDemo}
                className="group inline-flex items-center justify-center gap-3 rounded-full bg-[#244b48] px-6 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#183d3a]"
              >
                See a sample handoff
                <ArrowRight className="transition-transform group-hover:translate-x-1" size={16} />
              </button>
              <a
                href="#who"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#cbd9d1] px-6 py-3.5 text-sm font-semibold text-[#365c55] transition hover:bg-white"
              >
                Review referral fit
                <ArrowDown size={15} />
              </a>
            </div>
            <div className="mt-7 flex items-start gap-3 text-xs leading-5 text-[#71817d]">
              <LockKeyhole className="mt-0.5 shrink-0 text-[#769689]" size={15} />
              <p className="max-w-[440px]">
                This is a design concept only. No referral is submitted, no clinic
                is contacted, and no care is arranged from this page.
              </p>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[540px] lg:ml-auto">
            <div className="absolute -right-2 top-8 h-[83%] w-[88%] rounded-[38px] bg-[#dce9e1] sm:-right-6" />
            <div className="relative rounded-[30px] border border-[#e4e9e2] bg-[#fffefa] p-5 shadow-[0_24px_70px_rgba(50,76,65,.11)] sm:p-7">
              <div className="flex items-center justify-between border-b border-[#e8ece6] pb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e6f0ea] text-[#47776b]">
                    <FileHeart size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#2c4642]">A supported transition</div>
                    <div className="mt-0.5 text-xs text-[#80908b]">Care that stays connected</div>
                  </div>
                </div>
                <span className="rounded-full bg-[#f6f0e4] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.1em] text-[#887452]">
                  Concept
                </span>
              </div>
              <div className="relative py-6 pl-2">
                <div className="absolute bottom-8 left-[22px] top-8 w-px bg-[#d6e3da]" />
                {[
                  {
                    icon: ClipboardCheck,
                    title: "You assess & discharge",
                    detail: "Acute needs addressed; adult returns home",
                    tint: "bg-[#e7f0e9] text-[#527d6e]",
                  },
                  {
                    icon: MessageCircle,
                    title: "A warm handoff",
                    detail: "With consent, share context and next steps",
                    tint: "bg-[#e8eef0] text-[#587680]",
                  },
                  {
                    icon: Stethoscope,
                    title: "Clinician-led follow-up",
                    detail: "A tailored plan, with continuity in mind",
                    tint: "bg-[#f3eadb] text-[#94764f]",
                  },
                ].map(({ icon: Icon, title, detail, tint }, i) => (
                  <div key={title} className="relative flex gap-4 py-3.5">
                    <span className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] ring-4 ring-[#fffefa] ${tint}`}>
                      <Icon size={17} />
                    </span>
                    <div className="pt-0.5">
                      <div className="flex items-center gap-2 text-sm font-semibold text-[#304946]">
                        {title}
                        {i === 2 && <span className="text-[9px] font-bold uppercase tracking-wider text-[#9b8a6d]">intended</span>}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-[#788985]">{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl bg-[#f2f6f2] px-4 py-3.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#42685d]">
                  <BadgeCheck size={15} />
                  Designed to complement—not replace—your care
                </div>
                <p className="mt-1.5 pl-[23px] text-[11px] leading-[1.55] text-[#788983]">
                  The referring team remains part of the person’s care network.
                </p>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-4 hidden items-center gap-3 rounded-2xl border border-[#e7ebe3] bg-white px-4 py-3 shadow-[0_12px_32px_rgba(39,65,54,.1)] sm:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f5efe3] text-[#8a7657]"><Clock3 size={16} /></span>
              <span className="text-xs leading-5 text-[#647773]"><strong className="block text-[#344e49]">Within six months</strong>of the injury</span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#e2e9e2] bg-[#eef4ef] px-5 py-6 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-[1240px] gap-5 sm:grid-cols-3 sm:gap-0">
          {[
            ["01", "Clinically assessed", "Concussion already evaluated by a clinician"],
            ["02", "Discharged home", "Not an acute or inpatient pathway"],
            ["03", "Injury ≤ 6 months", "Adult recovery support after the initial visit"],
          ].map(([number, label, detail], index) => (
            <div key={number} className={`flex items-start gap-3 ${index > 0 ? "sm:border-l sm:border-[#d8e4db] sm:pl-8" : ""}`}>
              <span className="font-serif text-[25px] italic leading-none text-[#829b8e]">{number}</span>
              <div>
                <div className="text-sm font-semibold text-[#34534d]">{label}</div>
                <div className="mt-1 text-xs leading-5 text-[#70827c]">{detail}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="who" className="scroll-mt-8 px-5 py-16 sm:px-8 sm:py-24 lg:px-10">
        <div className="mx-auto grid max-w-[1120px] gap-12 lg:grid-cols-[.78fr_1.22fr] lg:gap-24">
          <div>
            <SectionEyebrow>Referral fit</SectionEyebrow>
            <h2 className="font-serif text-4xl font-medium leading-[1.08] tracking-[-.045em] text-[#243d3a] sm:text-[48px]">
              A clear starting point, not a catch-all.
            </h2>
            <p className="mt-5 max-w-[360px] text-sm leading-6 text-[#687b76]">
              The concept is for adults who have already been assessed and sent
              home, and who could use support making sense of recovery in daily
              life.
            </p>
            <div className="mt-8 rounded-[22px] border border-[#e1e7de] bg-[#f1f4ed] p-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-[#71877c]">
                <ClipboardCheck size={15} />
                Practical referral criteria
              </div>
              <p className="mt-3 text-sm leading-6 text-[#526762]">
                Confirm adult age, clinician assessment, home discharge, injury
                timing, and a safe plan for any urgent concerns before considering
                a referral.
              </p>
            </div>
          </div>
          <div className="rounded-[28px] border border-[#e2e8e1] bg-[#fffefa] p-5 shadow-[0_12px_40px_rgba(55,81,68,.045)] sm:p-8">
            <div className="flex items-center justify-between border-b border-[#e8ece6] pb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.12em] text-[#83918b]">Consider the concept for someone who is</p>
                <p className="mt-1 font-serif text-[23px] text-[#2c4944]">Ready for support at home</p>
              </div>
              <span className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-[#eaf2eb] text-[#527769] sm:flex"><Check size={20} /></span>
            </div>
            <ul className="mt-2 divide-y divide-[#edf0eb]">
              {eligibility.map((item) => (
                <li key={item} className="flex gap-3 py-4 text-sm leading-6 text-[#526862]">
                  <span className="mt-1 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#e7f0e9] text-[#52796b]"><Check size={12} strokeWidth={2.5} /></span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-3 rounded-xl bg-[#f7f4ec] p-4 text-xs leading-5 text-[#776a55]">
              <MessageCircle className="mt-0.5 shrink-0" size={15} />
              <p>Consider the person’s goals, access needs, and preferences. A referral would require their informed consent and a confirmed receiving pathway.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="handoff" className="scroll-mt-6 bg-[#244744] px-5 py-16 text-[#f4f3e9] sm:px-8 sm:py-24 lg:px-10">
        <div className="mx-auto max-w-[1120px]">
          <div className="grid gap-10 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
            <div>
              <SectionEyebrow>Partner-to-clinic handoff</SectionEyebrow>
              <h2 className="max-w-[440px] font-serif text-4xl font-medium leading-[1.06] tracking-[-.04em] sm:text-[50px]">
                A next step that keeps you in the loop.
              </h2>
            </div>
            <p className="max-w-[520px] text-sm leading-6 text-[#c5d5cc]">
              If developed, a handoff could be consent-led and coordinated with
              existing care—not a one-way referral into a black box. The details
              below are a proposed workflow, not an available service.
            </p>
          </div>
          <div className="mt-10 grid overflow-hidden rounded-[26px] border border-[#58746d] bg-[#2c514e] md:grid-cols-3">
            {[
              { n: "01", title: "Introduce & confirm", desc: "Explain the concept. Confirm the adult has been assessed, discharged home, and would like their information shared.", icon: MessageCircle },
              { n: "02", title: "Share the essentials", desc: "A future secure pathway could carry the referral reason, relevant assessment summary, timing, and existing follow-up.", icon: FileHeart },
              { n: "03", title: "Close the loop", desc: "The intended model includes a response to the referring team, agreed follow-up, and a route back for clinical concerns.", icon: MoveRight },
            ].map(({ n, title, desc, icon: Icon }, index) => (
              <div key={n} className={`p-6 sm:p-7 ${index ? "border-t border-[#58746d] md:border-l md:border-t-0" : ""}`}>
                <div className="flex items-center justify-between">
                  <span className="font-serif text-3xl italic text-[#a9c3b4]">{n}</span>
                  <Icon size={19} className="text-[#a5beb0]" />
                </div>
                <h3 className="mt-7 text-[17px] font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#c3d2cb]">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[#5d7770] bg-[#2a4d49] px-4 py-4 text-xs leading-5 text-[#c3d2cb] sm:px-5">
            <LockKeyhole className="mt-0.5 shrink-0 text-[#b7cfc0]" size={15} />
            <p><strong className="font-semibold text-[#f2f2e9]">No live referral channel exists in this mockup.</strong> Do not send clinical details here. Any real workflow would require an approved, privacy-protective process and confirmed receiving team.</p>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 sm:py-24 lg:px-10">
        <div className="mx-auto grid max-w-[1120px] gap-12 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <SectionEyebrow>Intended continuity</SectionEyebrow>
            <h2 className="font-serif text-4xl font-medium leading-[1.08] tracking-[-.045em] text-[#243d3a] sm:text-[48px]">
              One person, a plan that can adapt.
            </h2>
            <p className="mt-5 max-w-[420px] text-sm leading-6 text-[#687b76]">
              Concussion recovery can look different from one person to the
              next. The concept centers clinician guidance, practical goals, and
              continuity—not a fixed course or a promise of a particular result.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[23px] bg-[#eaf1eb] p-6 sm:p-7">
              <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#d8e7dc] text-[#4d7668]"><Stethoscope size={18} /></span>
              <h3 className="mt-5 font-serif text-[23px] text-[#31514a]">Clinician-led</h3>
              <p className="mt-2 text-sm leading-6 text-[#627770]">An intended specialist clinician relationship, with guidance shaped around the person’s recovery context.</p>
            </div>
            <div className="rounded-[23px] bg-[#f3eee3] p-6 sm:p-7">
              <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#e8dfcc] text-[#8a7450]"><FileHeart size={18} /></span>
              <h3 className="mt-5 font-serif text-[23px] text-[#4c493d]">Tailored plan</h3>
              <p className="mt-2 text-sm leading-6 text-[#746e5e]">A proposed plan informed by symptoms, priorities, daily demands, and the care already in place.</p>
            </div>
            <div className="rounded-[23px] bg-[#eaf0f1] p-6 sm:p-7 sm:col-span-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#dce8e9] text-[#52757a]"><HeartHandshake size={18} /></span>
              <h3 className="mt-5 font-serif text-[23px] text-[#355457]">Continuity with the referring team</h3>
              <p className="mt-2 max-w-[530px] text-sm leading-6 text-[#63787a]">The model is intended to keep the care transition visible: clarify who is following up, share an appropriate update, and make it easier to reconnect when plans need to change.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="boundaries" className="scroll-mt-6 border-y border-[#e4e8df] bg-[#f0f1eb] px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
        <div className="mx-auto max-w-[1120px]">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <SectionEyebrow>Scope & safety</SectionEyebrow>
              <h2 className="font-serif text-4xl font-medium tracking-[-.045em] text-[#263f3b] sm:text-[46px]">Know when this isn’t the next step.</h2>
            </div>
            <p className="max-w-[360px] text-sm leading-6 text-[#687b76]">This concept is not designed for every concussion-related need. Use clinical judgment and local pathways.</p>
          </div>
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {outsideScope.map(({ title, description, icon: Icon }) => (
              <article key={title} className="rounded-[22px] border border-[#e1e5dc] bg-[#fafaf6] p-5 sm:p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#efe8dc] text-[#8d6d4f]"><Icon size={18} /></span>
                <h3 className="mt-5 text-[15px] font-semibold text-[#3c514c]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#70807a]">{description}</p>
              </article>
            ))}
          </div>
          <div className="mt-5 flex flex-col gap-4 rounded-[22px] border border-[#e3c9b9] bg-[#fbf0e9] p-5 sm:flex-row sm:items-center sm:px-6">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#f1dfd2] text-[#975c45]"><Phone size={18} /></span>
            <div>
              <h3 className="text-sm font-bold text-[#784a3a]">Emergency escalation comes first</h3>
              <p className="mt-1 text-sm leading-6 text-[#815f51]">For new, worsening, or concerning symptoms, follow local emergency guidance or direct the person to emergency services now. Do not wait for a virtual follow-up or referral.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
        <div className="mx-auto flex max-w-[1120px] flex-col justify-between gap-8 rounded-[28px] bg-[#e5eee7] px-6 py-8 sm:px-10 sm:py-10 md:flex-row md:items-center">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[.16em] text-[#638076]">For partner discussion</div>
            <h2 className="mt-3 max-w-[570px] font-serif text-3xl leading-tight tracking-[-.035em] text-[#29453f] sm:text-[39px]">Help shape a safer bridge from discharge to recovery.</h2>
            <p className="mt-3 max-w-[560px] text-sm leading-6 text-[#637870]">We’re sharing a proposed care model—not announcing an open service or accepting referrals.</p>
          </div>
          <button onClick={openDemo} className="inline-flex shrink-0 items-center justify-center gap-3 self-start rounded-full bg-[#244b48] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#183d3a] md:self-center">
            View demo handoff <ArrowRight size={16} />
          </button>
        </div>
      </section>

      <footer className="border-t border-[#e3e8e0] px-5 py-7 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-3 text-xs leading-5 text-[#788781] sm:flex-row sm:items-center sm:justify-between">
          <span className="font-semibold tracking-[.03em] text-[#506963]">Clearway · Concept-stage partner experience</span>
          <span>For design discussion only · No live referral or clinical service is represented</span>
        </div>
      </footer>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#142b29]/55 p-0 backdrop-blur-[3px] sm:items-center sm:p-5"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModalOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-title"
            className="max-h-[92dvh] w-full max-w-[640px] overflow-y-auto rounded-t-[26px] border border-[#e1e8df] bg-[#fffefa] p-5 shadow-[0_28px_90px_rgba(14,37,34,.25)] sm:rounded-[26px] sm:p-7"
          >
            <div className="flex items-start justify-between gap-5">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#f5ecdd] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-[#8b6b46]">
                  <LockKeyhole size={12} /> local-only demonstration
                </div>
                <h2 id="demo-title" className="mt-4 font-serif text-[30px] leading-tight tracking-[-.035em] text-[#294541]">
                  {step === "intro" ? "A sample handoff, safely simulated." : "What a handoff could include."}
                </h2>
              </div>
              <button onClick={() => setModalOpen(false)} aria-label="Close demo" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#dfe6df] text-[#5e746e] transition hover:bg-[#f1f5f0]">
                <X size={17} />
              </button>
            </div>

            {step === "intro" ? (
              <>
                <div className="mt-5 rounded-2xl border border-[#e8cbbb] bg-[#fcf1e9] p-4">
                  <div className="flex gap-3">
                    <CircleAlert className="mt-0.5 shrink-0 text-[#a15d42]" size={18} />
                    <div>
                      <p className="text-sm font-bold text-[#7d4935]">Demo only — never enter real patient information.</p>
                      <p className="mt-1 text-xs leading-5 text-[#8a6354]">This workflow runs only in this page’s local interface. It does not send, save, or persist data, and it is not connected to a clinic.</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-[#f1f4ef] p-1.5">
                  <button onClick={() => setActiveTab("fit")} className={`rounded-lg px-3 py-2.5 text-xs font-semibold transition ${activeTab === "fit" ? "bg-white text-[#355a50] shadow-sm" : "text-[#70807a]"}`}>Referral fit</button>
                  <button onClick={() => setActiveTab("handoff")} className={`rounded-lg px-3 py-2.5 text-xs font-semibold transition ${activeTab === "handoff" ? "bg-white text-[#355a50] shadow-sm" : "text-[#70807a]"}`}>Sample handoff</button>
                </div>
                {activeTab === "fit" ? (
                  <div className="mt-5">
                    <p className="text-sm leading-6 text-[#647670]">In a future approved pathway, first check that the person:</p>
                    <ul className="mt-3 space-y-2.5">
                      {eligibility.map((item) => <li key={item} className="flex gap-2.5 text-sm leading-5 text-[#445d56]"><Check size={15} className="mt-0.5 shrink-0 text-[#628878]" />{item}</li>)}
                    </ul>
                    <div className="mt-4 rounded-xl bg-[#f7f4eb] p-3.5 text-xs leading-5 text-[#776a56]">Acute/emergency, pediatric, inpatient, and complex rehab needs are outside this concept.</div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-dashed border-[#cbd9ce] bg-[#f6f8f4] p-5 text-center">
                    <FileHeart className="mx-auto text-[#729184]" size={23} />
                    <p className="mt-3 text-sm font-semibold text-[#405b53]">No form fields. No patient details.</p>
                    <p className="mx-auto mt-1 max-w-[360px] text-xs leading-5 text-[#778780]">Continue to view a fictional, pre-filled example of the context a secure handoff might carry.</p>
                  </div>
                )}
                <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#e8ece5] pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <button onClick={() => setModalOpen(false)} className="rounded-full px-4 py-2.5 text-sm font-semibold text-[#61746e] hover:bg-[#f3f5f0]">Close</button>
                  <button onClick={() => setStep("sample")} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#244b48] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#183d3a]">
                    View fictional example <ArrowRight size={15} />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[#dbe6dc] bg-[#eef5ef] p-4">
                  <BadgeCheck className="mt-0.5 shrink-0 text-[#567e6f]" size={18} />
                  <p className="text-xs leading-5 text-[#506a60]"><strong className="text-[#345448]">Synthetic example.</strong> Every person and detail below is fictional and exists only to illustrate a proposed handoff. Nothing is submitted or stored.</p>
                </div>
                <div className="mt-5 rounded-[20px] border border-[#e5e9e2] bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0eb] pb-4">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[.15em] text-[#80918a]">Fictional adult · sample only</div>
                      <div className="mt-1 font-serif text-[23px] text-[#304a44]">Riley Example</div>
                    </div>
                    <span className="rounded-full bg-[#edf3ee] px-3 py-1.5 text-[10px] font-semibold text-[#597769]">No identifiers</span>
                  </div>
                  <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div><dt className="text-[10px] font-bold uppercase tracking-[.1em] text-[#87958e]">Care transition</dt><dd className="mt-1.5 text-sm text-[#4a625a]">Assessed in ED; discharged home</dd></div>
                    <div><dt className="text-[10px] font-bold uppercase tracking-[.1em] text-[#87958e]">Timing</dt><dd className="mt-1.5 text-sm text-[#4a625a]">Injury 3 weeks ago</dd></div>
                    <div><dt className="text-[10px] font-bold uppercase tracking-[.1em] text-[#87958e]">Reason for support</dt><dd className="mt-1.5 text-sm text-[#4a625a]">Would like help pacing a return to routine</dd></div>
                    <div><dt className="text-[10px] font-bold uppercase tracking-[.1em] text-[#87958e]">Partner follow-up</dt><dd className="mt-1.5 text-sm text-[#4a625a]">Primary care visit already planned</dd></div>
                  </dl>
                  <div className="mt-4 rounded-xl bg-[#f6f4ed] p-3.5">
                    <div className="text-[10px] font-bold uppercase tracking-[.1em] text-[#8a795c]">Possible next step</div>
                    <p className="mt-1 text-xs leading-5 text-[#716b5d]">With consent and a real approved pathway, the receiving team would confirm whether follow-up is appropriate and coordinate next steps with the partner.</p>
                  </div>
                </div>
                <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-[#8a695a]"><CircleAlert size={14} className="mt-0.5 shrink-0" />This is not a referral, acceptance decision, or promise of service availability. For urgent or worsening concerns, use local emergency pathways.</p>
                <div className="mt-5 flex justify-between border-t border-[#e8ece5] pt-5">
                  <button onClick={() => setStep("intro")} className="rounded-full px-4 py-2.5 text-sm font-semibold text-[#61746e] hover:bg-[#f3f5f0]">Back</button>
                  <button onClick={() => setModalOpen(false)} className="inline-flex items-center gap-2 rounded-full bg-[#244b48] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#183d3a]">Done <Check size={15} /></button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

export default PartnerExperience;