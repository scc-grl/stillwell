import { Router, type Request } from "express";
import { getAuth } from "@clerk/express";
import { pool } from "@workspace/db";
import { ConsentRecoveryIntakeBody } from "@workspace/api-zod";
import { runDemoIntake } from "../lib/demo-intake";
import { syntheticIntakeAllowed } from "../lib/patient-intake-policy";
import { IntakeError, PatientIntakeService } from "../lib/patient-intake";

// Mounted AFTER recoveryRouter's existing origin, auth and clinician-role guards.
export const patientIntakeRouter = Router();
const owner = (req: Request) => getAuth(req).userId!;
const service = new PatientIntakeService(pool, async (note, answered) => {
  const result = await runDemoIntake(note, "typed", { answered });
  return { decision: result.decision, source: result.read.source };
});
patientIntakeRouter.use(["/intake", "/stages"], (_req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  if (!syntheticIntakeAllowed(process.env.NODE_ENV)) {
    res.status(403).json({ error: "Real-patient AI intake is not enabled. Synthetic preview testing only." });
    return;
  }
  next();
});
patientIntakeRouter.post("/intake/consent", async (req, res) => {
  const parsed = ConsentRecoveryIntakeBody.safeParse(req.body);
  if (!parsed.success || parsed.data.consentAccepted !== true || parsed.data.syntheticOnly !== true) {
    res.status(400).json({ error: "Agree to the synthetic preview intake before starting." }); return;
  }
  try {
    res.status(201).json(await service.consent(owner(req)));
  } catch {
    res.status(503).json({ error: "We couldn't record your intake consent. Nothing was sent for AI review. Please try again." });
  }
});
patientIntakeRouter.get("/stages", async (req, res) => {
  try {
    res.json(await service.history(owner(req)));
  } catch {
    res.status(503).json({ error: "We couldn't load your stage history. Please try again." });
  }
});
patientIntakeRouter.post("/intake", async (req, res) => {
  try {
    res.json(await service.execute(owner(req), req.body));
  } catch (error) {
    if (error instanceof IntakeError) {
      res.status(error.status).json({ error: error.message }); return;
    }
    // Do not pass database/SDK errors to a logger: they may contain parameters.
    res.status(503).json({ error: "We couldn't save your starting stage. Please try again." });
  }
});
