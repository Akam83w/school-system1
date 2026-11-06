import { Router } from "express";
import { db } from "@workspace/db";
import { auditLogsTable } from "@workspace/db";
import { desc, eq, and } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthUser } from "../middlewares/auth";
const router = Router();
router.get("/audit-logs", requireAuth, requireAdmin, async (req, res) => {
  const user = (req as any).user as AuthUser; const { action, entity, limit } = req.query;
  const conditions: any[] = [eq(auditLogsTable.schoolId, user.schoolId!)];
  if (action) conditions.push(eq(auditLogsTable.action, String(action)));
  if (entity) conditions.push(eq(auditLogsTable.entity, String(entity)));
  const safeLimit = Math.min(1000, Math.max(1, Number(limit) || 500));
  const rows = await db.select().from(auditLogsTable).where(and(...conditions)).orderBy(desc(auditLogsTable.createdAt)).limit(safeLimit);
  res.json(rows);
});
export default router;
