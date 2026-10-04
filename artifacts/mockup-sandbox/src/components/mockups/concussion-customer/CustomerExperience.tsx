import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  HeartHandshake,
  Leaf,
  MapPin,
  Menu,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  X,
} from "lucide-react";

const questions = [
  {
    question: "Do I need a referral to explore care?",
    answer:
      "You can start by learning whether the service may fit. If another clinician or specialist should be involved, your care team can help coordinate that next step.",
  },
  {
    question: "What if my symptoms change from day to day?",
    answer:
      "That variability is worth discussing with a clinician. Follow-up conversations can help revisit your plan as your needs and day-to-day capacity shift.",
  },
  {
    question: "Is this right after a head injury?",
    answer:
      "No. This concept is for adults recovering at home after a clinician has assessed the concussion. It is not for a new injury, urgent symptoms, or emergency care.",
  },
];

const needs = [
  {
    id: "headaches",
    label: "Headaches",
    title: "Make room for what the headaches change.",
    description:
      "A clinician can ask when the pain shows up, how it affects your day, and what else has changed since the concussion.",
  },
  {
    id: "focus",
    label: "Thinking & focus",
    title: "Talk through the moments that feel harder.",
    description:
      "Share what you notice with focus, memory, or mental energy. A single symptom does not tell the whole story.",
  },
  {
    id: "balance",
    label: "Dizziness & balance",
    title: "Describe how it affects getting around.",
    description:
      "A clinician can learn when dizziness or balance changes happen and help consider whether in-person assessment may be appropriate.",
  },
  {
    id: "sleep",
    label: "Sleep & energy",
    title: "Connect rest with how the day feels.",
    description:
      "Talk about changes in sleep and energy, and how they affect the routines you want to return to.",
  },
  {
    id: "light",
    label: "Light & sound",
    title: "Name the settings that feel different.",
    description:
      "You can discuss sensitivity to light or noise and which everyday environments feel most difficult.",
  },
  {
    id: "mood",
    label: "Mood & stress",
    title: "There’s space for the emotional side, too.",
    description:
      "Share changes in mood, stress, or feeling unlike yourself. Your clinician can consider what support may be useful.",
  },
] as const;

type NeedId = (typeof needs)[number]["id"];

function BrandMark() {
  return (
    <span className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[#b7c9bd] bg-[#e6eee7]">
      <span className="absolute h-[18px] w-[18px] rounded-full border border-[#537566]" />
      <span className="absolute h-[6px] w-[6px] translate-x-[7px] -translate-y-[7px] rounded-full bg-[#bd705c]" />
    </span>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.19em] text-[#547364]">
      <span className="h-px w-6 bg-[#a6b9aa]" />
      {children}
    </p>
  );
}

export function CustomerExperience() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [showNextStep, setShowNextStep] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openQuestion, setOpenQuestion] = useState<number | null>(0);
  const [activeNeed, setActiveNeed] = useState<NeedId>("headaches");

  useEffect(() => {
    if (!panelOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanelOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [panelOpen]);

  const openNextStep = () => {
    setShowNextStep(false);
    setPanelOpen(true);
  };

  const handleNeedKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const currentIndex = needs.findIndex((need) => need.id === activeNeed);
    let nextIndex = currentIndex;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % needs.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + needs.length) % needs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = needs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextNeed = needs[nextIndex];
    setActiveNeed(nextNeed.id);
    document.getElementById(`need-tab-${nextNeed.id}`)?.focus();
  };

  const selectedNeed = needs.find((need) => need.id === activeNeed) ?? needs[0];

  return (
    <div className="concussion-page min-h-[100dvh] bg-[#f5f4ed] text-[#253b34]">
      <style>{`
        .concussion-page { font-family: 'DM Sans', 'Avenir Next', sans-serif; }
        .concussion-page .display-font { font-family: 'Fraunces', Georgia, serif; }
        .concussion-page .hero-art {
          background:
            radial-gradient(ellipse at 71% 32%, rgba(244, 226, 193, .76), transparent 24%),
            radial-gradient(ellipse at 61% 64%, rgba(180, 200, 179, .72), transparent 33%),
            radial-gradient(ellipse at 49% 75%, rgba(220, 228, 211, .9), transparent 35%),
            linear-gradient(138deg, #e7eee4 3%, #d9e6dd 51%, #e9e5d8 100%);
        }
        .concussion-page .paper-grain {
          background-image: radial-gradient(rgba(54, 78, 66, .16) .55px, transparent .55px);
          background-size: 7px 7px;
          opacity: .12;
        }
        @keyframes settle-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .concussion-page .reveal { animation: settle-in .65s ease-out both; }
        .concussion-page .reveal-late { animation: settle-in .75s .12s ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .concussion-page *, .concussion-page *::before, .concussion-page *::after {
            animation-duration: .01ms !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>

      <header className="relative z-10 border-b border-[#dce2d8] bg-[#f5f4ed]/95">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
          <a href="#top" className="flex items-center gap-3" aria-label="Stillwell, home">
            <BrandMark />
            <span className="display-font text-[21px] font-semibold tracking-[-0.04em] text-[#29463b]">
              stillwell
            </span>
          </a>
          <nav className="hidden items-center gap-8 text-[13px] font-medium text-[#52665c] md:flex" aria-label="Main navigation">
            <a className="transition-colors hover:text-[#233e33]" href="#needs">Needs &amp; symptoms</a>
            <a className="transition-colors hover:text-[#233e33]" href="#approach">Our approach</a>
            <a className="transition-colors hover:text-[#233e33]" href="#care">Your care</a>
            <a className="transition-colors hover:text-[#233e33]" href="#questions">Common questions</a>
          </nav>
          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d4ddd4] text-[#355348] md:hidden"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <button
            type="button"
            onClick={openNextStep}
            className="hidden items-center gap-2 rounded-full bg-[#345849] px-5 py-3 text-[12px] font-semibold tracking-[.01em] text-[#fbfaf5] transition-colors hover:bg-[#28493b] sm:inline-flex"
          >
            Explore the next step <ArrowUpRight size={15} strokeWidth={1.8} />
          </button>
        </div>
        {menuOpen && (
          <nav className="grid gap-1 border-t border-[#dce2d8] px-5 py-3 md:hidden" aria-label="Mobile navigation">
            {[
              ["Needs & symptoms", "#needs"],
              ["Our approach", "#approach"],
              ["Your care", "#care"],
              ["Common questions", "#questions"],
            ].map(([label, href]) => (
              <a key={href} onClick={() => setMenuOpen(false)} href={href} className="rounded-lg px-3 py-3 text-sm text-[#415a4e] hover:bg-[#e9eee6]">
                {label}
              </a>
            ))}
            <button type="button" onClick={openNextStep} className="mt-1 flex items-center justify-between rounded-lg bg-[#345849] px-4 py-3 text-left text-sm font-semibold text-white">
              Explore the next step <ArrowRight size={16} />
            </button>
          </nav>
        )}
      </header>

      <main id="top">
        <section className="mx-auto grid max-w-[1240px] items-center gap-10 px-5 pb-16 pt-10 sm:px-8 sm:pb-20 sm:pt-14 lg:grid-cols-[1fr_.92fr] lg:gap-14 lg:px-12 lg:pb-24 lg:pt-16">
          <div className="reveal relative z-[1]">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#cfdbcf] bg-[#edf1e8] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.15em] text-[#587364]">
              <Sparkles size={13} strokeWidth={1.7} /> Care for the in-between
            </div>
            <h1 className="display-font max-w-[650px] text-[clamp(3rem,7vw,5.7rem)] font-medium leading-[.99] tracking-[-.058em] text-[#29453a]">
              Recovery can feel <span className="italic text-[#7b8f7d]">less</span> like guesswork.
            </h1>
            <p className="mt-7 max-w-[500px] text-[16px] leading-[1.8] text-[#56665d] sm:text-[17px]">
              A clinician-guided path for adults recovering at home after a concussion assessment—with room for your symptoms, your pace, and your real life.
            </p>
            <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={openNextStep}
                className="group inline-flex min-h-[52px] items-center gap-5 rounded-full bg-[#345849] px-6 py-3 text-[14px] font-semibold text-[#fffdf8] transition-colors hover:bg-[#28493b]"
              >
                Explore the next step
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ffffff1c] transition-transform group-hover:translate-x-0.5">
                  <ArrowRight size={15} />
                </span>
              </button>
              <a href="#approach" className="inline-flex items-center gap-2 px-1 py-3 text-[13px] font-medium text-[#567164] hover:text-[#29453a]">
                See how it works <ArrowDown size={14} />
              </a>
            </div>
            <div className="mt-8 flex items-center gap-3 text-[12px] text-[#718077]">
              <ShieldCheck size={16} strokeWidth={1.7} className="text-[#6b8978]" />
              Designed for recovery at home—not urgent or acute care.
            </div>
          </div>

          <div className="reveal-late relative mx-auto w-full max-w-[580px] lg:ml-auto">
            <div className="hero-art relative aspect-[1.07/1] overflow-hidden rounded-[47%_47%_43%_43%/42%_42%_51%_51%] sm:aspect-[1.12/1]">
              <div className="paper-grain pointer-events-none absolute inset-0" />
              <div className="absolute left-[13%] top-[13%] h-[74%] w-[74%] rounded-full border border-[#ffffff78]" />
              <div className="absolute left-[22%] top-[21%] h-[58%] w-[58%] rounded-full border border-[#ffffff8a]" />
              <div className="absolute left-[34%] top-[33%] h-[34%] w-[34%] rounded-full bg-[#f2e9d8]/80 shadow-[0_20px_60px_rgba(70,91,72,.12)]" />
              <div className="absolute left-[42%] top-[39%] h-[24%] w-[24%] rounded-full border border-[#738b78]/70" />
              <span className="absolute left-[43%] top-[18%] h-3 w-3 rounded-full bg-[#bf765f]" />
              <span className="absolute right-[20%] top-[44%] h-2 w-2 rounded-full bg-[#557568]" />
              <span className="absolute bottom-[25%] left-[21%] h-2.5 w-2.5 rounded-full bg-[#c89965]" />
              <div className="absolute left-[17%] top-[10%] flex items-center gap-2 rounded-full border border-white/80 bg-[#fbfaf4]/85 px-3.5 py-2 text-[11px] font-medium text-[#486457] shadow-[0_6px_24px_rgba(49,72,57,.07)] backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-[#78917c]" /> Care, at your pace
              </div>
              <div className="absolute bottom-[10%] right-[11%] max-w-[205px] rounded-[20px] border border-white/70 bg-[#fbfaf4]/90 p-4 shadow-[0_12px_30px_rgba(49,72,57,.08)] backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#829083]">A steadier next step</p>
                <p className="display-font mt-1.5 text-[21px] leading-[1.15] tracking-[-.035em] text-[#355345]">Built around what matters to you.</p>
              </div>
              <span className="absolute bottom-[13%] left-[8%] text-[10px] uppercase tracking-[.17em] text-[#61786b]">One day at a time</span>
            </div>
            <div className="absolute -bottom-7 left-[13%] hidden h-12 w-12 items-center justify-center rounded-full border border-[#d8ded2] bg-[#f5f4ed] text-[#6b8674] sm:flex">
              <Leaf size={19} strokeWidth={1.5} />
            </div>
          </div>
        </section>

        <section className="border-y border-[#e0e4db] bg-[#edeFE7]">
          <div className="mx-auto grid max-w-[1240px] gap-8 px-5 py-7 sm:grid-cols-3 sm:gap-5 sm:px-8 lg:px-12">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-[#6e8877]"><Stethoscope size={19} strokeWidth={1.6} /></span>
              <div><p className="text-[13px] font-semibold text-[#354c40]">Clinician-led</p><p className="mt-1 text-[12px] leading-5 text-[#718077]">A specialist listens before shaping a plan.</p></div>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-[#6e8877]"><ClipboardList size={19} strokeWidth={1.6} /></span>
              <div><p className="text-[13px] font-semibold text-[#354c40]">Personal by design</p><p className="mt-1 text-[12px] leading-5 text-[#718077]">Guidance reflects symptoms and daily life.</p></div>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-[#6e8877]"><HeartHandshake size={19} strokeWidth={1.6} /></span>
              <div><p className="text-[13px] font-semibold text-[#354c40]">Connected care</p><p className="mt-1 text-[12px] leading-5 text-[#718077]">Follow-up and referrals when they make sense.</p></div>
            </div>
          </div>
        </section>

        <section id="needs" className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr] lg:items-start lg:gap-20">
            <div className="max-w-[430px]">
              <SectionLabel>Needs &amp; symptoms</SectionLabel>
              <h2 className="display-font text-[clamp(2.5rem,5vw,3.7rem)] leading-[1.04] tracking-[-.05em] text-[#29453a]">
                Start with what feels different.
              </h2>
              <p className="mt-5 text-[14px] leading-7 text-[#64736a]">
                Concussion can affect how you feel, think, sleep, or move through your day. Your experience is individual, and you don’t need the perfect words to begin a conversation.
              </p>
              <p className="mt-4 text-[12px] leading-6 text-[#7a8379]">
                Choose a topic to see what a clinician-guided conversation might make room for.
              </p>
            </div>
            <div>
              <div
                role="tablist"
                aria-label="Needs and symptoms"
                className="flex flex-wrap gap-2"
              >
                {needs.map((need) => {
                  const selected = activeNeed === need.id;
                  return (
                    <button
                      key={need.id}
                      id={`need-tab-${need.id}`}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      aria-controls="need-panel"
                      tabIndex={selected ? 0 : -1}
                      onClick={() => setActiveNeed(need.id)}
                      onKeyDown={handleNeedKeyDown}
                      className={`min-h-11 rounded-full border px-4 text-[12px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#507763] ${
                        selected
                          ? "border-[#345849] bg-[#345849] text-[#fffdf8]"
                          : "border-[#d4ddd2] bg-[#fbfaf5] text-[#54695b] hover:border-[#9db19f] hover:bg-[#edf1e9]"
                      }`}
                    >
                      {need.label}
                    </button>
                  );
                })}
              </div>
              <div
                id="need-panel"
                role="tabpanel"
                aria-labelledby={`need-tab-${selectedNeed.id}`}
                tabIndex={0}
                className="mt-5 rounded-[24px] border border-[#dce3d8] bg-[#fbfaf5] p-6 shadow-[0_14px_38px_rgba(45,67,51,.045)] outline-none focus-visible:ring-2 focus-visible:ring-[#8aa28f] sm:p-8"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#748977]">
                  A conversation, not a checklist
                </p>
                <h3 className="display-font mt-3 text-[27px] leading-[1.12] tracking-[-.035em] text-[#355345] sm:text-[31px]">
                  {selectedNeed.title}
                </h3>
                <p className="mt-4 max-w-[620px] text-[13px] leading-7 text-[#69776d]">
                  {selectedNeed.description}
                </p>
                <div className="mt-6 flex gap-3 rounded-[16px] bg-[#edf1e9] p-4">
                  <span className="mt-0.5 shrink-0 text-[#6c8774]"><ShieldCheck size={17} strokeWidth={1.7} /></span>
                  <p className="text-[11px] leading-[1.8] text-[#68776c]">
                    Selecting a topic only changes this example. It does not assess or diagnose symptoms, and nothing is saved or sent.
                  </p>
                </div>
              </div>
              <p className="mt-4 text-[10px] leading-5 text-[#8a8e84]">
                Some symptoms after a head injury need urgent evaluation. This page is not for emergencies or a new injury.
              </p>
            </div>
          </div>
        </section>

        <section id="approach" className="mx-auto grid max-w-[1240px] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:gap-20 lg:px-12 lg:py-28">
          <div className="max-w-[390px]">
            <SectionLabel>A clear, considered start</SectionLabel>
            <h2 className="display-font text-[clamp(2.4rem,5vw,3.7rem)] leading-[1.04] tracking-[-.05em] text-[#29453a]">A little more support. A lot less figuring it out alone.</h2>
            <p className="mt-5 text-[14px] leading-7 text-[#64736a]">You bring what you’re experiencing. A clinician helps connect the dots and map out a manageable next step.</p>
            <button onClick={openNextStep} type="button" className="mt-7 inline-flex items-center gap-2 text-[13px] font-semibold text-[#496b59] hover:text-[#29453a]">
              See whether it may fit <ArrowRight size={15} />
            </button>
          </div>
          <div className="grid gap-0 sm:grid-cols-3">
            {[
              { number: "01", title: "Start with your experience", description: "A symptom-led conversation gives space to describe what feels hardest, without needing the perfect words.", icon: CircleHelp },
              { number: "02", title: "Meet with a clinician", description: "A specialist reviews your situation, listens to your priorities, and helps clarify what support may be useful.", icon: Stethoscope },
              { number: "03", title: "Make a plan together", description: "Leave with practical next steps and a way to check in as your needs change over time.", icon: ClipboardList },
            ].map((step, index) => {
              const Icon = step.icon;
              return (
                <article key={step.number} className={`relative border-t border-[#cbd7cb] py-6 sm:border-l sm:border-t-0 sm:px-5 sm:py-2 ${index === 0 ? "sm:border-l-0 sm:pl-0" : ""}`}>
                  <div className="flex items-center justify-between sm:block">
                    <span className="display-font text-[30px] text-[#a4b4a4]">{step.number}</span>
                    <Icon className="text-[#748d7b] sm:mt-7" size={20} strokeWidth={1.5} />
                  </div>
                  <h3 className="mt-4 max-w-[190px] text-[15px] font-semibold leading-6 text-[#344d40]">{step.title}</h3>
                  <p className="mt-2 max-w-[215px] text-[12px] leading-[1.8] text-[#758078]">{step.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="care" className="overflow-hidden bg-[#e7ede5]">
          <div className="mx-auto grid max-w-[1240px] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:gap-20 lg:px-12 lg:py-24">
            <div className="relative order-2 min-h-[370px] overflow-hidden rounded-[28px] bg-[#d4e0d5] p-5 sm:min-h-[410px] sm:p-8 lg:order-1">
              <div className="absolute -left-20 -top-24 h-72 w-72 rounded-full border border-white/70" />
              <div className="absolute -left-8 -top-12 h-56 w-56 rounded-full border border-white/70" />
              <div className="absolute bottom-[-90px] right-[-50px] h-[330px] w-[330px] rounded-full bg-[#f1ead8]/70" />
              <div className="relative z-[1] flex items-center justify-between">
                <span className="rounded-full bg-[#f8f7f0]/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.15em] text-[#65806d]">A sample, not a prescription</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-white/40 text-[#65806d]"><CalendarDays size={16} /></span>
              </div>
              <div className="relative z-[1] mt-12 max-w-[365px] rounded-[21px] border border-white/90 bg-[#fbfaf5]/95 p-5 shadow-[0_16px_40px_rgba(56,79,61,.08)] sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#829083]">A gentler rhythm</p><h3 className="display-font mt-1 text-[25px] tracking-[-.04em] text-[#355345]">The day, with room to adjust</h3></div>
                  <span className="rounded-full bg-[#e8efe6] px-2.5 py-1 text-[10px] text-[#60806b]">Example</span>
                </div>
                <div className="mt-6 space-y-4">
                  {[
                    ["Morning", "Choose one priority; leave space around it."],
                    ["Midday", "Pause before your energy runs low."],
                    ["Later", "Notice what helped. Adjust tomorrow."],
                  ].map(([time, text], index) => (
                    <div key={time} className="flex gap-3">
                      <div className="flex w-12 shrink-0 flex-col items-center">
                        <span className={`mt-1 h-2 w-2 rounded-full ${index === 1 ? "bg-[#c18a68]" : "bg-[#78917b]"}`} />
                        {index < 2 && <span className="mt-1 h-8 w-px bg-[#dce4d8]" />}
                      </div>
                      <div className="-mt-1 pb-1"><p className="text-[12px] font-semibold text-[#435c4e]">{time}</p><p className="mt-1 text-[11px] leading-5 text-[#7b867c]">{text}</p></div>
                    </div>
                  ))}
                </div>
              </div>
              <p className="absolute bottom-5 right-5 z-[1] max-w-[150px] text-right text-[10px] leading-4 text-[#6d8071]">An example of pacing—not medical guidance.</p>
            </div>
            <div className="order-1 lg:order-2">
              <SectionLabel>Your care, as it unfolds</SectionLabel>
              <h2 className="display-font max-w-[500px] text-[clamp(2.45rem,5vw,3.8rem)] leading-[1.03] tracking-[-.05em] text-[#29453a]">A plan that can move with you.</h2>
              <p className="mt-5 max-w-[470px] text-[14px] leading-7 text-[#65746a]">Recovery isn’t a straight line. Your clinician can help turn what you’re noticing into practical guidance—then revisit it together.</p>
              <div className="mt-8 space-y-5">
                {[
                  ["Make symptoms easier to talk about", "Connect patterns with everyday activities, rest, and the things you want to return to."],
                  ["Choose realistic next steps", "Shape a plan around your current capacity, with clear priorities instead of a long to-do list."],
                  ["Check in and adjust", "Follow-up creates space to talk through what’s changed and whether the plan needs a different approach."],
                ].map(([title, text]) => (
                  <div key={title} className="flex gap-3.5">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#d5e2d5] text-[#577662]"><Check size={13} strokeWidth={2.2} /></span>
                    <div><h3 className="text-[13px] font-semibold text-[#3d5548]">{title}</h3><p className="mt-1 max-w-[430px] text-[12px] leading-[1.8] text-[#768078]">{text}</p></div>
                  </div>
                ))}
              </div>
              <div className="mt-8 border-l-2 border-[#bd8268] pl-4 text-[12px] leading-6 text-[#6e786f]">Your plan is a conversation, not a test you need to pass.</div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-[1240px] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[.78fr_1.22fr] lg:gap-20 lg:px-12 lg:py-24">
          <div>
            <SectionLabel>Support that connects</SectionLabel>
            <h2 className="display-font max-w-[420px] text-[clamp(2.35rem,5vw,3.55rem)] leading-[1.04] tracking-[-.05em] text-[#29453a]">Care shouldn’t stop at the conversation.</h2>
            <p className="mt-5 max-w-[390px] text-[14px] leading-7 text-[#68766d]">When it’s helpful, your clinician can support coordination with the people and services already around you.</p>
          </div>
          <div className="grid gap-px overflow-hidden rounded-[24px] border border-[#dce2d8] bg-[#dce2d8] sm:grid-cols-2">
            {[
              { icon: MapPin, title: "Thoughtful referrals", copy: "If a different kind of specialist may help, talk through referral options and what to expect." },
              { icon: HeartHandshake, title: "Care-team coordination", copy: "With your agreement, share relevant context with your existing clinician or care team." },
              { icon: ClipboardList, title: "Useful follow-through", copy: "Leave conversations with practical notes and a clearer sense of what to do next." },
              { icon: CalendarDays, title: "Ongoing check-ins", copy: "Make room for follow-up conversations and adjustments as your needs evolve." },
            ].map((item) => {
              const Icon = item.icon;
              return <article key={item.title} className="bg-[#f8f7f1] p-5 sm:p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e6ede4] text-[#68816e]"><Icon size={17} strokeWidth={1.6} /></span>
                <h3 className="mt-5 text-[14px] font-semibold text-[#3c5548]">{item.title}</h3>
                <p className="mt-2 max-w-[300px] text-[12px] leading-[1.8] text-[#758077]">{item.copy}</p>
              </article>;
            })}
          </div>
        </section>

        <section className="bg-[#f0eee5]">
          <div className="mx-auto grid max-w-[1240px] gap-8 px-5 py-10 sm:grid-cols-[1fr_auto] sm:items-center sm:px-8 lg:px-12">
            <div className="flex gap-4">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d9c9b7] text-[#a2715c]"><ShieldCheck size={17} strokeWidth={1.7} /></span>
              <div><p className="text-[12px] font-semibold text-[#554b42]">A note about urgent symptoms</p><p className="mt-1 max-w-[750px] text-[11px] leading-[1.8] text-[#777066]">This service is not for emergencies, a new head injury, or acute care. If symptoms are severe, rapidly worsening, or feel urgent, seek emergency medical care now or contact your local emergency number.</p></div>
            </div>
            <span className="pl-[52px] text-[10px] font-medium uppercase tracking-[.13em] text-[#8a8074] sm:pl-0">Your safety comes first</span>
          </div>
        </section>

        <section id="questions" className="mx-auto grid max-w-[1240px] gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[.65fr_1.35fr] lg:gap-20 lg:px-12 lg:py-24">
          <div>
            <SectionLabel>Good to know</SectionLabel>
            <h2 className="display-font text-[clamp(2.5rem,5vw,3.5rem)] leading-[1.04] tracking-[-.05em] text-[#29453a]">A few things you might be wondering.</h2>
            <p className="mt-4 text-[13px] leading-6 text-[#6e7b71]">Clear boundaries are part of good care.</p>
          </div>
          <div className="border-t border-[#d8dfd6]">
            {questions.map((item, index) => {
              const expanded = openQuestion === index;
              return (
                <div key={item.question} className="border-b border-[#d8dfd6]">
                  <button
                    type="button"
                    onClick={() => setOpenQuestion(expanded ? null : index)}
                    aria-expanded={expanded}
                    className="flex w-full items-center justify-between gap-5 py-5 text-left"
                  >
                    <span className="text-[13px] font-semibold text-[#41594c] sm:text-[14px]">{item.question}</span>
                    <ChevronDown size={17} className={`shrink-0 text-[#7a8e7c] transition-transform ${expanded ? "rotate-180" : ""}`} />
                  </button>
                  {expanded && <p className="max-w-[680px] pb-5 pr-10 text-[12px] leading-[1.9] text-[#738077]">{item.answer}</p>}
                </div>
              );
            })}
          </div>
        </section>

        <section className="px-5 pb-20 sm:px-8 lg:px-12 lg:pb-24">
          <div className="relative mx-auto max-w-[1240px] overflow-hidden rounded-[30px] bg-[#355747] px-6 py-10 text-[#f8f7f0] sm:px-10 sm:py-12 lg:px-14">
            <div className="absolute -right-16 -top-32 h-[350px] w-[350px] rounded-full border border-[#ffffff18]" />
            <div className="absolute -right-2 -top-16 h-[240px] w-[240px] rounded-full border border-[#ffffff20]" />
            <div className="relative z-[1] grid gap-8 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#c3d2c3]">A thoughtful place to begin</p>
                <h2 className="display-font mt-3 max-w-[620px] text-[clamp(2.2rem,5vw,3.5rem)] leading-[1.04] tracking-[-.045em]">See if this kind of support could fit.</h2>
                <p className="mt-4 max-w-[520px] text-[13px] leading-6 text-[#d8e1d7]">Take a look at the intended eligibility and what a next step could involve. No information is collected in this concept.</p>
              </div>
              <button type="button" onClick={openNextStep} className="inline-flex min-h-[50px] items-center justify-between gap-7 rounded-full bg-[#f5f3e9] px-5 text-[13px] font-semibold text-[#355747] transition-colors hover:bg-white">
                Explore the next step <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#dce2d8] bg-[#f0efe7]">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-5 px-5 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <div className="flex items-center gap-2.5"><BrandMark /><span className="display-font text-[18px] font-semibold tracking-[-.04em] text-[#355345]">stillwell</span></div>
          <p className="max-w-[540px] text-[10px] leading-5 text-[#7a8178]">Concept preview · Product concept, not medical advice. Not emergency or acute injury care.</p>
          <a href="#top" className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#54705e] hover:text-[#29453a]">Back to top <ArrowUpRight size={13} /></a>
        </div>
      </footer>

      {panelOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#1d3029]/35 p-0 backdrop-blur-[3px] sm:items-center sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPanelOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="next-step-title"
            className="relative max-h-[92dvh] w-full max-w-[510px] overflow-y-auto rounded-t-[28px] border border-[#e5e9df] bg-[#fbfaf5] p-6 shadow-[0_28px_90px_rgba(31,53,43,.2)] sm:rounded-[28px] sm:p-8"
          >
            <button type="button" aria-label="Close panel" onClick={() => setPanelOpen(false)} className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border border-[#dfe5da] text-[#63766a] hover:bg-[#eef1e9]"><X size={17} /></button>
            {!showNextStep ? (
              <>
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-[#e8eee5] text-[#66806e]"><ShieldCheck size={21} strokeWidth={1.6} /></div>
                <p className="text-[10px] font-semibold uppercase tracking-[.17em] text-[#738976]">A low-pressure first look</p>
                <h2 id="next-step-title" className="display-font mt-2 max-w-[390px] text-[32px] leading-[1.05] tracking-[-.045em] text-[#304c3f]">Could this support be meant for you?</h2>
                <p className="mt-4 text-[13px] leading-6 text-[#6c786e]">This concept is designed for adults who are:</p>
                <ul className="mt-4 space-y-3">
                  {[
                    "Recovering at home after a clinician-assessed concussion",
                    "Within six months of the injury",
                    "Looking for clinician-guided planning and follow-up",
                  ].map((item) => <li key={item} className="flex gap-3 text-[12px] leading-5 text-[#506458]"><span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#e2ebe0] text-[#64816c]"><Check size={11} strokeWidth={2.4} /></span>{item}</li>)}
                </ul>
                <div className="mt-5 rounded-[16px] border border-[#e4e5d9] bg-[#f3f2e9] p-4">
                  <p className="text-[11px] font-semibold text-[#526255]">What happens next in this concept</p>
                  <p className="mt-1.5 text-[11px] leading-[1.8] text-[#788075]">A real service would explain its intake and clinician-review process before collecting any information. This preview does not collect or send anything.</p>
                </div>
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
                  <button type="button" onClick={() => setPanelOpen(false)} className="min-h-[46px] rounded-full border border-[#d7e0d5] px-5 text-[12px] font-semibold text-[#567061] hover:bg-[#f0f3ed]">Not right now</button>
                  <button type="button" onClick={() => setShowNextStep(true)} className="flex min-h-[46px] flex-1 items-center justify-center gap-3 rounded-full bg-[#345849] px-5 text-[12px] font-semibold text-white hover:bg-[#28493b]">Show me a sample next step <ArrowRight size={15} /></button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-[#e8eee5] text-[#66806e]"><Check size={21} strokeWidth={1.7} /></div>
                <p className="text-[10px] font-semibold uppercase tracking-[.17em] text-[#738976]">Sample next step</p>
                <h2 id="next-step-title" className="display-font mt-2 text-[32px] leading-[1.05] tracking-[-.045em] text-[#304c3f]">Start with a conversation.</h2>
                <p className="mt-4 text-[13px] leading-6 text-[#6c786e]">In a real experience, you’d first see clear details about the process, then choose whether to continue. A clinician would review your situation and discuss care that may fit.</p>
                <div className="mt-5 space-y-3 rounded-[16px] border border-[#e2e8df] bg-[#f1f4ed] p-4">
                  <div className="flex gap-3"><span className="mt-0.5 text-[#718a76]"><Stethoscope size={17} /></span><p className="text-[11px] leading-[1.8] text-[#637166]"><strong className="font-semibold text-[#48604f]">No forms in this preview.</strong> Nothing you type or select is needed, stored, or sent.</p></div>
                  <div className="flex gap-3"><span className="mt-0.5 text-[#718a76]"><HeartHandshake size={17} /></span><p className="text-[11px] leading-[1.8] text-[#637166]"><strong className="font-semibold text-[#48604f]">Care stays collaborative.</strong> You can ask questions and decide what feels right for you.</p></div>
                </div>
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
                  <button type="button" onClick={() => setShowNextStep(false)} className="min-h-[46px] rounded-full border border-[#d7e0d5] px-5 text-[12px] font-semibold text-[#567061] hover:bg-[#f0f3ed]">Back</button>
                  <button type="button" onClick={() => setPanelOpen(false)} className="flex min-h-[46px] flex-1 items-center justify-center gap-3 rounded-full bg-[#345849] px-5 text-[12px] font-semibold text-white hover:bg-[#28493b]">Close preview <Check size={15} /></button>
                </div>
              </>
            )}
            <p className="mt-5 text-center text-[9px] leading-4 text-[#93978d]">Concept preview · Not medical advice · No real service or appointment is being offered</p>
          </section>
        </div>
      )}
    </div>
  );
}