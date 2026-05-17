import { Router } from "express";
import { db } from "@workspace/db";
import { teachersTable } from "@workspace/db";
import { eq, ilike } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

async function getNextCode() {
  const all = await db.select({ code: teachersTable.teacherCode }).from(teachersTable);
  const nums = all.map(t => parseInt(t.code.replace("TCH", ""))).filter(n => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 100;
  return `TCH${max + 1}`;
}

router.get("/teachers", async (req, res) => {
  const { search } = req.query;
  let rows;
  if (search) {
    rows = await db.select().from(teachersTable).where(ilike(teachersTable.fullName, `%${search}%`));
  } else {
    rows = await db.select().from(teachersTable);
  }
  res.json(rows);
});

router.post("/teachers", async (req, res) => {
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
  res.status(201).json(row);
});

router.get("/teachers/:id", async (req, res) => {
  const [row] = await db.select().from(teachersTable).where(eq(teachersTable.id, Number(req.params.id)));
  if (!row) { res.status(404).json({ error: "المعلم غير موجود" }); return; }
  res.json(row);
});

router.patch("/teachers/:id", async (req, res) => {
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
  res.json(row);
});

router.delete("/teachers/:id", async (req, res) => {
  await db.delete(teachersTable).where(eq(teachersTable.id, Number(req.params.id)));
  res.status(204).end();
});

export default router;
