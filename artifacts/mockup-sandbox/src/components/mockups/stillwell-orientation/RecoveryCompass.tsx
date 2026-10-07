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

export function RecoveryCompass() {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [moment, setMoment] = useState<string | null>(null);
  const [showSafety, setShowSafety] = useState(false);

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
    setSelected([]);
    setMoment(null);
    setShowSafety(false);
  };

  const selectedLabels = concerns
    .filter((item) => selected.includes(item.id))
    .map((item) => item.label.toLowerCase());

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
        @media (max-width: 760px) {
          .rc-layout { grid-template-columns: 1fr !important; }
          .rc-side { display: none !important; }
          .rc-mobile-steps { display: flex !important; }
        }
        @media (prefers-reduced-motion: reduce) { .rc-root *, .rc-root *::before, .rc-root *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; } }
      `}</style>

      <header style={{ height: 74, borderBottom: "1px solid #e0e5dc", background: "rgba(250,249,243,.78)" }}>
        <div style={{ maxWidth: 1180, height: "100%", margin: "0 auto", padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="#start" aria-label="Stillwell, start over" onClick={(event) => { event.preventDefault(); reset(); }} style={{ display: "flex", alignItems: "center", gap: 11, color: "inherit", textDecoration: "none" }}>
            <span style={{ width: 34, height: 34, borderRadius: "50%", border: "1px solid #b7c9bd", background: "#e6eee7", display: "grid", placeItems: "center", position: "relative" }}>
              <span style={{ width: 17, height: 17, border: "1px solid #537566", borderRadius: "50%" }} />
              <span style={{ position: "absolute", width: 6, height: 6, right: 6, top: 6, background: "#bd705c", borderRadius: "50%" }} />
            </span>
            <span className="rc-display" style={{ fontSize: 21, fontWeight: 600, letterSpacing: "-.05em" }}>stillwell</span>
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#768477", fontSize: 11, letterSpacing: ".02em" }}>
            <LockKeyhole size={13} color="#718a77" />
            <span>Private reflection · nothing is saved</span>
          </div>
        </div>
      </header>

      <div className="rc-layout" style={{ maxWidth: 1180, minHeight: "calc(100dvh - 74px)", margin: "0 auto", padding: "38px 28px 52px", display: "grid", gridTemplateColumns: "230px minmax(0, 1fr)", gap: 58 }}>
        <aside className="rc-side" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "16px 0 3px" }}>
          <div>
            <p style={{ margin: "0 0 23px", color: "#839083", fontSize: 10, fontWeight: 700, letterSpacing: ".17em", textTransform: "uppercase" }}>A gentle check-in</p>
            <div style={{ display: "grid", gap: 0 }}>
              {[
                ["01", "What feels different?"],
                ["02", "How is today going?"],
                ["03", "A next step"],
              ].map(([number, title], index) => {
                const active = step === index;
                const complete = step > index;
                return (
                  <div key={number} style={{ position: "relative", display: "flex", gap: 13, minHeight: 72 }}>
                    {index < 2 && <span style={{ position: "absolute", left: 14, top: 31, bottom: 0, width: 1, background: complete ? "#89a28f" : "#d9e1d7" }} />}
                    <span style={{ zIndex: 1, width: 29, height: 29, flex: "0 0 29px", borderRadius: "50%", display: "grid", placeItems: "center", background: active || complete ? "#345849" : "#eeefe8", color: active || complete ? "#fffdf7" : "#8a9689", fontSize: 10, fontWeight: 700 }}>
                      {complete ? <Check size={13} /> : number}
                    </span>
                    <span style={{ paddingTop: 5, color: active ? "#345849" : "#849084", fontSize: 12, fontWeight: active ? 650 : 500 }}>{title}</span>
                  </div>
                );
              })}
            </div>
          </div>
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
          <div className="rc-mobile-steps" style={{ display: "none", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
            <div style={{ display: "flex", gap: 6 }}>
              {[0, 1, 2].map((index) => <span key={index} style={{ height: 3, width: index === step ? 34 : 20, borderRadius: 9, background: index <= step ? "#557866" : "#dce3d8", transition: "width .2s" }} />)}
            </div>
            <span style={{ color: "#7d897d", fontSize: 10, fontWeight: 650 }}>STEP {String(step + 1).padStart(2, "0")} / 03</span>
          </div>

          {step === 0 && (
            <div className="rc-enter">
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 11px", border: "1px solid #d7e0d4", borderRadius: 99, background: "#edf2e9", color: "#627a68", fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" }}>
                <Sparkles size={13} /> Your experience, in your words
              </div>
              <h1 className="rc-display" style={{ maxWidth: 620, margin: "23px 0 12px", fontSize: "clamp(38px, 5vw, 59px)", fontWeight: 500, letterSpacing: "-.055em", lineHeight: 1.02 }}>
                What feels different <em style={{ color: "#81927f", fontWeight: 400 }}>lately?</em>
              </h1>
              <p style={{ maxWidth: 555, margin: 0, color: "#6d7b70", fontSize: 14, lineHeight: 1.8 }}>
                Choose up to three things you’ve noticed. This is just a place to gather your thoughts before talking with a clinician.
              </p>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "29px 0 12px" }}>
                <span style={{ color: "#566b5c", fontSize: 11, fontWeight: 700 }}>I’ve noticed…</span>
                <span style={{ color: "#839083", fontSize: 10 }}>{selected.length} of 3 selected</span>
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

          {step === 1 && (
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

          {step === 2 && (
            <div className="rc-enter">
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 11px", border: "1px solid #d7e0d4", borderRadius: 99, background: "#edf2e9", color: "#627a68", fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" }}>
                <Leaf size={13} /> Your reflection
              </div>
              <h1 className="rc-display" style={{ maxWidth: 620, margin: "23px 0 12px", fontSize: "clamp(38px, 5vw, 59px)", fontWeight: 500, letterSpacing: "-.055em", lineHeight: 1.02 }}>
                A next step can be <em style={{ color: "#81927f", fontWeight: 400 }}>small.</em>
              </h1>
              <p style={{ maxWidth: 555, margin: 0, color: "#6d7b70", fontSize: 14, lineHeight: 1.8 }}>
                You’ve made a little room to notice what’s going on. This summary stays here, on your screen, and can help you decide what to bring into a clinician conversation.
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

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 30, paddingTop: 19, borderTop: "1px solid #dfe4da" }}>
            {step > 0 ? (
              <button className="rc-button" type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} style={{ display: "inline-flex", alignItems: "center", gap: 7, minHeight: 43, padding: "0 8px", border: 0, background: "transparent", color: "#6e7e71", fontSize: 12, fontWeight: 650, cursor: "pointer" }}>
                <ArrowLeft size={15} /> Back
              </button>
            ) : <span style={{ color: "#899286", fontSize: 10 }}>You can skip any question.</span>}
            {step < 2 ? (
              <button className="rc-button" type="button" onClick={() => setStep((current) => current + 1)} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 14, minHeight: 47, padding: "0 18px 0 21px", border: 0, borderRadius: 99, background: "#345849", color: "#fffdf7", fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: "0 7px 18px rgba(48,82,64,.12)" }}>
                {step === 0 ? "Continue" : "See my reflection"} <ArrowRight size={15} />
              </button>
            ) : (
              <button className="rc-button" type="button" onClick={reset} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 43, padding: "0 16px", border: "1px solid #cfdbce", borderRadius: 99, background: "#fffdf7", color: "#4d6b58", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                <RotateCcw size={13} /> Start again
              </button>
            )}
          </div>
          {step === 2 && <button className="rc-button" type="button" onClick={() => setShowSafety((current) => !current)} style={{ display: "flex", alignItems: "center", gap: 6, margin: "18px auto 0", border: 0, background: "transparent", color: "#778478", cursor: "pointer", fontSize: 10 }}>
            <MoveUpRight size={12} /> Learn when to seek urgent care
          </button>}
          {step === 2 && showSafety && <div className="rc-enter" style={{ marginTop: 12, borderRadius: 14, padding: 15, background: "#f5e9e1", color: "#795746", fontSize: 11, lineHeight: 1.7 }}>
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
