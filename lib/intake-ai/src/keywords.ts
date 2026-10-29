// Plain keyword scan that runs beside TypeSafe for danger and self-harm words.
// Either one firing is enough. A false alarm beats a miss, so negations
// ("I didn't pass out") still fire. Starter list: a clinician reviews it.

const DANGER_PATTERNS: [string, RegExp][] = [
  ["seizure", /\b(seizures?|convuls\w*|fits?)\b/i],
  ["vomiting", /\b(vomit\w*|throw(n|ing)? up|threw up|puk\w*)\b/i],
  ["loss of consciousness", /\b(passed out|blacked out|knocked out|lost consciousness|unconscious|fainted)\b/i],
  ["double vision", /\bdouble vision|seeing double\b/i],
  ["weakness or tingling", /\b(numb\w*|tingl\w*|can'?t move my (arm|leg|hand|foot))\b/i],
  ["getting drowsier", /\b(can'?t stay awake|hard to wake|keep falling asleep|nodding off)\b/i],
  ["skull deformity", /\b(dent in my (head|skull)|skull (is )?(dented|cracked|broken)|open wound on my head)\b/i],
];

const SELF_HARM_PATTERNS: [string, RegExp][] = [
  ["self-harm", /\b(kill(ing)? myself|end(ing)? my life|suicid\w*|want(ed)? to die|better off dead|hurt(ing)? myself|self[- ]harm\w*|no reason to live|hopeless)\b/i],
];

export type KeywordHits = { danger: string[]; selfHarm: string[] };

export function scanKeywords(text: string): KeywordHits {
  const hits = (patterns: [string, RegExp][]) => patterns.filter(([, re]) => re.test(text)).map(([name]) => name);
  return { danger: hits(DANGER_PATTERNS), selfHarm: hits(SELF_HARM_PATTERNS) };
}
