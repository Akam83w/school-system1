import { Router } from "express";
import { db } from "@workspace/db";
import { announcementsTable } from "@workspace/db";
import { eq, desc, and, gte, or, isNull } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthUser } from "../middlewares/auth";
import { logAudit } from "../lib/audit";
const router = Router();
router.get("/announcements", requireAuth, async (req, res) => {
  const user = (req as any).user as AuthUser; const now = new Date();
  const rows = await db.select().from(announcementsTable).where(and(eq(announcementsTable.schoolId, user.schoolId!), or(isNull(announcementsTable.expiresAt), gte(announcementsTable.expiresAt, now)))).orderBy(desc(announcementsTable.isPinned), desc(announcementsTable.createdAt));
  res.json(rows);
});
router.get("/announcements/all", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const rows = await db.select().from(announcementsTable).where(eq(announcementsTable.schoolId, user.schoolId!)).orderBy(desc(announcementsTable.isPinned), desc(announcementsTable.createdAt));
  res.json(rows);
});
router.post("/announcements", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser; const { title, body, type, isPinned, expiresAt } = req.body ?? {};
  if (!title || !body) { res.status(400).json({ error: "العنوان ومحتوى الإعلان مطلوبان" }); return; }
  if (type && !["info", "warning", "holiday", "alert"].includes(type)) { res.status(400).json({ error: "نوع الإعلان غير صالح" }); return; }
  const [row] = await db.insert(announcementsTable).values({ schoolId: user.schoolId!, title: String(title).trim(), body: String(body).trim(), type: type ?? "info", authorId: user.id, authorName: user.name, isPinned: !!isPinned, expiresAt: expiresAt ? new Date(expiresAt) : null }).returning();
  await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "create", entity: "announcement", entityId: row.id, afterData: row });
  res.status(201).json(row);
});
router.patch("/announcements/:id", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser; const id = Number(req.params.id);
  const [before] = await db.select().from(announcementsTable).where(and(eq(announcementsTable.id, id), eq(announcementsTable.schoolId, user.schoolId!))).limit(1);
  if (!before) { res.status(404).json({ error: "الإعلان غير موجود" }); return; }
  const updates: any = {};
  for (const key of ["title", "body", "type"]) if (req.body?.[key] !== undefined) updates[key] = req.body[key];
  if (req.body?.isPinned !== undefined) updates.isPinned = !!req.body.isPinned;
  if (req.body?.expiresAt !== undefined) updates.expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : null;
  const [row] = await db.update(announcementsTable).set(updates).where(and(eq(announcementsTable.id, id), eq(announcementsTable.schoolId, user.schoolId!))).returning();
  await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "update", entity: "announcement", entityId: id, beforeData: before, afterData: row });
  res.json(row);
});
router.delete("/announcements/:id", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser; const id = Number(req.params.id);
  const [before] = await db.select().from(announcementsTable).where(and(eq(announcementsTable.id, id), eq(announcementsTable.schoolId, user.schoolId!))).limit(1);
  if (!before) { res.status(404).json({ error: "الإعلان غير موجود" }); return; }
  await db.delete(announcementsTable).where(and(eq(announcementsTable.id, id), eq(announcementsTable.schoolId, user.schoolId!)));
  await logAudit({ userId: user.id, userName: user.name, userPhone: user.phone, action: "delete", entity: "announcement", entityId: id, beforeData: before });
  res.status(204).end();
});
export default router;
