import { Router } from "express";
import { db } from "@workspace/db";
import { teachersTable } from "@workspace/db";
import { eq, ilike, and } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthUser } from "../middlewares/auth";
import { logAudit } from "../lib/audit";
const router = Router();

async function getNextCode(schoolId: number) {
  const all = await db.select({ code: teachersTable.teacherCode }).from(teachersTable).where(eq(teachersTable.schoolId, schoolId));
  const nums = all.map(t => parseInt(t.code.split("-").pop() ?? "")).filter(n => !isNaN(n));
  return `TCH${schoolId}-${(nums.length ? Math.max(...nums) : 100) + 1}`;
}
router.get("/teachers", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const term = String(req.query.search ?? "");
  const rows = await db.select().from(teachersTable).where(term
    ? and(eq(teachersTable.schoolId, user.schoolId!), ilike(teachersTable.fullName, `%${term}%`))
    : eq(teachersTable.schoolId, user.schoolId!));
  res.json(rows);
});
router.post("/teachers", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const { fullName, specialization, phone, email, address, hireDate, status } = req.body ?? {};
  if (!fullName || !specialization) { res.status(400).json({ error: "اسم المعلم والاختصاص مطلوبان" }); return; }
  const teacherCode = await getNextCode(user.schoolId!);
  const [row] = await db.insert(teachersTable).values({
    schoolId: user.schoolId!, teacherCode, fullName: String(fullName).trim(), specialization,
    phone: phone ?? null, email: email ?? null, address: address ?? null,
    hireDate: hireDate ?? new Date().toISOString().slice(0, 10), status: status ?? "active",
  }).returning();
  await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "create", entity: "teacher", entityId: row.id, afterData: row });
  res.status(201).json(row);
});
router.get("/teachers/:id", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const [row] = await db.select().from(teachersTable).where(and(eq(teachersTable.id, Number(req.params.id)), eq(teachersTable.schoolId, user.schoolId!))).limit(1);
  if (!row) { res.status(404).json({ error: "المعلم غير موجود" }); return; }
  res.json(row);
});
router.patch("/teachers/:id", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const id = Number(req.params.id);
  const [before] = await db.select().from(teachersTable).where(and(eq(teachersTable.id, id), eq(teachersTable.schoolId, user.schoolId!))).limit(1);
  if (!before) { res.status(404).json({ error: "المعلم غير موجود" }); return; }
  const { fullName, specialization, phone, email, address, hireDate, status } = req.body ?? {};
  const updates: any = {};
  for (const key of ["fullName", "specialization", "phone", "email", "address", "hireDate", "status"]) if (req.body?.[key] !== undefined) updates[key] = req.body[key];
  const [row] = await db.update(teachersTable).set(updates).where(and(eq(teachersTable.id, id), eq(teachersTable.schoolId, user.schoolId!))).returning();
  await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "update", entity: "teacher", entityId: row.id, beforeData: before, afterData: row });
  res.json(row);
});
router.delete("/teachers/:id", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const id = Number(req.params.id);
  const [before] = await db.select().from(teachersTable).where(and(eq(teachersTable.id, id), eq(teachersTable.schoolId, user.schoolId!))).limit(1);
  if (!before) { res.status(404).json({ error: "المعلم غير موجود" }); return; }
  await db.delete(teachersTable).where(and(eq(teachersTable.id, id), eq(teachersTable.schoolId, user.schoolId!)));
  await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "delete", entity: "teacher", entityId: id, beforeData: before });
  res.status(204).end();
});
export default router;
