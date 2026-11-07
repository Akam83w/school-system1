import { Router } from "express";
import { db } from "@workspace/db";
import { adminsTable, teachersTable, studentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthUser } from "../middlewares/auth";
import { hashPassword } from "./auth";
import { logAudit } from "../lib/audit";

const router = Router();

router.get("/users", requireAuth, requireAdmin, async (req, res) => {
  const caller = (req as any).user as AuthUser;
  const users = await db.select({
    id: adminsTable.id, username: adminsTable.username, name: adminsTable.name,
    role: adminsTable.role, phone: adminsTable.phone, email: adminsTable.email,
    linkedId: adminsTable.linkedId, createdAt: adminsTable.createdAt,
  }).from(adminsTable).where(eq(adminsTable.schoolId, caller.schoolId!)).orderBy(adminsTable.createdAt);
  res.json(users.map(u => ({ ...u, linkedId: u.linkedId ?? null })));
});

router.post("/users", requireAuth, requireAdmin, async (req, res) => {
  const caller = (req as any).user as AuthUser;
  const { name, username, phone, email, password, role, linkedId } = req.body ?? {};
  if (!name || !username || !phone || !password || !role) {
    res.status(400).json({ error: "الاسم الكامل واسم المستخدم ورقم الهاتف وكلمة المرور والدور مطلوبة" }); return;
  }
  if (String(name).trim().split(/\s+/).filter(Boolean).length < 3) {
    res.status(400).json({ error: "يجب أن يتكون الاسم من ثلاثة أسماء على الأقل" }); return;
  }
  if (!["admin", "teacher", "student", "parent"].includes(String(role))) {
    res.status(400).json({ error: "الدور غير صالح" }); return;
  }
  if (typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "يجب أن تكون كلمة المرور 8 أحرف على الأقل" }); return;
  }
  if (["teacher", "student", "parent"].includes(String(role))) {
    if (linkedId == null || !Number.isInteger(Number(linkedId)) || Number(linkedId) <= 0) {
      res.status(400).json({ error: "يجب ربط حساب المعلم أو الطالب أو ولي الأمر بسجله أولاً" }); return;
    }
    const profileTable = role === "teacher" ? teachersTable : studentsTable;
    const [profile] = await db.select({ id: profileTable.id }).from(profileTable).where(and(
      eq(profileTable.id, Number(linkedId)), eq(profileTable.schoolId, caller.schoolId!)
    )).limit(1);
    if (!profile) { res.status(404).json({ error: "سجل المعلم أو الطالب غير موجود في مدرستك" }); return; }
    const [linkedAccount] = await db.select({ id: adminsTable.id }).from(adminsTable).where(and(
      eq(adminsTable.linkedId, Number(linkedId)), eq(adminsTable.role, String(role)), eq(adminsTable.schoolId, caller.schoolId!)
    )).limit(1);
    if (linkedAccount) { res.status(409).json({ error: "هذا السجل مرتبط بحساب دخول مسبقاً" }); return; }
  }
  const usernameStr = String(username).trim();
  const phoneStr = String(phone).trim();
  const [usernameExists] = await db.select({ id: adminsTable.id }).from(adminsTable).where(eq(adminsTable.username, usernameStr)).limit(1);
  if (usernameExists) { res.status(409).json({ error: "اسم المستخدم مستخدم بالفعل" }); return; }
  const [phoneExists] = await db.select({ id: adminsTable.id }).from(adminsTable).where(eq(adminsTable.phone, phoneStr)).limit(1);
  if (phoneExists) { res.status(409).json({ error: "رقم الهاتف مستخدم بالفعل" }); return; }

  const passwordHash = await hashPassword(password);
  const [newUser] = await db.insert(adminsTable).values({
    name: String(name).trim(), username: usernameStr, phone: phoneStr,
    email: email ? String(email).trim().toLowerCase() : null, passwordHash,
    role: String(role), linkedId: linkedId != null ? Number(linkedId) : null,
    schoolId: caller.schoolId!,
  }).returning();
  await logAudit({ userId: caller.id, userName: caller.name, userPhone: caller.phone, action: "create", entity: "user", entityId: newUser.id, afterData: { username: newUser.username, role: newUser.role, linkedId: newUser.linkedId } });
  res.status(201).json({ id: newUser.id, username: newUser.username, name: newUser.name, role: newUser.role, phone: newUser.phone, email: newUser.email, linkedId: newUser.linkedId ?? null, createdAt: newUser.createdAt });
});

router.patch("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  const caller = (req as any).user as AuthUser;
  const targetId = Number(req.params.id);
  const [before] = await db.select().from(adminsTable).where(and(
    eq(adminsTable.id, targetId), eq(adminsTable.schoolId, caller.schoolId!)
  )).limit(1);
  if (!before) { res.status(404).json({ error: "المستخدم غير موجود" }); return; }

  const { name, role, linkedId, email } = req.body ?? {};
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = String(name).trim();
  if (email !== undefined) updates.email = email ? String(email).trim().toLowerCase() : null;
  if (role !== undefined) {
    if (!["admin", "teacher", "student", "parent"].includes(String(role))) { res.status(400).json({ error: "الدور غير صالح" }); return; }
    updates.role = String(role);
  }
  if (role !== undefined && ["teacher", "student", "parent"].includes(String(role)) && linkedId === undefined) {
    res.status(400).json({ error: "حدد سجل المعلم أو الطالب المرتبط بالحساب" }); return;
  }
  if (linkedId !== undefined) {
    const nextRole = String(role ?? before.role);
    if (["teacher", "student", "parent"].includes(nextRole)) {
      const profileTable = nextRole === "teacher" ? teachersTable : studentsTable;
      const linkedNumber = Number(linkedId);
      const [profile] = await db.select({ id: profileTable.id }).from(profileTable).where(and(
        eq(profileTable.id, linkedNumber), eq(profileTable.schoolId, caller.schoolId!)
      )).limit(1);
      if (!profile) { res.status(400).json({ error: "السجل المرتبط يجب أن يكون من المدرسة نفسها" }); return; }
      if (nextRole === "parent") {
        const [duplicate] = await db.select({ id: adminsTable.id }).from(adminsTable).where(and(
          eq(adminsTable.linkedId, linkedNumber), eq(adminsTable.role, "parent"), eq(adminsTable.schoolId, caller.schoolId!)
        )).limit(1);
        if (duplicate && duplicate.id !== targetId) { res.status(409).json({ error: "هذا الطالب لديه حساب ولي أمر بالفعل" }); return; }
      }
    }
    updates.linkedId = linkedId != null && linkedId !== "" ? Number(linkedId) : null;
  }
  if (!Object.keys(updates).length) { res.status(400).json({ error: "لا توجد حقول للتحديث" }); return; }
  const [row] = await db.update(adminsTable).set(updates).where(and(
    eq(adminsTable.id, targetId), eq(adminsTable.schoolId, caller.schoolId!)
  )).returning();
  if (!row) { res.status(404).json({ error: "المستخدم غير موجود" }); return; }
  await logAudit({ userId: caller.id, userName: caller.name, userPhone: caller.phone, action: "update", entity: "user", entityId: row.id, beforeData: { role: before.role, linkedId: before.linkedId }, afterData: { role: row.role, linkedId: row.linkedId } });
  res.json({ id: row.id, username: row.username, name: row.name, role: row.role, phone: row.phone, email: row.email, linkedId: row.linkedId ?? null, createdAt: row.createdAt });
});

router.delete("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  const caller = (req as any).user as AuthUser;
  const targetId = Number(req.params.id);
  if (targetId === caller.id) { res.status(400).json({ error: "لا يمكن حذف حسابك الخاص" }); return; }
  const [before] = await db.select().from(adminsTable).where(and(
    eq(adminsTable.id, targetId), eq(adminsTable.schoolId, caller.schoolId!)
  )).limit(1);
  if (!before) { res.status(404).json({ error: "المستخدم غير موجود" }); return; }
  await db.delete(adminsTable).where(and(eq(adminsTable.id, targetId), eq(adminsTable.schoolId, caller.schoolId!)));
  await logAudit({ userId: caller.id, userName: caller.name, userPhone: caller.phone, action: "delete", entity: "user", entityId: targetId, beforeData: { username: before.username, role: before.role } });
  res.status(204).end();
});

export default router;
