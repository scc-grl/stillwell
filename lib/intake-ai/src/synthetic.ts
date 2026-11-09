/** Only these fabricated stories may leave a signed-in account until a BAA is in place. */
export const SYNTHETIC_INTAKE_SAMPLES = [
  { id: "maya", label: "Maya · day 3 after a match", story: "I took a head-to-head hit in a soccer match on Saturday. The team doctor checked me on the sideline and told me to rest. Since then I've had headaches most of the day, I'm wiped out by the afternoon, and screens really bother me. I'm not sleeping well, and I feel foggy in class. Walking to class is okay, but I haven't tried anything harder." },
  { id: "bike", label: "Two weeks after a bike fall", story: "I fell from my bike two weeks ago and bumped my head. I have a mild headache at the end of the day, but walking around feels okay." },
  { id: "worsening", label: "Symptoms getting worse", story: "I hit my head about ten days ago. My headaches and tiredness have been getting worse over the last few days. I have not seen a doctor yet." },
  { id: "work", label: "Back at work, mostly better", story: "I bumped my head three weeks ago and saw a doctor the next day. I am mostly back at work. I feel a little tired after a full day, and a short walk feels okay." },
  { id: "emergency", label: "A story with a danger sign", story: "I hit my head at practice yesterday and have thrown up three times since. I feel very drowsy and my headache is getting worse." },
  { id: "crisis", label: "A story needing crisis support", story: "I bumped my head two weeks ago. I feel hopeless and I am thinking about killing myself." },
] as const;
export const INTAKE_CONSENT_VERSION = "intake-consent-2026-11-09.1";
