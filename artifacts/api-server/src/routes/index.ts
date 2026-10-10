import { Router, type IRouter } from "express";
import healthRouter from "./health";
import recoveryRouter from "./recovery";
import newsletterRouter from "./newsletter";

const router: IRouter = Router();

router.use(healthRouter);
router.use(recoveryRouter);
router.use(newsletterRouter);

export default router;
