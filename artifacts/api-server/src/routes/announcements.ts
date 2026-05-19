import { Router } from "express";
import { db } from "@workspace/db";
import { announcementsTable } from "@workspace/db";
import { eq, desc, and, gte, or, isNull } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthUser } from "../middlewares/auth";
import { logAudit } from "../lib/audit";

const router = Router();

// GET /announcements — all authenticated users: returns non-expired announcements
router.get("/announcements", requireAuth, async (_req, res) => {
  const now = new Date();
  const rows = await db
    .select()
    .from(announcementsTable)
    .where(
      or(
        isNull(announcementsTable.expiresAt),
        gte(announcementsTable.expiresAt, now)
      )
    )
    .orderBy(desc(announcementsTable.isPinned), desc(announcementsTable.createdAt));
  res.json(rows);
});

// GET /announcements/all — admin only: returns all including expired
router.get("/announcements/all", requireAuth, requireAdmin, async (_req, res) => {
  const rows = await db
    .select()
    .from(announcementsTable)
    .orderBy(desc(announcementsTable.isPinned), desc(announcementsTable.createdAt));
  res.json(rows);
});

// POST /announcements — admin only
router.post("/announcements", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const { title, body, type, isPinned, expiresAt } = req.body;

  if (!title || !body) {
    res.status(400).json({ error: "العنوان ومحتوى الإعلان مطلوبان" });
    return;
  }

  const validTypes = ["info", "warning", "holiday", "alert"];
  if (type && !validTypes.includes(type)) {
    res.status(400).json({ error: "نوع الإعلان غير صالح" });
    return;
  }

  const [row] = await db
    .insert(announcementsTable)
    .values({
      title: String(title).trim(),
      body: String(body).trim(),
      type: type ?? "info",
      authorId: user.id,
      authorName: user.name,
      isPinned: !!isPinned,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    })
    .returning();

  await logAudit({
    userId: user.id,
    userName: user.name,
    userPhone: user.phone,
    action: "create",
    entity: "announcement",
    entityId: row.id,
    afterData: { title: row.title, type: row.type },
  });

  res.status(201).json(row);
});

// PATCH /announcements/:id — admin only
router.patch("/announcements/:id", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const id = Number(req.params.id);

  const [before] = await db.select().from(announcementsTable).where(eq(announcementsTable.id, id));
  if (!before) {
    res.status(404).json({ error: "الإعلان غير موجود" });
    return;
  }

  const { title, body, type, isPinned, expiresAt } = req.body;
  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = String(title).trim();
  if (body !== undefined) updates.body = String(body).trim();
  if (type !== undefined) updates.type = type;
  if (isPinned !== undefined) updates.isPinned = !!isPinned;
  if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : null;

  const [row] = await db
    .update(announcementsTable)
    .set(updates)
    .where(eq(announcementsTable.id, id))
    .returning();

  await logAudit({
    userId: user.id,
    userName: user.name,
    userPhone: user.phone,
    action: "update",
    entity: "announcement",
    entityId: id,
    beforeData: { title: before.title },
    afterData: { title: row.title },
  });

  res.json(row);
});

// DELETE /announcements/:id — admin only
router.delete("/announcements/:id", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const id = Number(req.params.id);

  const [before] = await db.select().from(announcementsTable).where(eq(announcementsTable.id, id));
  if (!before) {
    res.status(404).json({ error: "الإعلان غير موجود" });
    return;
  }

  await db.delete(announcementsTable).where(eq(announcementsTable.id, id));

  await logAudit({
    userId: user.id,
    userName: user.name,
    userPhone: user.phone,
    action: "delete",
    entity: "announcement",
    entityId: id,
    beforeData: { title: before.title },
  });

  res.status(204).end();
});

export default router;
