import { Router, type IRouter, Request, Response, NextFunction } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import studentsRouter from "./students";
import teachersRouter from "./teachers";
import classesRouter from "./classes";
import subjectsRouter from "./subjects";
import attendanceRouter from "./attendance";
import gradesRouter from "./grades";
import dashboardRouter from "./dashboard";
import auditLogsRouter from "./audit-logs";
import announcementsRouter from "./announcements";
import academicYearsRouter from "./academic-years";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

/* =========================
   UNAUTHENTICATED ROUTES
   (Health checks and authentication)
   ========================= */
router.use(healthRouter);
router.use(authRouter);

/* =========================
   GLOBAL MIDDLEWARE: Require authentication for all routes below
   
   This middleware ensures that EVERY request to protected endpoints
   (students, teachers, classes, grades, etc.) must include a valid JWT token.
   
   Flow:
   1. Extract Authorization: Bearer <token> header
   2. Verify token signature using SESSION_SECRET
   3. Load user from database
   4. Attach user to request object
   5. Continue to route handler or reject with 401
   ========================= */
router.use((req: Request, res: Response, next: NextFunction) => {
  // Log incoming protected request
  logger.debug(
    { method: req.method, path: req.path, auth: !!req.headers.authorization },
    "Protected route access attempt"
  );

  // Require authentication
  requireAuth(req, res, () => {
    // On successful auth, continue to next handler
    next();
  });
});

/* =========================
   AUTHENTICATED ROUTES
   (All requests below this point MUST have valid JWT token)
   ========================= */
router.use(usersRouter);
router.use(studentsRouter);
router.use(teachersRouter);
router.use(classesRouter);
router.use(subjectsRouter);
router.use(attendanceRouter);
router.use(gradesRouter);
router.use(dashboardRouter);
router.use(auditLogsRouter);
router.use(announcementsRouter);
router.use(academicYearsRouter);

export default router;
