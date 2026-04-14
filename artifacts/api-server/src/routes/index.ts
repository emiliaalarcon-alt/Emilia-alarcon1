import { Router, type IRouter } from "express";
import healthRouter from "./health";
import scheduleRouter from "./schedule";
import tasksRouter from "./tasks";
import teamRouter from "./team";
import workshopsRouter from "./workshops";

const router: IRouter = Router();

router.use(healthRouter);
router.use(scheduleRouter);
router.use(tasksRouter);
router.use(teamRouter);
router.use(workshopsRouter);

export default router;
