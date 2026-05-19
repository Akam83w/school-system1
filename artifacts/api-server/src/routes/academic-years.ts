import { Router } from "express";
import { db } from "@workspace/db";
import { academicYearsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router = Router();

// GET /academic-years — list all structured year entities (2020-2100)
router.get("/academic-years", requireAuth, async (_req, res) => {
  const rows = await db
    .select()
    .from(academicYearsTable)
    .orderBy(asc(academicYearsTable.startYear));
  res.json(rows);
});

// GET /academic-years/current — get the school's currently active academic year
router.get("/academic-years/current", requireAuth, async (_req, res) => {
  const [row] = await db
    .select()
    .from(academicYearsTable)
    .where(eq(academicYearsTable.isCurrent, true))
    .limit(1);
  res.json(row ?? null);
});

// PATCH /academic-years/:id/set-current — admin: set the school's active academic year
router.patch("/academic-years/:id/set-current", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const [target] = await db
    .select()
    .from(academicYearsTable)
    .where(eq(academicYearsTable.id, id))
    .limit(1);
  if (!target) {
    res.status(404).json({ error: "العام الدراسي غير موجود" });
    return;
  }
  // Unset all isCurrent flags, then set the selected one
  await db.update(academicYearsTable).set({ isCurrent: false });
  const [row] = await db
    .update(academicYearsTable)
    .set({ isCurrent: true })
    .where(eq(academicYearsTable.id, id))
    .returning();
  req.log.info({ academicYearId: row.id, label: row.label }, "Current academic year updated");
  res.json(row);
});

export default router;
