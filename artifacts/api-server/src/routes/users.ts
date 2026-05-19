import { Router } from "express";
import { db } from "@workspace/db";
import { adminsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthUser } from "../middlewares/auth";
import { hashPassword } from "./auth";
import { logAudit } from "../lib/audit";

const router = Router();

// GET /users — admin only: list all system user accounts
router.get("/users", requireAuth, requireAdmin, async (_req, res) => {
  const users = await db
    .select({
      id: adminsTable.id,
      username: adminsTable.username,
      name: adminsTable.name,
      role: adminsTable.role,
      phone: adminsTable.phone,
      linkedId: adminsTable.linkedId,
      createdAt: adminsTable.createdAt,
    })
    .from(adminsTable)
    .orderBy(adminsTable.createdAt);
  res.json(users.map(u => ({ ...u, linkedId: u.linkedId ?? null })));
});

// POST /users — admin only: create a new user account with a specific role
router.post("/users", requireAuth, requireAdmin, async (req, res) => {
  const caller = (req as any).user as AuthUser;
  const { name, username, phone, password, role, linkedId } = req.body;

  if (!name || !username || !phone || !password || !role) {
    res.status(400).json({ error: "الاسم الكامل واسم المستخدم ورقم الهاتف وكلمة المرور والدور مطلوبة" });
    return;
  }

  const nameParts = String(name).trim().split(/\s+/).filter(Boolean);
  if (nameParts.length < 3) {
    res.status(400).json({ error: "يجب أن يتكون الاسم من ثلاثة أسماء على الأقل" });
    return;
  }

  if (!["admin", "teacher", "student"].includes(String(role))) {
    res.status(400).json({ error: "الدور غير صالح. الأدوار المتاحة: admin, teacher, student" });
    return;
  }

  if (typeof password !== "string" || password.length < 6) {
    res.status(400).json({ error: "يجب أن تكون كلمة المرور 6 أحرف على الأقل" });
    return;
  }

  const phoneStr = String(phone).trim();
  const usernameStr = String(username).trim();

  const [usernameExists] = await db
    .select({ id: adminsTable.id })
    .from(adminsTable)
    .where(eq(adminsTable.username, usernameStr))
    .limit(1);
  if (usernameExists) {
    res.status(409).json({ error: "اسم المستخدم مستخدم بالفعل" });
    return;
  }

  const [phoneExists] = await db
    .select({ id: adminsTable.id })
    .from(adminsTable)
    .where(eq(adminsTable.phone, phoneStr))
    .limit(1);
  if (phoneExists) {
    res.status(409).json({ error: "رقم الهاتف مستخدم بالفعل" });
    return;
  }

  const passwordHash = hashPassword(String(password));
  const [newUser] = await db
    .insert(adminsTable)
    .values({
      name: String(name).trim(),
      username: usernameStr,
      phone: phoneStr,
      passwordHash,
      role: String(role),
      linkedId: linkedId != null ? Number(linkedId) : null,
    })
    .returning();

  await logAudit({
    userId: caller.id,
    userName: caller.name,
    userPhone: caller.phone,
    action: "create",
    entity: "user",
    entityId: newUser.id,
    afterData: { username: newUser.username, role: newUser.role, linkedId: newUser.linkedId },
  });

  res.status(201).json({
    id: newUser.id,
    username: newUser.username,
    name: newUser.name,
    role: newUser.role,
    phone: newUser.phone,
    linkedId: newUser.linkedId ?? null,
    createdAt: newUser.createdAt,
  });
});

// PATCH /users/:id — admin only: update role, linkedId, or name
router.patch("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  const caller = (req as any).user as AuthUser;
  const targetId = Number(req.params.id);

  const [before] = await db
    .select()
    .from(adminsTable)
    .where(eq(adminsTable.id, targetId));
  if (!before) {
    res.status(404).json({ error: "المستخدم غير موجود" });
    return;
  }

  const { name, role, linkedId } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = String(name).trim();
  if (role !== undefined) {
    if (!["admin", "teacher", "student"].includes(String(role))) {
      res.status(400).json({ error: "الدور غير صالح" });
      return;
    }
    updates.role = String(role);
  }
  if (linkedId !== undefined) {
    updates.linkedId = linkedId != null && linkedId !== "" ? Number(linkedId) : null;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "لا توجد حقول للتحديث" });
    return;
  }

  const [row] = await db
    .update(adminsTable)
    .set(updates)
    .where(eq(adminsTable.id, targetId))
    .returning();

  await logAudit({
    userId: caller.id,
    userName: caller.name,
    userPhone: caller.phone,
    action: "update",
    entity: "user",
    entityId: row.id,
    beforeData: { role: before.role, linkedId: before.linkedId },
    afterData: { role: row.role, linkedId: row.linkedId },
  });

  res.json({
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role,
    phone: row.phone,
    linkedId: row.linkedId ?? null,
    createdAt: row.createdAt,
  });
});

// DELETE /users/:id — admin only; cannot delete own account
router.delete("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  const caller = (req as any).user as AuthUser;
  const targetId = Number(req.params.id);

  if (targetId === caller.id) {
    res.status(400).json({ error: "لا يمكن حذف حسابك الخاص" });
    return;
  }

  const [before] = await db
    .select()
    .from(adminsTable)
    .where(eq(adminsTable.id, targetId));
  if (!before) {
    res.status(404).json({ error: "المستخدم غير موجود" });
    return;
  }

  await db.delete(adminsTable).where(eq(adminsTable.id, targetId));

  await logAudit({
    userId: caller.id,
    userName: caller.name,
    userPhone: caller.phone,
    action: "delete",
    entity: "user",
    entityId: targetId,
    beforeData: { username: before.username, role: before.role },
  });

  res.status(204).end();
});

export default router;
