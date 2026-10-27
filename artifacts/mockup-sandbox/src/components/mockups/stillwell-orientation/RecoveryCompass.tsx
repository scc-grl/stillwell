import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Headphones,
  Heart,
  Leaf,
  LockKeyhole,
  Moon,
  MoveUpRight,
  Phone,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Sun,
  Wind,
} from "lucide-react";

const concerns = [
  { id: "headaches", label: "Headaches", detail: "Pain or pressure", icon: Sun },
  { id: "focus", label: "Focus & memory", detail: "Thinking feels slower", icon: Sparkles },
  { id: "balance", label: "Dizziness", detail: "Balance or motion", icon: Wind },
  { id: "sleep", label: "Sleep & energy", detail: "Rest feels different", icon: Moon },
  { id: "light", label: "Light & sound", detail: "Busy places feel harder", icon: Headphones },
  { id: "mood", label: "Mood & stress", detail: "Feeling unlike yourself", icon: Heart },
];

const moments = [
  "Getting through my usual routine",
  "Being around people or noise",
  "Keeping my energy steady",
  "Finding time to rest",
];

const supportIdeas = [
  {
    title: "Start with the part that feels hardest",
    copy: "A clinician can help connect your symptoms with the moments they affect. You don’t need to have it all figured out first.",
    icon: CircleHelp,
  },
  {
    title: "Keep the next step small",
    copy: "Talk together about one manageable adjustment for now, and what would make it worth checking in again.",
    icon: Leaf,
  },
];

const supportRoutes: Record<string, { focus: string; people: string; question: string }> = {
  headaches: {
    focus: "Headache or pain support",
    people: "Your primary clinician; ask whether a clinician with headache or concussion experience could help.",
    question: "Who can help me understand and manage the headaches I’m noticing?",
  },
  focus: {
    focus: "Thinking and everyday tasks",
    people: "Your primary clinician; ask whether occupational therapy or a neuropsychology consult fits.",
    question: "Would support for focus, memory, or returning to my routine be useful?",
  },
  balance: {
    focus: "Dizziness and balance",
    people: "Your primary clinician; ask whether a vestibular physical therapist is appropriate.",
    question: "Should someone assess the dizziness or balance changes before I increase activity?",
  },
  sleep: {
    focus: "Sleep and energy",
    people: "Your primary clinician; ask about additional sleep support if the change persists.",
    question: "What could be affecting my sleep or energy, and what should I track?",
  },
  light: {
    focus: "Sensitivity in busy environments",
    people: "Your primary clinician; ask whether occupational therapy or another focused assessment may help.",
    question: "Could someone help me adapt daily routines while light or sound feels difficult?",
  },
  mood: {
    focus: "Mood and stress",
    people: "Your primary clinician; a mental health professional may be another supportive conversation.",
    question: "What emotional support could sit alongside my recovery care?",
  },
};

export function RecoveryCompass() {
  const [step, setStep] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [moment, setMoment] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [accountAcknowledged, setAccountAcknowledged] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [showSafety, setShowSafety] = useState(false);
  const [protocolSteps, setProtocolSteps] = useState<string[]>([]);

  const toggleConcern = (id: string) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length < 3
          ? [...current, id]
          : current,
    );
  };

  const reset = () => {
    setStep(0);
    setHasStarted(false);
    setSelected([]);
    setMoment(null);
    setPhone("");
    setAccountAcknowledged(false);
    setPhoneError("");
    setShowSafety(false);
    setProtocolSteps([]);
  };

  const toggleProtocolStep = (id: string) => {
    setProtocolSteps((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const continueFlow = () => {
    if (step !== 2) {
      setStep((current) => Math.min(4, current + 1));
      return;
    }
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) {
      setPhoneError("Enter a phone number with 7–15 digits, including country code.");
      return;
    }
    if (!accountAcknowledged) {
      setPhoneError("Confirm the prototype privacy note to continue.");
      return;
    }
    setPhoneError("");
    setStep(3);
  };

  const selectedConcerns = selected.flatMap((id) => {
    const match = concerns.find((item) => item.id === id);
    return match ? [match] : [];
  });
  const selectedLabels = selectedConcerns.map((item) => item.label.toLowerCase());
  const prioritizedRoutes = selectedConcerns.map((item) => ({
    ...supportRoutes[item.id],
    icon: item.icon,
  }));

  return (
    <main className="rc-root">
      <style>{`
        .rc-root {
          --paper: #f5f4ed;
          --card: #fffdf7;
          --ink: #29453a;
          --muted: #6e7c70;
          --line: #dce3d8;
          --sage: #345849;
          --sage-soft: #e9efe6;
          --terra: #b87660;
          min-height: 100dvh;
          color: var(--ink);
          background:
            radial-gradient(ellipse at 8% 2%, rgba(222, 231, 215, .68), transparent 33rem),
            var(--paper);
          font-family: "DM Sans", "Avenir Next", sans-serif;
        }
        .rc-root * { box-sizing: border-box; }
        .rc-display { font-family: "Fraunces", Georgia, serif; }
        .rc-enter { animation: rc-enter .38s ease-out both; }
        @keyframes rc-enter { from { opacity: 0; transform: translateY(7px); } to { opacity: 1; transform: translateY(0); } }
        .rc-choice { transition: border-color .18s ease, background-color .18s ease, transform .18s ease; }
        .rc-choice:hover { transform: translateY(-1px); border-color: #a7b9a9 !important; }
        .rc-choice:focus-visible, .rc-button:focus-visible, .rc-rail-button:focus-visible { outline: 3px solid #9bb29e; outline-offset: 3px; }
        .rc-home-grid { display: grid; grid-template-columns: minmax(0, 1.12fr) minmax(255px, .88fr); gap: 24px; align-items: center; }
        .rc-help-grid { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, .7fr); gap: 11px; }
        .rc-help-stack { display: grid; gap: 11px; }
        .rc-path { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
        .rc-route-grid { display: grid; gap: 9px; margin-top: 13px; }
        .rc-nav-link { border: 0; background: transparent; color: #6e7e71; font: inherit; cursor: pointer; text-decoration: none; }
        .rc-nav-link:hover { color: #345849; }
        @media (max-width: 760px) {
          .rc-layout { grid-template-columns: 1fr !important; }
          .rc-side { display: none !important; }
          .rc-mobile-steps { display: flex !important; }
          .rc-page-nav { gap: 9px !important; }
          .rc-nav-link { display: none; }
          .rc-home-grid, .rc-help-grid, .rc-path { grid-template-columns: 1fr !important; }
          .rc-plan-grid { grid-template-columns: 1fr !important; }
          .rc-plan-food, .rc-plan-movement { grid-column: span 1 !important; }
          .rc-movement-phases { grid-template-columns: 1fr !important; }
        }
        @media (prefers-reduced-motion: reduce) { .rc-root *, .rc-root *::before, .rc-root *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; } }
      `}</style>

      <header style={{ minHeight: 74, borderBottom: "1px solid #e0e5dc", background: "rgba(250,249,243,.88)" }}>
        <div className="rc-page-nav" style={{ maxWidth: 1180, minHeight: 74, margin: "0 auto", padding: "10px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="#start" aria-label="Stillwell, start over" onClick={(event) => { event.preventDefault(); reset(); }} style={{ display: "flex", alignItems: "center", gap: 11, color: "inherit", textDecoration: "none" }}>
            <span style={{ width: 34, height: 34, borderRadius: "50%", border: "1px solid #b7c9bd", background: "#e6eee7", display: "grid", placeItems: "center", position: "relative" }}>
              <span style={{ width: 17, height: 17, border: "1px solid #537566", borderRadius: "50%" }} />
              <span style={{ position: "absolute", width: 6, height: 6, right: 6, top: 6, background: "#bd705c", borderRadius: "50%" }} />
            </span>
            <span className="rc-display" style={{ fontSize: 21, fontWeight: 600, letterSpacing: "-.05em" }}>stillwell</span>
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            {!hasStarted ? (
              <a className="rc-nav-link" href="#what-help" style={{ fontSize: 11, fontWeight: 650 }}>What this covers</a>
            ) : (
              <button className="rc-nav-link" type="button" onClick={() => setHasStarted(false)} style={{ fontSize: 11, fontWeight: 650 }}>Overview</button>
            )}
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "#768477", fontSize: 10, letterSpacing: ".01em" }}>
              <LockKeyhole size={13} color="#718a77" />
              <span>Private prototype · nothing is saved</span>
            </span>
            <button className="rc-button" type="button" onClick={() => hasStarted ? reset() : setHasStarted(true)} style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 39, padding: "0 15px", border: "1px solid #345849", borderRadius: 99, background: hasStarted ? "transparent" : "#345849", color: hasStarted ? "#345849" : "#fffdf7", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              {hasStarted ? "Restart" : "Get started"} <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </header>

      <div className="rc-layout" style={{ maxWidth: 1180, minHeight: "calc(100dvh - 74px)", margin: "0 auto", padding: "38px 28px 52px", display: "grid", gridTemplateColumns: "230px minmax(0, 1fr)", gap: 58 }}>
        <aside className="rc-side" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "16px 0 3px" }}>
          {!hasStarted ? <div>
            <p style={{ margin: "0 0 14px", color: "#839083", fontSize: 10, fontWeight: 700, letterSpacing: ".17em", textTransform: "uppercase" }}>A clearer next step</p>
            <p className="rc-display" style={{ margin: "0 0 13px", color: "#345849", fontSize: 27, lineHeight: 1.12, letterSpacing: "-.04em" }}>Start with what matters to you.</p>
            <p style={{ margin: 0, color: "#748175", fontSize: 11, lineHeight: 1.8 }}>A short check-in helps you sort your priorities before you decide what kind of support to ask about.</p>
            <div style={{ height: 1, margin: "22px 0 16px", background: "#dfe4da" }} />
            <div style={{ display: "grid", gap: 13, color: "#6d7b70", fontSize: 10, lineHeight: 1.6 }}>
              <div><strong style={{ color: "#506758" }}>Understand</strong><br />Name what feels different.</div>
              <div><strong style={{ color: "#506758" }}>Prioritize</strong><br />Choose what deserves attention first.</div>
              <div><strong style={{ color: "#506758" }}>Prepare</strong><br />Explore who to discuss it with.</div>
            </div>
          </div> : <div>
            <p style={{ margin: "0 0 23px", color: "#839083", fontSize: 10, fontWeight: 700, letterSpacing: ".17em", textTransform: "uppercase" }}>A gentle check-in</p>
            <div style={{ display: "grid", gap: 0 }}>
              {[
                ["01", "What feels different?"],
                ["02", "How is today going?"],
                ["03", "Create an account"],
                ["04", "Your reflection"],
                ["05", "Recovery plan"],
              ].map(([number, title], index) => {
                const active = step === index;
                const complete = step > index;
                return (
                  <div key={number} style={{ position: "relative", display: "flex", gap: 13, minHeight: 72 }}>
                    {index < 4 && <span style={{ position: "absolute", left: 14, top: 31, bottom: 0, width: 1, background: complete ? "#89a28f" : "#d9e1d7" }} />}
                    <span style={{ zIndex: 1, width: 29, height: 29, flex: "0 0 29px", borderRadius: "50%", display: "grid", placeItems: "center", background: active || complete ? "#345849" : "#eeefe8", color: active || complete ? "#fffdf7" : "#8a9689", fontSize: 10, fontWeight: 700 }}>
                      {complete ? <Check size={13} /> : number}
                    </span>
                    <span style={{ paddingTop: 5, color: active ? "#345849" : "#849084", fontSize: 12, fontWeight: active ? 650 : 500 }}>{title}</span>
                  </div>
                );
              })}
            </div>
          </div>}
          <div style={{ borderTop: "1px solid #dfe4da", paddingTop: 17 }}>
            <div style={{ display: "flex", gap: 9, alignItems: "flex-start", color: "#859083" }}>
              <ShieldCheck size={15} style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ margin: 0, fontSize: 10, lineHeight: 1.7 }}>This is a way to prepare for a conversation, not a symptom checker or diagnosis.</p>
            </div>
            <button className="rc-button" type="button" onClick={() => setShowSafety((current) => !current)} style={{ border: 0, background: "transparent", padding: "15px 0 0", display: "inline-flex", alignItems: "center", gap: 5, color: "#67796d", cursor: "pointer", fontSize: 10, fontWeight: 650 }}>
              Safety information <ChevronRight size={13} style={{ transform: showSafety ? "rotate(90deg)" : "none", transition: "transform .18s" }} />
            </button>
            {showSafety && <p className="rc-enter" style={{ margin: "9px 0 0", padding: 11, borderRadius: 11, background: "#f4eae2", color: "#785b4d", fontSize: 10, lineHeight: 1.65 }}>For a new injury, severe or rapidly worsening symptoms, seek urgent medical care or contact your local emergency number.</p>}
          </div>
        </aside>

        <section id="start" style={{ minWidth: 0, maxWidth: 760, width: "100%", margin: "0 auto" }}>
          {hasStarted && <div className="rc-mobile-steps" style={{ display: "none", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
            <div style={{ display: "flex", gap: 6 }}>
              {[0, 1, 2, 3, 4].map((index) => <span key={index} style={{ height: 3, width: index === step ? 34 : 20, borderRadius: 9, background: index <= step ? "#557866" : "#dce3d8", transition: "width .2s" }} />)}
            </div>
            <span style={{ color: "#7d897d", fontSize: 10, fontWeight: 650 }}>STEP {String(step + 1).padStart(2, "0")} / 05</span>
          </div>}

          {!hasStarted && (
            <div className="rc-enter">
              <div className="rc-home-grid">
                <div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 11px", border: "1px solid #d7e0d4", borderRadius: 99, background: "#edf2e9", color: "#627a68", fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" }}>
                    <Sparkles size={13} /> A personal starting point
                  </div>
                  <h1 className="rc-display" style={{ maxWidth: 520, margin: "23px 0 13px", color: "#29453a", fontSize: "clamp(42px, 5vw, 62px)", fontWeight: 500, letterSpacing: "-.06em", lineHeight: .99 }}>
                    Recovery has more than <em style={{ color: "#81927f", fontWeight: 400 }}>one way in.</em>
                  </h1>
                  <p style={{ maxWidth: 490, margin: 0, color: "#6d7b70", fontSize: 14, lineHeight: 1.85 }}>
                    Stillwell helps you make sense of what feels hardest, find a place to begin, and prepare for a more useful conversation with a clinician.
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, marginTop: 24 }}>
                    <button className="rc-button" type="button" onClick={() => setHasStarted(true)} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 13, minHeight: 49, padding: "0 20px 0 22px", border: 0, borderRadius: 99, background: "#345849", color: "#fffdf7", fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: "0 7px 18px rgba(48,82,64,.12)" }}>
                      Personalize my starting point <ArrowRight size={15} />
                    </button>
                    <span style={{ color: "#869184", fontSize: 10 }}>About 2 minutes · skip any question</span>
                  </div>
                </div>

                <div style={{ position: "relative", minHeight: 300, padding: "24px 21px", overflow: "hidden", border: "1px solid #dfe5db", borderRadius: 22, background: "linear-gradient(145deg, #f2f4ec, #e8eee5)" }}>
                  <span aria-hidden="true" style={{ position: "absolute", width: 220, height: 220, right: -75, top: -100, borderRadius: "50%", border: "1px solid rgba(106,139,116,.2)" }} />
                  <span aria-hidden="true" style={{ position: "absolute", width: 160, height: 160, right: -45, top: -70, borderRadius: "50%", border: "1px solid rgba(106,139,116,.18)" }} />
                  <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <span style={{ color: "#738474", fontSize: 9, fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase" }}>Your recovery compass</span>
                    <span style={{ width: 29, height: 29, display: "grid", placeItems: "center", borderRadius: "50%", background: "#fffdf7", color: "#68836e" }}><CircleHelp size={15} /></span>
                  </div>
                  <p className="rc-display" style={{ position: "relative", maxWidth: 280, margin: "20px 0 19px", color: "#345346", fontSize: 26, lineHeight: 1.1, letterSpacing: "-.04em" }}>From “what now?” to one next conversation.</p>
                  <div style={{ position: "relative", display: "grid", gap: 9 }}>
                    {[
                      ["01", "Your priorities", "What’s getting in the way"],
                      ["02", "A person to ask", "Possible support to explore"],
                      ["03", "A gentle plan", "Food, movement, and questions"],
                    ].map(([number, title, detail], index) => (
                      <div key={number} style={{ display: "grid", gridTemplateColumns: "28px minmax(0, 1fr) 14px", gap: 9, alignItems: "center", padding: "10px 11px", border: "1px solid rgba(197,211,194,.76)", borderRadius: 12, background: "rgba(255,253,247,.82)", transform: `translateX(${index === 1 ? 10 : 0}px)` }}>
                        <span style={{ color: "#a17c65", fontFamily: "Georgia,serif", fontSize: 12, fontStyle: "italic" }}>{number}</span>
                        <span><strong style={{ display: "block", color: "#4b6553", fontSize: 10 }}>{title}</strong><span style={{ display: "block", marginTop: 3, color: "#879186", fontSize: 9 }}>{detail}</span></span>
                        <ChevronRight size={13} color="#8da08d" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div id="what-help" style={{ marginTop: 37, paddingTop: 24, borderTop: "1px solid #dfe4da" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 18, marginBottom: 15 }}>
                  <div>
                    <p style={{ margin: "0 0 7px", color: "#839083", fontSize: 9, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase" }}>What you can explore</p>
                    <h2 className="rc-display" style={{ margin: 0, color: "#345346", fontSize: 25, fontWeight: 500, letterSpacing: "-.04em" }}>Practical support, shaped around your day.</h2>
                  </div>
                  <span style={{ maxWidth: 180, color: "#899186", fontSize: 9, lineHeight: 1.6 }}>Conversation starters, never a one-size-fits-all prescription.</span>
                </div>
                <div className="rc-help-grid">
                  <article style={{ minHeight: 156, padding: 18, border: "1px solid #dfe5db", borderRadius: 16, background: "#fffdf7" }}>
                    <div style={{ display: "flex", gap: 9, alignItems: "center", color: "#748a76", fontSize: 9, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase" }}><Leaf size={14} /> Everyday foundations</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 17, marginTop: 15 }}>
                      <div><p style={{ margin: "0 0 5px", color: "#486151", fontSize: 11, fontWeight: 700 }}>Food & hydration</p><p style={{ margin: 0, color: "#7d897d", fontSize: 10, lineHeight: 1.65 }}>Steady, flexible meals and simple ways to keep water nearby.</p></div>
                      <div><p style={{ margin: "0 0 5px", color: "#486151", fontSize: 11, fontWeight: 700 }}>Gentle movement</p><p style={{ margin: 0, color: "#7d897d", fontSize: 10, lineHeight: 1.65 }}>A gradual activity conversation, with clinician clearance first.</p></div>
                    </div>
                  </article>
                  <div className="rc-help-stack">
                    <article style={{ padding: 15, border: "1px solid #eadfd4", borderRadius: 16, background: "#f7f1e9" }}>
                      <div style={{ display: "flex", gap: 9, alignItems: "center", color: "#96735e", fontSize: 9, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase" }}><Heart size={14} /> The right conversation</div>
                      <p style={{ margin: "9px 0 0", color: "#7b6c5f", fontSize: 10, lineHeight: 1.65 }}>Start with your clinician; use your priorities to ask which additional support may fit.</p>
                    </article>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 29, padding: "19px 0 0", borderTop: "1px solid #dfe4da" }}>
                <p style={{ margin: "0 0 13px", color: "#839083", fontSize: 9, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase" }}>A simple route through it</p>
                <div className="rc-path">
                  {[
                    ["01", "Notice", "Name up to three things that feel different."],
                    ["02", "Prioritize", "Choose the part of daily life you want help with first."],
                    ["03", "Prepare", "See questions and possible support roles to explore."],
                  ].map(([number, title, copy], index) => (
                    <div key={number} style={{ position: "relative", paddingRight: 9 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
                        <span style={{ width: 24, height: 24, display: "grid", placeItems: "center", borderRadius: "50%", background: index === 2 ? "#f2e7dd" : "#e7eee5", color: index === 2 ? "#a2745d" : "#64806c", fontFamily: "Georgia,serif", fontSize: 10 }}>{number}</span>
                        <strong style={{ color: "#4d6553", fontSize: 11 }}>{title}</strong>
                      </div>
                      <p style={{ margin: 0, paddingLeft: 33, color: "#7d897d", fontSize: 10, lineHeight: 1.65 }}>{copy}</p>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "#899186", fontSize: 10 }}><LockKeyhole size={12} /> Demo only · no number or answers are sent or saved.</span>
                  <button className="rc-button" type="button" onClick={() => setHasStarted(true)} style={{ display: "inline-flex", alignItems: "center", gap: 10, minHeight: 42, padding: "0 17px", border: "1px solid #345849", borderRadius: 99, background: "transparent", color: "#345849", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    Take the personalized check-in <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {hasStarted && step === 0 && (
            <div className="rc-enter">
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 11px", border: "1px solid #d7e0d4", borderRadius: 99, background: "#edf2e9", color: "#627a68", fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" }}>
                <Sparkles size={13} /> Your experience, in your words
              </div>
              <h1 className="rc-display" style={{ maxWidth: 620, margin: "23px 0 12px", fontSize: "clamp(38px, 5vw, 59px)", fontWeight: 500, letterSpacing: "-.055em", lineHeight: 1.02 }}>
                What deserves your attention <em style={{ color: "#81927f", fontWeight: 400 }}>first?</em>
              </h1>
              <p style={{ maxWidth: 555, margin: 0, color: "#6d7b70", fontSize: 14, lineHeight: 1.8 }}>
                Choose up to three things you’ve noticed, in priority order. This helps shape a conversation—not a diagnosis or a fixed protocol.
              </p>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "29px 0 12px" }}>
                <span style={{ color: "#566b5c", fontSize: 11, fontWeight: 700 }}>I’ve noticed…</span>
                <span style={{ color: "#839083", fontSize: 10 }}>{selected.length} of 3 priorities</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 9 }}>
                {concerns.map(({ id, label, detail, icon: Icon }) => {
                  const active = selected.includes(id);
                  const capped = selected.length === 3 && !active;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleConcern(id)}
                      aria-pressed={active}
                      className="rc-choice"
                      style={{ minHeight: 75, display: "flex", alignItems: "center", gap: 12, textAlign: "left", padding: "13px 14px", border: `1px solid ${active ? "#77917d" : "#e0e5dc"}`, borderRadius: 15, background: active ? "#edf3e9" : "#fffdf7", cursor: capped ? "not-allowed" : "pointer", opacity: capped ? .56 : 1, color: "#3f5a4b" }}
                    >
                      <span style={{ height: 35, width: 35, flex: "0 0 35px", borderRadius: 12, display: "grid", placeItems: "center", background: active ? "#dce8d9" : "#f1f2eb", color: active ? "#587664" : "#8a9889" }}><Icon size={16} strokeWidth={1.7} /></span>
                      <span style={{ flex: 1 }}>
                        <span style={{ display: "block", fontSize: 12, fontWeight: 700 }}>{label}</span>
                        <span style={{ display: "block", marginTop: 4, color: "#879186", fontSize: 10 }}>{detail}</span>
                      </span>
                      <span style={{ height: 17, width: 17, border: `1px solid ${active ? "#62816d" : "#cad5c9"}`, borderRadius: 5, display: "grid", placeItems: "center", background: active ? "#557664" : "transparent", color: "white" }}>{active && <Check size={12} />}</span>
                    </button>
                  );
                })}
              </div>
              <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 7, color: "#899186", fontSize: 10 }}>
                <LockKeyhole size={12} /> Your choices stay on this screen and aren’t sent anywhere.
              </div>
            </div>
          )}

          {hasStarted && step === 1 && (
            <div className="rc-enter">
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 11px", border: "1px solid #d7e0d4", borderRadius: 99, background: "#edf2e9", color: "#627a68", fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" }}>
                <Clock3 size={13} /> A little context
              </div>
              <h1 className="rc-display" style={{ maxWidth: 620, margin: "23px 0 12px", fontSize: "clamp(38px, 5vw, 59px)", fontWeight: 500, letterSpacing: "-.055em", lineHeight: 1.02 }}>
                What’s been taking <em style={{ color: "#81927f", fontWeight: 400 }}>the most effort?</em>
              </h1>
              <p style={{ maxWidth: 555, margin: 0, color: "#6d7b70", fontSize: 14, lineHeight: 1.8 }}>
                Recovery can show up in everyday moments. Pick the one you’d most like help thinking through—or skip this for now.
              </p>
              <div style={{ display: "grid", gap: 10, marginTop: 30 }}>
                {moments.map((item, index) => {
                  const active = moment === item;
                  return (
                    <button key={item} type="button" onClick={() => setMoment(active ? null : item)} aria-pressed={active} className="rc-choice" style={{ display: "flex", width: "100%", minHeight: 63, alignItems: "center", gap: 15, padding: "14px 17px", border: `1px solid ${active ? "#77917d" : "#e0e5dc"}`, borderRadius: 14, background: active ? "#edf3e9" : "#fffdf7", textAlign: "left", cursor: "pointer", color: "#435c4d" }}>
                      <span style={{ width: 24, color: "#a5b3a2", fontFamily: "Georgia,serif", fontSize: 15, fontStyle: "italic" }}>0{index + 1}</span>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 650 }}>{item}</span>
                      <span style={{ height: 19, width: 19, border: `1px solid ${active ? "#5f806a" : "#cad5c9"}`, borderRadius: "50%", display: "grid", placeItems: "center", background: active ? "#557664" : "transparent", color: "white" }}>{active && <Check size={12} />}</span>
                    </button>
                  );
                })}
              </div>
              {selectedLabels.length > 0 && <div style={{ marginTop: 19, padding: "14px 16px", borderLeft: "2px solid #bd8268", color: "#758074", fontSize: 11, lineHeight: 1.7 }}>
                You mentioned <strong style={{ color: "#4e6857", fontWeight: 650 }}>{selectedLabels.join(", ")}</strong>. There’s no right way to describe it.
              </div>}
            </div>
          )}

          {hasStarted && step === 2 && (
            <div className="rc-enter">
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 11px", border: "1px solid #d7e0d4", borderRadius: 99, background: "#edf2e9", color: "#627a68", fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" }}>
                <Phone size={13} /> Prototype account step
              </div>
              <h1 className="rc-display" style={{ maxWidth: 620, margin: "23px 0 12px", fontSize: "clamp(38px, 5vw, 59px)", fontWeight: 500, letterSpacing: "-.055em", lineHeight: 1.02 }}>
                Before your reflection, <em style={{ color: "#81927f", fontWeight: 400 }}>create an account.</em>
              </h1>
              <p style={{ maxWidth: 555, margin: 0, color: "#6d7b70", fontSize: 14, lineHeight: 1.8 }}>
                A real Stillwell service could use your mobile number to create and verify an account before showing a saved reflection. This demo does not create an account or send a text.
              </p>
              <form noValidate onSubmit={(event) => { event.preventDefault(); continueFlow(); }} style={{ marginTop: 27 }}>
                <label htmlFor="rc-phone" style={{ display: "block", marginBottom: 8, color: "#506758", fontSize: 11, fontWeight: 700 }}>Mobile phone number</label>
                <input
                  id="rc-phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+1 555 010 2040"
                  value={phone}
                  onChange={(event) => { setPhone(event.target.value); setPhoneError(""); }}
                  aria-invalid={Boolean(phoneError && phone.replace(/\D/g, "").length < 7)}
                  aria-describedby="rc-phone-note rc-phone-error"
                  style={{ width: "100%", maxWidth: 470, minHeight: 54, border: "1px solid #cbd8cb", borderRadius: 13, background: "#fffdf7", padding: "0 16px", color: "#365346", fontFamily: "inherit", fontSize: 15, outlineColor: "#72907b" }}
                />
                <p id="rc-phone-note" style={{ maxWidth: 470, margin: "9px 0 0", color: "#879186", fontSize: 10, lineHeight: 1.7 }}>
                  Enter a country code too. A live service would verify number access and explain how it handles your information.
                </p>
                <label htmlFor="rc-account-ack" style={{ display: "flex", alignItems: "flex-start", gap: 10, maxWidth: 520, marginTop: 20, padding: 14, border: "1px solid #dfe5db", borderRadius: 13, background: "#f4f5ef", color: "#637267", cursor: "pointer", fontSize: 11, lineHeight: 1.7 }}>
                  <input id="rc-account-ack" type="checkbox" checked={accountAcknowledged} onChange={(event) => { setAccountAcknowledged(event.target.checked); setPhoneError(""); }} style={{ width: 16, height: 16, marginTop: 1, accentColor: "#54745e", flexShrink: 0 }} />
                  <span>I understand this concept keeps the number in temporary page state only. No account is created, and no SMS or data is sent.</span>
                </label>
                {phoneError && <p id="rc-phone-error" role="alert" style={{ maxWidth: 470, margin: "10px 0 0", color: "#a04f42", fontSize: 11, fontWeight: 600 }}>{phoneError}</p>}
              </form>
              <div style={{ marginTop: 19, display: "flex", alignItems: "flex-start", gap: 9, maxWidth: 520, color: "#7b8175", fontSize: 10, lineHeight: 1.7 }}>
                <LockKeyhole size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>This is a mock account gate so you can review the flow. It does not verify a number or associate your reflection with a real profile.</span>
              </div>
            </div>
          )}

          {hasStarted && step === 3 && (
            <div className="rc-enter">
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 11px", border: "1px solid #d7e0d4", borderRadius: 99, background: "#edf2e9", color: "#627a68", fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" }}>
                <Leaf size={13} /> Your reflection
              </div>
              <h1 className="rc-display" style={{ maxWidth: 620, margin: "23px 0 12px", fontSize: "clamp(38px, 5vw, 59px)", fontWeight: 500, letterSpacing: "-.055em", lineHeight: 1.02 }}>
                A next step can be <em style={{ color: "#81927f", fontWeight: 400 }}>small.</em>
              </h1>
              <p style={{ maxWidth: 555, margin: 0, color: "#6d7b70", fontSize: 14, lineHeight: 1.8 }}>
                You’ve made a little room to notice what’s going on. This summary stays here, on your screen; it hasn’t been sent or linked to a real account.
              </p>
              <div style={{ marginTop: 29, padding: "21px 22px", borderRadius: 19, border: "1px solid #dfe5db", background: "#fffdf7" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#788878", fontSize: 9, fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase" }}>
                  <span style={{ display: "inline-block", height: 6, width: 6, borderRadius: "50%", background: "#bd8268" }} /> Your notes from this visit
                </div>
                <p className="rc-display" style={{ margin: "13px 0 8px", color: "#345346", fontSize: 23, letterSpacing: "-.03em" }}>What you’re noticing</p>
                {selectedLabels.length || moment ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                    {selectedLabels.map((label) => <span key={label} style={{ padding: "7px 10px", borderRadius: 99, background: "#edf2e9", color: "#577361", fontSize: 10, fontWeight: 650 }}>{label}</span>)}
                    {moment && <span style={{ padding: "7px 10px", borderRadius: 99, background: "#f3eee4", color: "#876d51", fontSize: 10, fontWeight: 650 }}>{moment}</span>}
                  </div>
                ) : <p style={{ margin: 0, color: "#879186", fontSize: 12 }}>Nothing selected—and that’s okay. You can start with whatever comes to mind.</p>}
                <div style={{ height: 1, margin: "19px 0", background: "#e9ece5" }} />
                <div style={{ padding: "15px 0 16px", borderBottom: "1px solid #e9ece5" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#788878", fontSize: 9, fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase" }}>
                    <CircleHelp size={13} /> People to ask your clinician about
                  </div>
                  <p style={{ maxWidth: 520, margin: "8px 0 0", color: "#798479", fontSize: 10, lineHeight: 1.7 }}>
                    Start with a clinician who knows your situation. Based on the priorities you chose, these are possible conversation partners—not referrals or a recommendation.
                  </p>
                  <div className="rc-route-grid">
                    {prioritizedRoutes.length > 0 ? prioritizedRoutes.map(({ focus, people, question, icon: Icon }, index) => (
                      <div key={focus} style={{ display: "grid", gridTemplateColumns: "26px minmax(0, 1fr)", gap: 10, padding: "11px 12px", borderRadius: 12, background: index === 0 ? "#edf2e9" : "#f6f6ef" }}>
                        <span style={{ width: 25, height: 25, display: "grid", placeItems: "center", borderRadius: 8, background: "#fffdf7", color: "#718773" }}><Icon size={13} /></span>
                        <div>
                          <p style={{ margin: "0 0 3px", color: "#506758", fontSize: 10, fontWeight: 700 }}>{String(index + 1).padStart(2, "0")} · {focus}</p>
                          <p style={{ margin: 0, color: "#7a8679", fontSize: 9, lineHeight: 1.6 }}>{people}</p>
                          <p style={{ margin: "5px 0 0", color: "#7b6d5f", fontSize: 9, fontStyle: "italic", lineHeight: 1.55 }}>Ask: “{question}”</p>
                        </div>
                      </div>
                    )) : <p style={{ margin: 0, padding: "11px 12px", borderRadius: 12, background: "#f6f6ef", color: "#7a8679", fontSize: 10, lineHeight: 1.65 }}>Start with your primary clinician and describe what’s changed. You can return to choose priorities if you’d like.</p>}
                  </div>
                </div>
                <div style={{ display: "grid", gap: 16 }}>
                  {supportIdeas.map(({ title, copy, icon: Icon }) => <div key={title} style={{ display: "flex", gap: 12 }}>
                    <span style={{ width: 31, height: 31, flex: "0 0 31px", display: "grid", placeItems: "center", borderRadius: 10, background: "#eaf0e7", color: "#67816e" }}><Icon size={15} /></span>
                    <div><p style={{ margin: "1px 0 4px", color: "#425c4b", fontSize: 12, fontWeight: 700 }}>{title}</p><p style={{ maxWidth: 490, margin: 0, color: "#798479", fontSize: 11, lineHeight: 1.65 }}>{copy}</p></div>
                  </div>)}
                </div>
              </div>
              <div style={{ marginTop: 16, display: "flex", alignItems: "flex-start", gap: 10, padding: "13px 14px", borderRadius: 13, background: "#f3eee5", color: "#786d5e" }}>
                <ShieldCheck size={15} style={{ marginTop: 1, flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: 10, lineHeight: 1.7 }}>This reflection isn’t medical advice and can’t tell you what’s causing symptoms. A clinician can help make sense of your situation.</p>
              </div>
            </div>
          )}

          {hasStarted && step === 4 && (
            <div className="rc-enter">
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 11px", border: "1px solid #d7e0d4", borderRadius: 99, background: "#edf2e9", color: "#627a68", fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" }}>
                <Leaf size={13} /> A clinician-guided recovery plan
              </div>
              <h1 className="rc-display" style={{ maxWidth: 680, margin: "23px 0 12px", fontSize: "clamp(38px, 5vw, 57px)", fontWeight: 500, letterSpacing: "-.055em", lineHeight: 1.02 }}>
                Fuel, move, <em style={{ color: "#81927f", fontWeight: 400 }}>recover.</em>
              </h1>
              <p style={{ maxWidth: 590, margin: 0, color: "#6d7b70", fontSize: 13, lineHeight: 1.8 }}>
                Use these as conversation starters—not treatment instructions. A clinician can adapt food and activity to your health, medications, and symptoms.
              </p>

              <div className="rc-plan-grid" style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: 12, marginTop: 25 }}>
                <article className="rc-plan-food" style={{ gridColumn: "span 12", padding: 19, border: "1px solid #dfe5db", borderRadius: 17, background: "#fffdf7" }}>
                  <div style={{ color: "#7a8b78", fontSize: 9, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase" }}>01 · Nourishment</div>
                  <h2 className="rc-display" style={{ margin: "10px 0 7px", color: "#345346", fontSize: 23, fontWeight: 500, letterSpacing: "-.035em" }}>Steady meals, easy choices.</h2>
                  <p style={{ margin: 0, color: "#758176", fontSize: 11, lineHeight: 1.75 }}>
                    Aim for regular meals with a protein, fruit or vegetable, and a filling grain or starch when available. Keep water within reach. No special or restrictive diet is prescribed here.
                  </p>
                  <button className="rc-button" type="button" onClick={() => toggleProtocolStep("nourishment")} aria-pressed={protocolSteps.includes("nourishment")} style={{ display: "inline-flex", alignItems: "center", gap: 7, minHeight: 34, marginTop: 15, padding: "0 12px", border: "1px solid #cbd9ca", borderRadius: 99, background: protocolSteps.includes("nourishment") ? "#e6efe4" : "transparent", color: "#4d6b58", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                    {protocolSteps.includes("nourishment") && <Check size={12} />} {protocolSteps.includes("nourishment") ? "Added to this plan" : "Add nourishment reminder"}
                  </button>
                </article>

                <article className="rc-plan-movement" style={{ gridColumn: "span 12", padding: 19, border: "1px solid #eadfd4", borderRadius: 17, background: "#f7f1e9" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ color: "#96735e", fontSize: 9, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase" }}>02 · Gentle movement</div>
                      <h2 className="rc-display" style={{ margin: "10px 0 6px", color: "#59483c", fontSize: 23, fontWeight: 500, letterSpacing: "-.035em" }}>Start low. Build slowly.</h2>
                      <p style={{ maxWidth: 640, margin: 0, color: "#7b6c5f", fontSize: 11, lineHeight: 1.75 }}>
                        Only after your clinician clears you: keep activity easy and below a symptom flare. Don’t push through worsening symptoms.
                      </p>
                    </div>
                    <button className="rc-button" type="button" onClick={() => toggleProtocolStep("movement")} aria-pressed={protocolSteps.includes("movement")} style={{ display: "inline-flex", alignItems: "center", gap: 7, minHeight: 34, padding: "0 12px", border: "1px solid #dbcbbb", borderRadius: 99, background: protocolSteps.includes("movement") ? "#f1e4d8" : "transparent", color: "#795f4d", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                      {protocolSteps.includes("movement") && <Check size={12} />} {protocolSteps.includes("movement") ? "Movement idea added" : "Add movement idea"}
                    </button>
                  </div>
                  <div className="rc-movement-phases" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 9, marginTop: 17 }}>
                    {[
                      ["Begin", "Ask whether a 5–10 minute easy walk or gentle mobility is appropriate for you."],
                      ["Repeat", "Keep the same light effort for a few sessions and notice how you feel during and afterward."],
                      ["Progress", "Only if symptoms stay steady and your clinician agrees, add a few minutes at a time."],
                    ].map(([title, copy], index) => (
                      <div key={title} style={{ padding: "12px 13px", border: "1px solid rgba(196,173,153,.45)", borderRadius: 12, background: "rgba(255,253,247,.65)" }}>
                        <div style={{ marginBottom: 6, color: "#a07c65", fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" }}>0{index + 1} · {title}</div>
                        <p style={{ margin: 0, color: "#766b5f", fontSize: 10, lineHeight: 1.65 }}>{copy}</p>
                      </div>
                    ))}
                  </div>
                </article>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: 9, marginTop: 14, padding: "12px 13px", borderRadius: 12, background: "#f3eee5", color: "#786d5e" }}>
                <ShieldCheck size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ margin: 0, fontSize: 10, lineHeight: 1.7 }}>This plan is a discussion guide, not a prescription. For a new injury or severe or rapidly worsening symptoms, seek urgent medical care.</p>
              </div>
              <p style={{ margin: "10px 0 0", color: "#899186", fontSize: 9 }}>
                {protocolSteps.length ? `${protocolSteps.length} idea${protocolSteps.length === 1 ? "" : "s"} marked on this page only · nothing is saved.` : "Choose any reminders you’d like to discuss. These selections stay on this page only."}
              </p>
            </div>
          )}

          {hasStarted && <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 30, paddingTop: 19, borderTop: "1px solid #dfe4da" }}>
            {step > 0 ? (
              <button className="rc-button" type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} style={{ display: "inline-flex", alignItems: "center", gap: 7, minHeight: 43, padding: "0 8px", border: 0, background: "transparent", color: "#6e7e71", fontSize: 12, fontWeight: 650, cursor: "pointer" }}>
                <ArrowLeft size={15} /> Back
              </button>
            ) : <button className="rc-button" type="button" onClick={() => setHasStarted(false)} style={{ display: "inline-flex", alignItems: "center", gap: 7, minHeight: 43, padding: "0 8px", border: 0, background: "transparent", color: "#6e7e71", fontSize: 12, fontWeight: 650, cursor: "pointer" }}>
              <ArrowLeft size={15} /> Overview
            </button>}
            {step < 4 ? (
              <button className="rc-button" type="button" onClick={continueFlow} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 14, minHeight: 47, padding: "0 18px 0 21px", border: 0, borderRadius: 99, background: "#345849", color: "#fffdf7", fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: "0 7px 18px rgba(48,82,64,.12)" }}>
                {step === 0 ? "Prioritize my needs" : step === 1 ? "Continue to account" : step === 2 ? "Continue to my reflection" : "Build my recovery plan"} <ArrowRight size={15} />
              </button>
            ) : (
              <button className="rc-button" type="button" onClick={reset} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 43, padding: "0 16px", border: "1px solid #cfdbce", borderRadius: 99, background: "#fffdf7", color: "#4d6b58", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                <RotateCcw size={13} /> Start again
              </button>
            )}
          </div>}
          {hasStarted && (step === 3 || step === 4) && <button className="rc-button" type="button" onClick={() => setShowSafety((current) => !current)} style={{ display: "flex", alignItems: "center", gap: 6, margin: "18px auto 0", border: 0, background: "transparent", color: "#778478", cursor: "pointer", fontSize: 10 }}>
            <MoveUpRight size={12} /> Learn when to seek urgent care
          </button>}
          {hasStarted && (step === 3 || step === 4) && showSafety && <div className="rc-enter" style={{ marginTop: 12, borderRadius: 14, padding: 15, background: "#f5e9e1", color: "#795746", fontSize: 11, lineHeight: 1.7 }}>
            This experience is for adults already assessed by a clinician and recovering at home. For a new head injury, severe or rapidly worsening symptoms, seek urgent medical care or contact your local emergency number.
          </div>}
          <p style={{ margin: "26px 0 0", color: "#a0a397", textAlign: "center", fontSize: 9, letterSpacing: ".04em" }}>
            CONCEPT PREVIEW · NOT A LIVE CLINICAL SERVICE
          </p>
        </section>
      </div>
    </main>
  );
}

export default RecoveryCompass;
