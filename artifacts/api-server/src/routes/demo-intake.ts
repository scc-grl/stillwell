import { Router, type IRouter, type Request } from "express";
import { MAX_NOTE_CHARS } from "@workspace/intake-ai";
import { demoIntakeStatus, runDemoIntake } from "../lib/demo-intake";

const router: IRouter = Router();

// Public, no-login demo that calls paid APIs: keep a simple per-visitor limit.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 30;
const hits = new Map<string, number[]>();

function visitorKey(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim();
  return first || req.ip || "unknown";
}

function overLimit(key: string, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

router.get("/demo/intake/status", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(demoIntakeStatus());
});

router.post("/demo/intake", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  const body = req.body as { note?: unknown; inputMode?: unknown } | undefined;
  const note = typeof body?.note === "string" ? body.note.trim() : "";
  if (!note) {
    res.status(400).json({ error: "Tell Stillwell what happened first." });
    return;
  }
  if (note.length > MAX_NOTE_CHARS) {
    res.status(400).json({ error: `Keep it under ${MAX_NOTE_CHARS} characters.` });
    return;
  }
  if (overLimit(visitorKey(req))) {
    res.status(429).json({ error: "That's a lot of tries. Wait a few minutes, then try again." });
    return;
  }
  const inputMode = body?.inputMode === "voice" ? "voice" : "typed";
  // Never log the note or the result: they hold health details.
  const { read, decision, braintrustLogged } = await runDemoIntake(note, inputMode);
  res.json({
    decision,
    read: { source: read.source, model: read.model, latencyMs: read.latencyMs, error: read.error, keywords: read.keywords, scores: read.scores },
    braintrustLogged,
  });
});

export default router;
