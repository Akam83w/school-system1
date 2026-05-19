import { Router } from "express";
import { db } from "@workspace/db";
import { teachersTable } from "@workspace/db";
import { eq, ilike } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthUser } from "../middlewares/auth";
import { logAudit } from "../lib/audit";

const router = Router();

async function getNextCode() {
  const all = await db.select({ code: teachersTable.teacherCode }).from(teachersTable);
  const nums = all.map(t => parseInt(t.code.replace("TCH", ""))).filter(n => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 100;
  return `TCH${max + 1}`;
}

// GET /teachers — admin + teacher
router.get("/teachers", requireAuth, async (req, res) => {
  const { search } = req.query;
  let rows;
  if (search) {
    rows = await db.select().from(teachersTable).where(ilike(teachersTable.fullName, `%${search}%`));
  } else {
    rows = await db.select().from(teachersTable);
  }
  res.json(rows);
});

// POST /teachers — admin only
router.post("/teachers", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const { fullName, specialization, phone, email, address, hireDate, status } = req.body;
  const teacherCode = await getNextCode();
  const [row] = await db.insert(teachersTable).values({
    teacherCode,
    fullName,
    specialization,
    phone,
    email: email ?? null,
    address: address ?? null,
    hireDate: hireDate ?? new Date().toISOString().split("T")[0],
    status: status ?? "active",
  }).returning();
  await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "create", entity: "teacher", entityId: row.id, afterData: row });
  res.status(201).json(row);
});

// GET /teachers/:id — admin + teacher
router.get("/teachers/:id", requireAuth, async (req, res) => {
  const [row] = await db.select().from(teachersTable).where(eq(teachersTable.id, Number(req.params.id)));
  if (!row) { res.status(404).json({ error: "المعلم غير موجود" }); return; }
  res.json(row);
});

// PATCH /teachers/:id — admin only
router.patch("/teachers/:id", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const [before] = await db.select().from(teachersTable).where(eq(teachersTable.id, Number(req.params.id)));
  if (!before) { res.status(404).json({ error: "المعلم غير موجود" }); return; }
  const { fullName, specialization, phone, email, address, hireDate, status } = req.body;
  const updates: any = {};
  if (fullName !== undefined) updates.fullName = fullName;
  if (specialization !== undefined) updates.specialization = specialization;
  if (phone !== undefined) updates.phone = phone;
  if (email !== undefined) updates.email = email;
  if (address !== undefined) updates.address = address;
  if (hireDate !== undefined) updates.hireDate = hireDate;
  if (status !== undefined) updates.status = status;
  const [row] = await db.update(teachersTable).set(updates).where(eq(teachersTable.id, Number(req.params.id))).returning();
  if (!row) { res.status(404).json({ error: "المعلم غير موجود" }); return; }
  await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "update", entity: "teacher", entityId: row.id, beforeData: before, afterData: row });
  res.json(row);
});

// DELETE /teachers/:id — admin only
router.delete("/teachers/:id", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const [before] = await db.select().from(teachersTable).where(eq(teachersTable.id, Number(req.params.id)));
  await db.delete(teachersTable).where(eq(teachersTable.id, Number(req.params.id)));
  if (before) {
    await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "delete", entity: "teacher", entityId: before.id, beforeData: before });
  }
  res.status(204).end();
});

export default router;
