import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Headphones,
  Heart,
  Leaf,
  LockKeyhole,
  Moon,
  Phone,
  ShieldCheck,
  Sparkles,
  Sun,
  Wind,
} from "lucide-react";

const mobileConcerns = [
  { id: "headaches", label: "Headaches", icon: Sun },
  { id: "focus", label: "Focus & memory", icon: Sparkles },
  { id: "balance", label: "Dizziness", icon: Wind },
  { id: "sleep", label: "Sleep & energy", icon: Moon },
  { id: "light", label: "Light & sound", icon: Headphones },
  { id: "mood", label: "Mood & stress", icon: Heart },
];

const mobileMoments = [
  "My usual routine",
  "People or noise",
  "Keeping my energy steady",
  "Finding time to rest",
];

export function RecoveryCompassMobile() {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [moment, setMoment] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [showSafety, setShowSafety] = useState(false);
  const [planChoices, setPlanChoices] = useState<string[]>([]);

  const toggleConcern = (id: string) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length < 3
          ? [...current, id]
          : current,
    );
  };

  const continueFlow = () => {
    if (step !== 2) {
      setStep((current) => Math.min(4, current + 1));
      return;
    }
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) {
      setPhoneError("Add a phone number with 7–15 digits.");
      return;
    }
    if (!acknowledged) {
      setPhoneError("Confirm the prototype privacy note to continue.");
      return;
    }
    setPhoneError("");
    setStep(3);
  };

  const togglePlanChoice = (id: string) => {
    setPlanChoices((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const reset = () => {
    setStep(0);
    setSelected([]);
    setMoment(null);
    setPhone("");
    setAcknowledged(false);
    setPhoneError("");
    setShowSafety(false);
    setPlanChoices([]);
  };

  const selectedLabels = mobileConcerns
    .filter((item) => selected.includes(item.id))
    .map((item) => item.label);

  const stepLabels = ["Your experience", "Daily context", "Account", "Reflection", "Recovery plan"];

  return (
    <div
      className="rcm-root"
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        color: "#29453a",
        background: "radial-gradient(ellipse at 6% 0%, rgba(222,231,215,.66), transparent 30rem), #f5f4ed",
        fontFamily: '"DM Sans", "Avenir Next", sans-serif',
      }}
    >
      <style>{`
        .rcm-root, .rcm-root * { box-sizing: border-box; }
        .rcm-display { font-family: "Fraunces", Georgia, serif; }
        .rcm-control { -webkit-tap-highlight-color: transparent; }
        .rcm-control:focus-visible, .rcm-input:focus-visible {
          outline: 3px solid #91aa96;
          outline-offset: 3px;
        }
        .rcm-control { transition: transform .18s ease, background-color .18s ease, border-color .18s ease; }
        .rcm-control:active { transform: scale(.985); }
        .rcm-step-enter { animation: rcm-enter .28s ease-out both; }
        @keyframes rcm-enter {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .rcm-root *, .rcm-root *::before, .rcm-root *::after {
            animation-duration: .01ms !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>

      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          padding: "12px 18px 13px",
          borderBottom: "1px solid #dfe4da",
          background: "rgba(249,248,242,.94)",
          backdropFilter: "blur(14px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            className="rcm-control"
            type="button"
            onClick={reset}
            aria-label="Restart reflection"
            style={{ display: "inline-flex", alignItems: "center", gap: 9, border: 0, padding: 0, background: "transparent", color: "#29453a", cursor: "pointer" }}
          >
            <span style={{ position: "relative", display: "grid", width: 32, height: 32, placeItems: "center", border: "1px solid #b7c9bd", borderRadius: "50%", background: "#e6eee7" }}>
              <span style={{ width: 15, height: 15, border: "1px solid #537566", borderRadius: "50%" }} />
              <span style={{ position: "absolute", top: 5, right: 5, width: 5, height: 5, borderRadius: "50%", background: "#bd705c" }} />
            </span>
            <span className="rcm-display" style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-.045em" }}>stillwell</span>
          </button>
          <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#788579", fontSize: 9, fontWeight: 600 }}>
            <LockKeyhole size={12} color="#718a77" /> Private preview
          </span>
        </div>
      </header>

      <main style={{ width: "100%", maxWidth: 520, flex: 1, margin: "0 auto", padding: "23px 18px 30px" }}>
        <div style={{ marginBottom: 25 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <span style={{ color: "#607766", fontSize: 10, fontWeight: 700, letterSpacing: ".13em", textTransform: "uppercase" }}>
              {stepLabels[step]}
            </span>
            <span style={{ color: "#879186", fontSize: 10, fontWeight: 650 }}>0{step + 1} / 05</span>
          </div>
          <div aria-label={`Step ${step + 1} of 5`} role="progressbar" aria-valuemin={1} aria-valuemax={5} aria-valuenow={step + 1} style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 5, marginTop: 10 }}>
            {[0, 1, 2, 3, 4].map((index) => (
              <span key={index} style={{ height: 3, borderRadius: 9, background: index <= step ? "#577865" : "#dce3d8" }} />
            ))}
          </div>
        </div>

        {step === 0 && (
          <section className="rcm-step-enter">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 9px", border: "1px solid #d7e0d4", borderRadius: 99, background: "#edf2e9", color: "#627a68", fontSize: 9, fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase" }}>
              <Leaf size={12} /> A gentle check-in
            </span>
            <h1 className="rcm-display" style={{ margin: "16px 0 8px", fontSize: 36, lineHeight: 1.02, fontWeight: 500, letterSpacing: "-.05em" }}>
              What feels different <em style={{ color: "#81927f", fontWeight: 400 }}>lately?</em>
            </h1>
            <p style={{ margin: 0, color: "#6d7b70", fontSize: 12, lineHeight: 1.75 }}>
              Choose up to three things you’ve noticed. This is a place to gather your thoughts before talking with a clinician.
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "22px 0 10px" }}>
              <span style={{ color: "#52695a", fontSize: 10, fontWeight: 700 }}>I’ve noticed…</span>
              <span style={{ color: "#879186", fontSize: 9 }}>{selected.length} of 3 selected</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
              {mobileConcerns.map(({ id, label, icon: Icon }) => {
                const active = selected.includes(id);
                const capped = selected.length === 3 && !active;
                return (
                  <button
                    key={id}
                    className="rcm-control"
                    type="button"
                    onClick={() => toggleConcern(id)}
                    aria-pressed={active}
                    style={{ display: "flex", minHeight: 69, alignItems: "center", gap: 8, padding: "10px 9px", border: `1px solid ${active ? "#78927e" : "#e0e5dc"}`, borderRadius: 13, background: active ? "#edf3e9" : "#fffdf7", color: "#405b4c", textAlign: "left", cursor: capped ? "not-allowed" : "pointer", opacity: capped ? .57 : 1 }}
                  >
                    <span style={{ display: "grid", width: 29, height: 29, flex: "0 0 29px", placeItems: "center", borderRadius: 10, background: active ? "#dce8d9" : "#f1f2eb", color: active ? "#587664" : "#849383" }}><Icon size={14} strokeWidth={1.7} /></span>
                    <span style={{ minWidth: 0, flex: 1, fontSize: 10, fontWeight: 650, lineHeight: 1.3 }}>{label}</span>
                    <span style={{ display: "grid", width: 15, height: 15, flex: "0 0 15px", placeItems: "center", border: `1px solid ${active ? "#62816d" : "#cad5c9"}`, borderRadius: 4, background: active ? "#557664" : "transparent", color: "white" }}>{active && <Check size={10} />}</span>
                  </button>
                );
              })}
            </div>
            <p style={{ display: "flex", alignItems: "center", gap: 6, margin: "13px 0 0", color: "#899186", fontSize: 9 }}>
              <LockKeyhole size={11} /> Your choices aren’t sent anywhere.
            </p>
          </section>
        )}

        {step === 1 && (
          <section className="rcm-step-enter">
            <span style={{ color: "#7a8b78", fontSize: 9, fontWeight: 700, letterSpacing: ".13em", textTransform: "uppercase" }}>A little context</span>
            <h1 className="rcm-display" style={{ margin: "12px 0 8px", fontSize: 34, lineHeight: 1.04, fontWeight: 500, letterSpacing: "-.05em" }}>
              What’s taking the most <em style={{ color: "#81927f", fontWeight: 400 }}>effort?</em>
            </h1>
            <p style={{ margin: 0, color: "#6d7b70", fontSize: 12, lineHeight: 1.75 }}>
              Pick the everyday moment you’d most like help thinking through, or continue without choosing.
            </p>
            <div style={{ display: "grid", gap: 9, marginTop: 23 }}>
              {mobileMoments.map((item, index) => {
                const active = moment === item;
                return (
                  <button
                    key={item}
                    className="rcm-control"
                    type="button"
                    onClick={() => setMoment(active ? null : item)}
                    aria-pressed={active}
                    style={{ display: "flex", width: "100%", minHeight: 61, alignItems: "center", gap: 12, padding: "12px 13px", border: `1px solid ${active ? "#78927e" : "#e0e5dc"}`, borderRadius: 13, background: active ? "#edf3e9" : "#fffdf7", textAlign: "left", color: "#435c4d", cursor: "pointer" }}
                  >
                    <span className="rcm-display" style={{ width: 20, color: "#a5b3a2", fontSize: 15, fontStyle: "italic" }}>0{index + 1}</span>
                    <span style={{ flex: 1, fontSize: 11, fontWeight: 650 }}>{item}</span>
                    <span style={{ display: "grid", width: 18, height: 18, placeItems: "center", border: `1px solid ${active ? "#5f806a" : "#cad5c9"}`, borderRadius: "50%", background: active ? "#557664" : "transparent", color: "white" }}>{active && <Check size={11} />}</span>
                  </button>
                );
              })}
            </div>
            {selectedLabels.length > 0 && (
              <div style={{ marginTop: 15, padding: "12px 13px", borderLeft: "2px solid #bd8268", color: "#758074", fontSize: 10, lineHeight: 1.7 }}>
                You mentioned <strong style={{ color: "#4e6857" }}>{selectedLabels.join(", ")}</strong>. There’s no right way to describe it.
              </div>
            )}
          </section>
        )}

        {step === 2 && (
          <section className="rcm-step-enter">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 9px", border: "1px solid #d7e0d4", borderRadius: 99, background: "#edf2e9", color: "#627a68", fontSize: 9, fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase" }}>
              <Phone size={12} /> Account step
            </span>
            <h1 className="rcm-display" style={{ margin: "16px 0 8px", fontSize: 35, lineHeight: 1.03, fontWeight: 500, letterSpacing: "-.05em" }}>
              Your number, before your <em style={{ color: "#81927f", fontWeight: 400 }}>reflection.</em>
            </h1>
            <p style={{ margin: 0, color: "#6d7b70", fontSize: 12, lineHeight: 1.75 }}>
              A real Stillwell service could use a verified mobile number to create an account before showing your notes.
            </p>
            <form noValidate onSubmit={(event) => { event.preventDefault(); continueFlow(); }} style={{ marginTop: 22 }}>
              <label htmlFor="rcm-phone" style={{ display: "block", marginBottom: 7, color: "#506758", fontSize: 10, fontWeight: 700 }}>Mobile phone number</label>
              <input
                id="rcm-phone"
                className="rcm-input"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+1 555 010 2040"
                value={phone}
                onChange={(event) => { setPhone(event.target.value); setPhoneError(""); }}
                aria-invalid={Boolean(phoneError && phone.replace(/\D/g, "").length < 7)}
                aria-describedby="rcm-phone-note rcm-phone-error"
                style={{ width: "100%", minHeight: 50, border: "1px solid #cbd8cb", borderRadius: 12, background: "#fffdf7", padding: "0 13px", color: "#365346", fontFamily: "inherit", fontSize: 14 }}
              />
              <p id="rcm-phone-note" style={{ margin: "7px 0 0", color: "#879186", fontSize: 9, lineHeight: 1.65 }}>
                Include your country code. No verification code is sent in this prototype.
              </p>
              <label htmlFor="rcm-acknowledge" style={{ display: "flex", alignItems: "flex-start", gap: 9, marginTop: 16, padding: 12, border: "1px solid #dfe5db", borderRadius: 12, background: "#f4f5ef", color: "#637267", cursor: "pointer", fontSize: 10, lineHeight: 1.65 }}>
                <input id="rcm-acknowledge" type="checkbox" checked={acknowledged} onChange={(event) => { setAcknowledged(event.target.checked); setPhoneError(""); }} style={{ width: 16, height: 16, margin: "1px 0 0", accentColor: "#54745e", flexShrink: 0 }} />
                <span>I understand this preview does not send a text, create an account, or save my number.</span>
              </label>
              {phoneError && <p id="rcm-phone-error" role="alert" style={{ margin: "9px 0 0", color: "#a04f42", fontSize: 10, fontWeight: 650 }}>{phoneError}</p>}
            </form>
            <div style={{ display: "flex", gap: 8, marginTop: 14, color: "#7b8175", fontSize: 9, lineHeight: 1.65 }}>
              <LockKeyhole size={12} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>This demo keeps details in temporary page state only. A live service would explain data use and verify the number first.</span>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="rcm-step-enter">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 9px", border: "1px solid #d7e0d4", borderRadius: 99, background: "#edf2e9", color: "#627a68", fontSize: 9, fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase" }}>
              <Leaf size={12} /> Your reflection
            </span>
            <h1 className="rcm-display" style={{ margin: "16px 0 8px", fontSize: 35, lineHeight: 1.04, fontWeight: 500, letterSpacing: "-.05em" }}>
              A next step can be <em style={{ color: "#81927f", fontWeight: 400 }}>small.</em>
            </h1>
            <p style={{ margin: 0, color: "#6d7b70", fontSize: 12, lineHeight: 1.75 }}>
              This stays on your screen. It hasn’t been saved, sent, or linked to a real account.
            </p>
            <div style={{ marginTop: 18, padding: "17px 16px", border: "1px solid #dfe5db", borderRadius: 17, background: "#fffdf7" }}>
              <span style={{ color: "#788878", fontSize: 8, fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase" }}>Your notes from this visit</span>
              <h2 className="rcm-display" style={{ margin: "8px 0 10px", color: "#345346", fontSize: 22, letterSpacing: "-.03em" }}>What you’re noticing</h2>
              {selectedLabels.length || moment ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {selectedLabels.map((label) => <span key={label} style={{ padding: "6px 8px", borderRadius: 99, background: "#edf2e9", color: "#577361", fontSize: 9, fontWeight: 650 }}>{label}</span>)}
                  {moment && <span style={{ padding: "6px 8px", borderRadius: 99, background: "#f3eee4", color: "#876d51", fontSize: 9, fontWeight: 650 }}>{moment}</span>}
                </div>
              ) : <p style={{ margin: 0, color: "#879186", fontSize: 10 }}>Nothing selected, and that’s okay. Start with whatever comes to mind.</p>}
              <div style={{ height: 1, margin: "15px 0", background: "#e9ece5" }} />
              <div style={{ display: "flex", gap: 10 }}>
                <span style={{ display: "grid", width: 29, height: 29, flex: "0 0 29px", placeItems: "center", borderRadius: 9, background: "#eaf0e7", color: "#67816e" }}><ShieldCheck size={14} /></span>
                <p style={{ margin: 0, color: "#798479", fontSize: 10, lineHeight: 1.7 }}>A clinician can help connect what you’re noticing with the moments that feel hard and choose one manageable next step with you.</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 9, marginTop: 13, padding: 12, borderRadius: 12, background: "#f3eee5", color: "#786d5e" }}>
              <ShieldCheck size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0, fontSize: 9, lineHeight: 1.65 }}>This is not medical advice, a symptom checker, or a diagnosis.</p>
            </div>
            <button className="rcm-control" type="button" onClick={() => setShowSafety((current) => !current)} aria-expanded={showSafety} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 13, border: 0, padding: 0, background: "transparent", color: "#67796d", fontSize: 10, fontWeight: 650, cursor: "pointer" }}>
              Safety information
            </button>
            {showSafety && <p role="note" style={{ margin: "8px 0 0", padding: 12, borderRadius: 12, background: "#f4eae2", color: "#785b4d", fontSize: 9, lineHeight: 1.7 }}>For a new injury, severe or rapidly worsening symptoms, seek urgent medical care or contact your local emergency number.</p>}
          </section>
        )}

        {step === 4 && (
          <section className="rcm-step-enter">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 9px", border: "1px solid #d7e0d4", borderRadius: 99, background: "#edf2e9", color: "#627a68", fontSize: 9, fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase" }}>
              <Leaf size={12} /> A clinician-guided plan
            </span>
            <h1 className="rcm-display" style={{ margin: "16px 0 8px", fontSize: 35, lineHeight: 1.03, fontWeight: 500, letterSpacing: "-.05em" }}>
              Fuel, move, <em style={{ color: "#81927f", fontWeight: 400 }}>recover.</em>
            </h1>
            <p style={{ margin: 0, color: "#6d7b70", fontSize: 11, lineHeight: 1.75 }}>
              Conversation starters, not treatment instructions. Your clinician can adapt this to your health and symptoms.
            </p>

            <article style={{ marginTop: 17, padding: "15px 14px", border: "1px solid #dfe5db", borderRadius: 15, background: "#fffdf7" }}>
              <span style={{ color: "#7a8b78", fontSize: 8, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase" }}>01 · Nourishment</span>
              <h2 className="rcm-display" style={{ margin: "7px 0 6px", color: "#345346", fontSize: 21, fontWeight: 500, letterSpacing: "-.035em" }}>Steady meals, easy choices.</h2>
              <p style={{ margin: 0, color: "#758176", fontSize: 10, lineHeight: 1.7 }}>
                Aim for regular meals with protein, fruit or vegetables, and a filling grain or starch when available. Keep water nearby. No special or restrictive diet is prescribed here.
              </p>
              <button className="rcm-control" type="button" onClick={() => togglePlanChoice("nourishment")} aria-pressed={planChoices.includes("nourishment")} style={{ display: "inline-flex", minHeight: 34, alignItems: "center", gap: 6, marginTop: 12, padding: "0 10px", border: "1px solid #cbd9ca", borderRadius: 99, background: planChoices.includes("nourishment") ? "#e6efe4" : "transparent", color: "#4d6b58", fontSize: 9, fontWeight: 700, cursor: "pointer" }}>
                {planChoices.includes("nourishment") && <Check size={11} />} {planChoices.includes("nourishment") ? "Added for this visit" : "Add nourishment reminder"}
              </button>
            </article>

            <article style={{ marginTop: 9, padding: "15px 14px", border: "1px solid #d7e0d4", borderRadius: 15, background: "#edf2e9" }}>
              <span style={{ color: "#728574", fontSize: 8, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase" }}>02 · Supplements</span>
              <h2 className="rcm-display" style={{ margin: "7px 0 6px", color: "#345346", fontSize: 21, fontWeight: 500, letterSpacing: "-.035em" }}>Review before adding.</h2>
              <p style={{ margin: 0, color: "#718073", fontSize: 10, lineHeight: 1.7 }}>
                No supplement is recommended here. Bring current products and doses to a clinician or pharmacist; check evidence and interactions before starting, stopping, or changing anything.
              </p>
              <button className="rcm-control" type="button" onClick={() => togglePlanChoice("supplements")} aria-pressed={planChoices.includes("supplements")} style={{ display: "inline-flex", minHeight: 34, alignItems: "center", gap: 6, marginTop: 12, padding: "0 10px", border: "1px solid #bdd0bf", borderRadius: 99, background: planChoices.includes("supplements") ? "#dce8d9" : "transparent", color: "#4d6b58", fontSize: 9, fontWeight: 700, cursor: "pointer" }}>
                {planChoices.includes("supplements") && <Check size={11} />} {planChoices.includes("supplements") ? "Question added" : "Ask about supplements"}
              </button>
            </article>

            <article style={{ marginTop: 9, padding: "15px 14px", border: "1px solid #eadfd4", borderRadius: 15, background: "#f7f1e9" }}>
              <span style={{ color: "#96735e", fontSize: 8, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase" }}>03 · Gentle movement</span>
              <h2 className="rcm-display" style={{ margin: "7px 0 6px", color: "#59483c", fontSize: 21, fontWeight: 500, letterSpacing: "-.035em" }}>Start low. Build slowly.</h2>
              <p style={{ margin: 0, color: "#7b6c5f", fontSize: 10, lineHeight: 1.7 }}>
                Only after your clinician clears you. Keep activity easy and below a symptom flare—don’t push through worsening symptoms.
              </p>
              <ol style={{ display: "grid", gap: 8, margin: "13px 0 0", padding: 0, listStyle: "none" }}>
                {[
                  ["Begin", "Ask whether a 5–10 minute easy walk or gentle mobility is right for you."],
                  ["Repeat", "Keep the effort light for a few sessions; notice how you feel during and afterward."],
                  ["Progress", "If symptoms stay steady and your clinician agrees, add a few minutes at a time."],
                ].map(([title, copy], index) => (
                  <li key={title} style={{ display: "flex", gap: 9, padding: "9px 10px", border: "1px solid rgba(196,173,153,.45)", borderRadius: 11, background: "rgba(255,253,247,.62)" }}>
                    <span style={{ color: "#a07c65", fontSize: 8, fontWeight: 700, letterSpacing: ".08em" }}>0{index + 1}</span>
                    <span style={{ color: "#766b5f", fontSize: 9, lineHeight: 1.6 }}><strong style={{ color: "#675649" }}>{title}.</strong> {copy}</span>
                  </li>
                ))}
              </ol>
              <button className="rcm-control" type="button" onClick={() => togglePlanChoice("movement")} aria-pressed={planChoices.includes("movement")} style={{ display: "inline-flex", minHeight: 34, alignItems: "center", gap: 6, marginTop: 12, padding: "0 10px", border: "1px solid #dbcbbb", borderRadius: 99, background: planChoices.includes("movement") ? "#f1e4d8" : "transparent", color: "#795f4d", fontSize: 9, fontWeight: 700, cursor: "pointer" }}>
                {planChoices.includes("movement") && <Check size={11} />} {planChoices.includes("movement") ? "Movement idea added" : "Add movement idea"}
              </button>
            </article>

            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 11, padding: 11, borderRadius: 12, background: "#f3eee5", color: "#786d5e" }}>
              <ShieldCheck size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0, fontSize: 9, lineHeight: 1.65 }}>This is not a prescription. For a new injury or severe or rapidly worsening symptoms, seek urgent medical care.</p>
            </div>
            <p style={{ margin: "9px 0 0", color: "#899186", fontSize: 8, lineHeight: 1.6 }}>
              {planChoices.length ? `${planChoices.length} idea${planChoices.length === 1 ? "" : "s"} marked here only. Nothing is saved.` : "Your marked ideas stay in temporary page state only."}
            </p>
          </section>
        )}
      </main>

      <footer style={{ position: "sticky", bottom: 0, zIndex: 4, borderTop: "1px solid #e0e5dc", background: "rgba(249,248,242,.95)", backdropFilter: "blur(14px)", padding: "11px 18px calc(13px + env(safe-area-inset-bottom))" }}>
        <div style={{ display: "flex", maxWidth: 520, alignItems: "center", justifyContent: "space-between", gap: 12, margin: "0 auto" }}>
          {step > 0 ? (
            <button className="rcm-control" type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} style={{ display: "inline-flex", minHeight: 46, alignItems: "center", gap: 5, border: 0, padding: "0 4px", background: "transparent", color: "#6e7e71", fontSize: 11, fontWeight: 650, cursor: "pointer" }}>
              <ArrowLeft size={14} /> Back
            </button>
          ) : <span style={{ color: "#899286", fontSize: 9 }}>Nothing is saved here.</span>}
          {step < 4 ? (
            <button className="rcm-control" type="button" onClick={continueFlow} style={{ display: "inline-flex", minHeight: 46, alignItems: "center", justifyContent: "center", gap: 12, border: 0, borderRadius: 99, padding: "0 17px", background: "#345849", color: "#fffdf7", fontSize: 11, fontWeight: 700, cursor: "pointer", boxShadow: "0 6px 16px rgba(48,82,64,.12)" }}>
              {step === 0 ? "Continue" : step === 1 ? "Account details" : step === 2 ? "See my reflection" : "Recovery plan"} <ArrowRight size={14} />
            </button>
          ) : (
            <button className="rcm-control" type="button" onClick={reset} style={{ display: "inline-flex", minHeight: 44, alignItems: "center", gap: 7, border: "1px solid #cfdbce", borderRadius: 99, padding: "0 14px", background: "#fffdf7", color: "#4d6b58", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
              <Check size={13} /> Start again
            </button>
          )}
        </div>
        <p style={{ maxWidth: 520, margin: "7px auto 0", color: "#9a9e92", textAlign: "center", fontSize: 8, letterSpacing: ".06em" }}>CONCEPT PREVIEW · NOT A LIVE CLINICAL SERVICE</p>
      </footer>
    </div>
  );
}

export default RecoveryCompassMobile;
