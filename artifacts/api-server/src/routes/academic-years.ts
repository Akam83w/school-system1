import { Router } from "express";
import { db } from "@workspace/db";
import { academicYearsTable } from "@workspace/db";
import { eq, asc, and } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthUser } from "../middlewares/auth";
const router = Router();
router.get("/academic-years", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const rows = await db.select().from(academicYearsTable).where(eq(academicYearsTable.schoolId, user.schoolId!)).orderBy(asc(academicYearsTable.startYear));
  res.json(rows);
});
router.get("/academic-years/current", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const [row] = await db.select().from(academicYearsTable).where(and(eq(academicYearsTable.isCurrent, true), eq(academicYearsTable.schoolId, user.schoolId!))).limit(1);
  res.json(row ?? null);
});
router.patch("/academic-years/:id/set-current", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser; const id = Number(req.params.id);
  const [target] = await db.select().from(academicYearsTable).where(and(eq(academicYearsTable.id, id), eq(academicYearsTable.schoolId, user.schoolId!))).limit(1);
  if (!target) { res.status(404).json({ error: "العام الدراسي غير موجود" }); return; }
  await db.update(academicYearsTable).set({ isCurrent: false }).where(eq(academicYearsTable.schoolId, user.schoolId!));
  const [row] = await db.update(academicYearsTable).set({ isCurrent: true }).where(and(eq(academicYearsTable.id, id), eq(academicYearsTable.schoolId, user.schoolId!))).returning();
  res.json(row);
});
export default router;
