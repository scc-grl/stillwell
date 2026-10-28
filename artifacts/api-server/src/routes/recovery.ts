import { Router, type IRouter, type Request } from "express";
import { allowedRequestOrigin } from "../lib/request-origin";
import { getAuth } from "@clerk/express";
import { and, desc, eq, sql } from "drizzle-orm";
import { accountRoles, db, recoveryLogs, recoveryProfiles } from "@workspace/db";
import {
  DeleteRecoveryLogParams,
  GetRecoveryResponse,
  SaveRecoveryLogBody,
  SaveRecoveryLogResponse,
  StartRecoveryBody,
  UpdateRecoveryProfileBody,
  UpdateRecoveryProfileResponse,
} from "@workspace/api-zod";
import { getClerkProxyHost } from "../middlewares/clerkProxyMiddleware";
import { recoveryLogWrite } from "../lib/recovery-log-write";
import { careIdentity, careTeamService } from "../lib/care-team-runtime";

const router: IRouter = Router();
const CONSENT_VERSION = "2026-10-08";
const owner = (req: Request) => getAuth(req).userId!;

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "1900-01-01") return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validLog(data: { date: string; symptoms: { name: string }[] }): boolean {
  return validDate(data.date) &&
    new Set(data.symptoms.map((symptom) => symptom.name)).size === data.symptoms.length;
}

async function stateFor(ownerId: string) {
  const [profile] = await db.select().from(recoveryProfiles).where(eq(recoveryProfiles.ownerId, ownerId));
  const logs = await db.select().from(recoveryLogs).where(eq(recoveryLogs.ownerId, ownerId)).orderBy(desc(recoveryLogs.date));
  return GetRecoveryResponse.parse({
    profile: profile ? {
      ...profile.preferences,
      consentVersion: profile.consentVersion,
      consentedAt: profile.consentedAt.toISOString(),
    } : null,
    logs: logs.map((log) => ({ ...log.data, date: log.date, updatedAt: log.updatedAt.toISOString() })),
  });
}

router.use("/recovery", (req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  if (!allowedRequestOrigin({ origin: req.get("origin"), host: getClerkProxyHost(req), authorization: req.get("authorization") })) {
    res.status(403).json({ error: "Cross-origin access is not permitted." });
    return;
  }
  if (!getAuth(req).userId) {
    res.status(401).json({ error: "Please sign in to access your recovery journal." });
    return;
  }
  const userId = getAuth(req).userId!;
  void db.select({ accountType: accountRoles.accountType })
    .from(accountRoles)
    .where(eq(accountRoles.userId, userId))
    .then(([role]) => {
      if (role?.accountType === "clinician") {
        res.status(403).json({ error: "Clinician accounts cannot access patient recovery data." });
        return;
      }
      next();
    })
    .catch(next);
});

router.get("/recovery", async (req, res): Promise<void> => {
  res.json(await stateFor(owner(req)));
});

router.post("/recovery/start", async (req, res): Promise<void> => {
  const parsed = StartRecoveryBody.safeParse(req.body);
  if (!parsed.success || parsed.data.consentAccepted !== true || !validLog(parsed.data.firstLog)) {
    res.status(400).json({ error: "Check your first entry and accept the storage consent." });
    return;
  }
  const ownerId = owner(req);
  const { preferences, firstLog } = parsed.data;
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`patient:${ownerId}`},0))`);
    // A retry or parallel signup callback must not create a second first summary.
    const created = await tx.insert(recoveryProfiles).values({
      ownerId, preferences, consentVersion: CONSENT_VERSION,
    }).onConflictDoNothing().returning({ ownerId: recoveryProfiles.ownerId });
    if (created.length) {
      await tx.insert(recoveryLogs).values({ ownerId, date: firstLog.date, data: firstLog });
    }
  });
  res.status(201).json(await stateFor(ownerId));
});

router.put("/recovery/profile", async (req, res): Promise<void> => {
  const parsed = UpdateRecoveryProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Choose a support mode and at least one routine priority." });
    return;
  }
  const [profile] = await db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`patient:${owner(req)}`},0))`);
    return tx.update(recoveryProfiles).set({ preferences: sql`${recoveryProfiles.preferences} || ${JSON.stringify(parsed.data)}::jsonb` })
      .where(eq(recoveryProfiles.ownerId, owner(req))).returning();
  });
  if (!profile) {
    res.status(404).json({ error: "Complete the starting quiz first." });
    return;
  }
  res.json(UpdateRecoveryProfileResponse.parse({
    ...profile.preferences, consentVersion: profile.consentVersion, consentedAt: profile.consentedAt.toISOString(),
  }));
});

router.post("/recovery/logs", async (req, res): Promise<void> => {
  const parsed = SaveRecoveryLogBody.safeParse(req.body);
  if (!parsed.success || !validLog(parsed.data)) {
    res.status(400).json({ error: "Check the calendar date, symptom ratings, and activity details." });
    return;
  }
  const ownerId = owner(req);
  if ((parsed.data.section === "check_in" || parsed.data.section === "journal") && !parsed.data.dailyCheckIn) {
    res.status(400).json({ error: "Include the symptom check-in for this update." });
    return;
  }
  if (parsed.data.section === "sleep" && parsed.data.sleep === undefined) {
    res.status(400).json({ error: "Include the sleep section, or null to remove it." });
    return;
  }
  if (parsed.data.section === "journal" && parsed.data.sleep === undefined) {
    res.status(400).json({ error: "Include the sleep section, or null to remove it." });
    return;
  }
  const { initial, patch } = recoveryLogWrite(parsed.data);
  const saved = await db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`patient:${ownerId}`},0))`);
    const [profile] = await tx.select({ ownerId: recoveryProfiles.ownerId }).from(recoveryProfiles).where(eq(recoveryProfiles.ownerId, ownerId));
    if (!profile) return null;
    const [entry] = await tx.insert(recoveryLogs).values({ ownerId, date: initial.date, data: initial })
    .onConflictDoUpdate({
      target: [recoveryLogs.ownerId, recoveryLogs.date],
      set: {
        data: sql`${recoveryLogs.data} || ${JSON.stringify(patch)}::jsonb`,
        updatedAt: new Date(),
      },
    }).returning();
    return entry;
  });
  if (!saved) {
    res.status(404).json({ error: "Complete the starting quiz first." });
    return;
  }
  res.json(SaveRecoveryLogResponse.parse({ ...saved.data, date: saved.date, updatedAt: saved.updatedAt.toISOString() }));
});

router.delete("/recovery/logs/:date", async (req, res): Promise<void> => {
  const parsed = DeleteRecoveryLogParams.safeParse(req.params);
  if (!parsed.success || !validDate(parsed.data.date)) {
    res.status(400).json({ error: "Choose a valid calendar date." });
    return;
  }
  await db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`patient:${owner(req)}`},0))`);
    await tx.delete(recoveryLogs).where(and(eq(recoveryLogs.ownerId, owner(req)), eq(recoveryLogs.date, parsed.data.date)));
  });
  res.sendStatus(204);
});

router.delete("/recovery", async (req, res): Promise<void> => {
  await careTeamService.deleteRecovery(await careIdentity(owner(req)));
  res.sendStatus(204);
});

export default router;
