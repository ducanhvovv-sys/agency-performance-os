import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  project: text("project").notNull(),
  department: text("department").notNull(),
  assignee: text("assignee").notNull(),
  dueDate: text("due_date").notNull(),
  priority: text("priority").notNull().default("normal"),
  weight: integer("weight").notNull().default(1),
  status: text("status").notNull().default("pending"),
  createdBy: text("created_by").notNull().default("Đức Anh"),
  blockedReason: text("blocked_reason"),
  projectId: integer("project_id"),
  sourceType: text("source_type").notNull().default("manual"),
  sourceId: text("source_id"),
  sourceSheet: text("source_sheet"),
  sourceRow: integer("source_row"),
  contentType: text("content_type"),
  contentPillar: text("content_pillar"),
  assetType: text("asset_type"),
  sheetStatus: text("sheet_status"),
  sheetBrief: text("sheet_brief"),
  channelStatus: text("channel_status").notNull().default("not_checked"),
  postUrl: text("post_url"),
  deliverableUrl: text("deliverable_url"),
  deliverableType: text("deliverable_type"),
  deliverableNote: text("deliverable_note"),
  submittedBy: text("submitted_by"),
  submittedAt: text("submitted_at"),
  syncState: text("sync_state").notNull().default("app_only"),
  lastSyncedAt: text("last_synced_at"),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  sourceKey: uniqueIndex("tasks_source_key").on(table.sourceType, table.sourceId),
}));

export const integrations = sqliteTable("integrations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kind: text("kind").notNull().default("google_sheets"),
  name: text("name").notNull(),
  sourceUrl: text("source_url").notNull(),
  sourceFileId: text("source_file_id"),
  sourceTab: text("source_tab").notNull().default("5. CHECKLIST CONTENT"),
  sourceFormat: text("source_format").notNull().default("xlsm"),
  status: text("status").notNull().default("snapshot_ready"),
  bridgeUrl: text("bridge_url"),
  bridgeToken: text("bridge_token"),
  mapping: text("mapping"),
  rowsImported: integer("rows_imported").notNull().default(0),
  lastSyncedAt: text("last_synced_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  sourceKey: uniqueIndex("integrations_source_key").on(table.sourceFileId, table.sourceTab),
}));

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  client: text("client"),
  channels: text("channels"),
  deadline: text("deadline"),
  ownerId: integer("owner_id"),
  ownerName: text("owner_name"),
  contractType: text("contract_type").notNull().default("monthly"),
  status: text("status").notNull().default("active"),
  isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  nameKey: uniqueIndex("projects_name_key").on(table.name),
}));

export const channelPosts = sqliteTable("channel_posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  platform: text("platform").notNull(),
  integrationId: integer("integration_id"),
  externalId: text("external_id").notNull(),
  title: text("title"),
  permalink: text("permalink"),
  project: text("project"),
  views: integer("views").notNull().default(0),
  likes: integer("likes").notNull().default(0),
  comments: integer("comments").notNull().default(0),
  shares: integer("shares").notNull().default(0),
  retention: integer("retention"),
  avgWatch: integer("avg_watch"),
  publishedAt: text("published_at"),
  fetchedAt: text("fetched_at"),
  raw: text("raw"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  postKey: uniqueIndex("channel_posts_key").on(table.platform, table.externalId),
}));

export const taskReviews = sqliteTable("task_reviews", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id").notNull(),
  assignee: text("assignee"),
  reviewer: text("reviewer").notNull().default("Đức Anh"),
  qualityScore: integer("quality_score").notNull(),
  note: text("note"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const kpiPeriods = sqliteTable("kpi_periods", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  month: text("month").notNull(),
  bonusPool: integer("bonus_pool").notNull().default(0),
  locked: integer("locked", { mode: "boolean" }).notNull().default(false),
  lockedAt: text("locked_at"),
  lockedBy: text("locked_by"),
  detailSnapshot: text("detail_snapshot"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  monthKey: uniqueIndex("kpi_periods_month_key").on(table.month),
}));

export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  action: text("action").notNull(),
  entity: text("entity"),
  entityId: text("entity_id"),
  detail: text("detail"),
  actor: text("actor").notNull().default("Đức Anh"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const appUsers = sqliteTable("app_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull(),
  fullName: text("full_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  role: text("role").notNull().default("staff"),
  employeeName: text("employee_name"),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  emailKey: uniqueIndex("app_users_email_key").on(table.email),
}));

export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  token: text("token").notNull(),
  userId: integer("user_id").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  tokenKey: uniqueIndex("sessions_token_key").on(table.token),
}));

export const employees = sqliteTable("employees", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fullName: text("full_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  department: text("department").notNull(),
  role: text("role").notNull(),
  manager: text("manager"),
  startDate: text("start_date"),
  status: text("status").notNull().default("active"),
  capacityPercent: integer("capacity_percent").notNull().default(100),
  kpiTarget: integer("kpi_target").notNull().default(85),
  isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  emailKey: uniqueIndex("employees_email_key").on(table.email),
}));
