import { db } from "@workspace/db";
import { auditLogsTable } from "@workspace/db";

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
    await db.insert(auditLogsTable).values({
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
    // audit failure must never break the main request
  }
}
