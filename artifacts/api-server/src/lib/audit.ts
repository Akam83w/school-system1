import { db } from "@workspace/db";
import { auditLogsTable, adminsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function logAudit(opts: {
  userId: number;
  userName: string;
  userPhone: string;
  action: "create" | "update" | "delete";
  entity: string;
  entityId?: number | null;
  beforeData?: unknown;
  afterData?: unknown;
}) {
  try {
    const [actor] = await db.select({ schoolId: adminsTable.schoolId }).from(adminsTable)
      .where(eq(adminsTable.id, opts.userId)).limit(1);
    if (!actor?.schoolId) return;
    await db.insert(auditLogsTable).values({
      schoolId: actor.schoolId,
      userId: opts.userId,
      userName: opts.userName,
      userPhone: opts.userPhone,
      action: opts.action,
      entity: opts.entity,
      entityId: opts.entityId ?? null,
      beforeData: (opts.beforeData ?? null) as any,
      afterData: (opts.afterData ?? null) as any,
    });
  } catch {
    // Audit logging must not break the primary operation.
  }
}
