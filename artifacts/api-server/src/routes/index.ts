import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import studentsRouter from "./students";
import teachersRouter from "./teachers";
import classesRouter from "./classes";
import subjectsRouter from "./subjects";
import attendanceRouter from "./attendance";
import gradesRouter from "./grades";
import dashboardRouter from "./dashboard";
import auditLogsRouter from "./audit-logs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(studentsRouter);
router.use(teachersRouter);
router.use(classesRouter);
router.use(subjectsRouter);
router.use(attendanceRouter);
router.use(gradesRouter);
router.use(dashboardRouter);
router.use(auditLogsRouter);

export default router;
