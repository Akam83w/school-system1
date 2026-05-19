import { Router } from "express";
import { db } from "@workspace/db";
import { auditLogsTable } from "@workspace/db";
import { desc, eq, and } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router = Router();

// GET /audit-logs — admin only
router.get("/audit-logs", requireAuth, requireAdmin, async (req, res) => {
  const { action, entity, limit } = req.query;
  const conditions: any[] = [];
  if (action) conditions.push(eq(auditLogsTable.action, String(action)));
  if (entity) conditions.push(eq(auditLogsTable.entity, String(entity)));

  const rows = await db
    .select()
    .from(auditLogsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(limit ? Number(limit) : 500);

  res.json(rows);
});

export default router;
