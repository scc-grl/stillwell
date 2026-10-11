import { Router, type IRouter } from "express";
import healthRouter from "./health";
import recoveryRouter from "./recovery";
import newsletterRouter from "./newsletter";
import accountRouter from "./account";

const router: IRouter = Router();

router.use(healthRouter);
router.use(accountRouter);
router.use(recoveryRouter);
router.use(newsletterRouter);

export default router;
