import { pgTable, serial, integer, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { adminsTable } from "./admins";

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => adminsTable.id, { onDelete: "set null" }),
  userName: text("user_name").notNull().default(""),
  userPhone: text("user_phone").notNull().default(""),
  action: text("action").notNull(), // create | update | delete
  entity: text("entity").notNull(), // student | teacher | class | grade | attendance | subject
  entityId: integer("entity_id"),
  beforeData: jsonb("before_data"),
  afterData: jsonb("after_data"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AuditLog = typeof auditLogsTable.$inferSelect;
