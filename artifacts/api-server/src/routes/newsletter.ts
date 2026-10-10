import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, newsletterSubscriptions } from "@workspace/db";
import {
  SubscribeNewsletterBody,
  SubscribeNewsletterResponse,
  UnsubscribeNewsletterBody,
  UnsubscribeNewsletterResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/newsletter/subscribe", async (req, res): Promise<void> => {
  const body = req.body as { email?: unknown } | undefined;
  const parsed = SubscribeNewsletterBody.safeParse({
    ...body,
    email: typeof body?.email === "string" ? body.email.trim() : body?.email,
  });
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a valid email address to subscribe." });
    return;
  }

  const email = parsed.data.email.toLowerCase();
  await db.insert(newsletterSubscriptions)
    .values({ email })
    .onConflictDoNothing({ target: newsletterSubscriptions.email });

  res.status(202).json(SubscribeNewsletterResponse.parse({ subscribed: true }));
});

router.post("/newsletter/unsubscribe", async (req, res): Promise<void> => {
  const body = req.body as { email?: unknown } | undefined;
  const parsed = UnsubscribeNewsletterBody.safeParse({
    ...body,
    email: typeof body?.email === "string" ? body.email.trim() : body?.email,
  });
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a valid email address to unsubscribe." });
    return;
  }

  await db.delete(newsletterSubscriptions)
    .where(eq(newsletterSubscriptions.email, parsed.data.email.toLowerCase()));

  // Keep the response identical for listed and unlisted addresses.
  res.status(200).json(UnsubscribeNewsletterResponse.parse({ unsubscribed: true }));
});

export default router;
