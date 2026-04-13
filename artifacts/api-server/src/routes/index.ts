import { Router, type IRouter } from "express";
import healthRouter from "./health";
import scheduleRouter from "./schedule";
import tasksRouter from "./tasks";

const router: IRouter = Router();

router.use(healthRouter);
router.use(scheduleRouter);
router.use(tasksRouter);

export default router;
