import { Router, type IRouter } from "express";
import healthRouter from "./health";
import recoveryRouter from "./recovery";
import newsletterRouter from "./newsletter";
import accountRouter from "./account";
import partnersRouter from "./partners";

const router: IRouter = Router();

router.use(healthRouter);
router.use(accountRouter);
router.use(recoveryRouter);
router.use(newsletterRouter);
router.use((req, res, next) => {
  const plannedFeaturePath =
    req.path === "/partnership-requests" ||
    req.path === "/admin/partnership-requests" ||
    req.path === "/clinicians" ||
    req.path.startsWith("/clinicians/") ||
    req.path === "/patient/clinician-connections" ||
    req.path.startsWith("/patient/clinician-connections/") ||
    req.path === "/clinician/invitations" ||
    req.path.startsWith("/clinician/invitations/") ||
    req.path === "/clinician/patients" ||
    req.path.startsWith("/clinician/patients/") ||
    req.path === "/admin/clinicians" ||
    req.path.startsWith("/admin/clinicians/");
  if (!plannedFeaturePath) {
    next();
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  res.status(410).json({ error: "This capability is planned and is not available yet." });
});
router.use(partnersRouter);

export default router;
