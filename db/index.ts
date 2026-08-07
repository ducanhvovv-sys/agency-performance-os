import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

let schemaReady: Promise<void> | null = null;

async function ensureRuntimeSchema() {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  if (schemaReady) return schemaReady;

  schemaReady = (async () => {
    await env.DB.batch([
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS tasks (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        title text NOT NULL,
        project text NOT NULL,
        department text NOT NULL,
        assignee text NOT NULL,
        due_date text NOT NULL,
        priority text DEFAULT 'normal' NOT NULL,
        weight integer DEFAULT 1 NOT NULL,
        status text DEFAULT 'pending' NOT NULL,
        created_by text DEFAULT 'Đức Anh' NOT NULL,
        blocked_reason text,
        source_type text DEFAULT 'manual' NOT NULL,
        source_id text,
        source_sheet text,
        source_row integer,
        content_type text,
        content_pillar text,
        asset_type text,
        sheet_status text,
        sheet_brief text,
        channel_status text DEFAULT 'not_checked' NOT NULL,
        post_url text,
        deliverable_url text,
        deliverable_type text,
        deliverable_note text,
        submitted_by text,
        submitted_at text,
        sync_state text DEFAULT 'app_only' NOT NULL,
        last_synced_at text,
        completed_at text,
        created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS integrations (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        kind text DEFAULT 'google_sheets' NOT NULL,
        name text NOT NULL,
        source_url text NOT NULL,
        source_file_id text,
        source_tab text DEFAULT '5. CHECKLIST CONTENT' NOT NULL,
        source_format text DEFAULT 'xlsm' NOT NULL,
        status text DEFAULT 'snapshot_ready' NOT NULL,
        bridge_url text,
        bridge_token text,
        mapping text,
        rows_imported integer DEFAULT 0 NOT NULL,
        last_synced_at text,
        created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS projects (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        name text NOT NULL,
        client text,
        channels text,
        deadline text,
        owner_id integer,
        owner_name text,
        contract_type text DEFAULT 'monthly' NOT NULL,
        status text DEFAULT 'active' NOT NULL,
        is_demo integer DEFAULT 1 NOT NULL,
        created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS channel_posts (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        platform text NOT NULL,
        integration_id integer,
        external_id text NOT NULL,
        title text,
        permalink text,
        project text,
        views integer DEFAULT 0 NOT NULL,
        likes integer DEFAULT 0 NOT NULL,
        comments integer DEFAULT 0 NOT NULL,
        shares integer DEFAULT 0 NOT NULL,
        retention integer,
        avg_watch integer,
        published_at text,
        fetched_at text,
        raw text,
        created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS task_reviews (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        task_id integer NOT NULL,
        assignee text,
        reviewer text DEFAULT 'Đức Anh' NOT NULL,
        quality_score integer NOT NULL,
        note text,
        created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS kpi_periods (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        month text NOT NULL,
        bonus_pool integer DEFAULT 0 NOT NULL,
        locked integer DEFAULT 0 NOT NULL,
        locked_at text,
        locked_by text,
        detail_snapshot text,
        created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS audit_logs (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        action text NOT NULL,
        entity text,
        entity_id text,
        detail text,
        actor text DEFAULT 'Đức Anh' NOT NULL,
        created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS app_users (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        email text NOT NULL,
        full_name text NOT NULL,
        password_hash text NOT NULL,
        password_salt text NOT NULL,
        role text DEFAULT 'staff' NOT NULL,
        employee_name text,
        status text DEFAULT 'active' NOT NULL,
        created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS sessions (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        token text NOT NULL,
        user_id integer NOT NULL,
        expires_at text NOT NULL,
        created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`),
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS employees (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        full_name text NOT NULL,
        email text,
        phone text,
        department text NOT NULL,
        role text NOT NULL,
        manager text,
        start_date text,
        status text DEFAULT 'active' NOT NULL,
        capacity_percent integer DEFAULT 100 NOT NULL,
        kpi_target integer DEFAULT 85 NOT NULL,
        is_demo integer DEFAULT 1 NOT NULL,
        created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`),
    ]);

    const info = await env.DB.prepare("PRAGMA table_info(tasks)").all<{ name: string }>();
    const columns = new Set((info.results || []).map((column) => column.name));
    const additions = [
      ["project_id", "ALTER TABLE tasks ADD COLUMN project_id integer"],
      ["source_type", "ALTER TABLE tasks ADD COLUMN source_type text DEFAULT 'manual' NOT NULL"],
      ["source_id", "ALTER TABLE tasks ADD COLUMN source_id text"],
      ["source_sheet", "ALTER TABLE tasks ADD COLUMN source_sheet text"],
      ["source_row", "ALTER TABLE tasks ADD COLUMN source_row integer"],
      ["content_type", "ALTER TABLE tasks ADD COLUMN content_type text"],
      ["content_pillar", "ALTER TABLE tasks ADD COLUMN content_pillar text"],
      ["asset_type", "ALTER TABLE tasks ADD COLUMN asset_type text"],
      ["sheet_status", "ALTER TABLE tasks ADD COLUMN sheet_status text"],
      ["sheet_brief", "ALTER TABLE tasks ADD COLUMN sheet_brief text"],
      ["channel_status", "ALTER TABLE tasks ADD COLUMN channel_status text DEFAULT 'not_checked' NOT NULL"],
      ["post_url", "ALTER TABLE tasks ADD COLUMN post_url text"],
      ["deliverable_url", "ALTER TABLE tasks ADD COLUMN deliverable_url text"],
      ["deliverable_type", "ALTER TABLE tasks ADD COLUMN deliverable_type text"],
      ["deliverable_note", "ALTER TABLE tasks ADD COLUMN deliverable_note text"],
      ["submitted_by", "ALTER TABLE tasks ADD COLUMN submitted_by text"],
      ["submitted_at", "ALTER TABLE tasks ADD COLUMN submitted_at text"],
      ["sync_state", "ALTER TABLE tasks ADD COLUMN sync_state text DEFAULT 'app_only' NOT NULL"],
      ["last_synced_at", "ALTER TABLE tasks ADD COLUMN last_synced_at text"],
      ["completed_at", "ALTER TABLE tasks ADD COLUMN completed_at text"],
    ].filter(([name]) => !columns.has(name));
    if (additions.length) await env.DB.batch(additions.map(([, statement]) => env.DB.prepare(statement)));

    const integrationInfo = await env.DB.prepare("PRAGMA table_info(integrations)").all<{ name: string }>();
    const integrationColumns = new Set((integrationInfo.results || []).map((column) => column.name));
    if (!integrationColumns.has("mapping")) {
      await env.DB.prepare("ALTER TABLE integrations ADD COLUMN mapping text").run();
    }

    // Nhiều sheet có thể trùng STT (source_id) → gắn tiền tố fileId::tab để không đè lên nhau.
    await env.DB.prepare(
      "UPDATE tasks SET source_id = '1YUpAQlbNHy_tKmmkeqiaSHQ3JRHYKcC8::5. CHECKLIST CONTENT::' || source_id WHERE source_type = 'google_sheet' AND source_id IS NOT NULL AND source_id NOT LIKE '%::%'",
    ).run();

    await env.DB.batch([
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS tasks_source_key ON tasks (source_type, source_id)"),
      env.DB.prepare("DROP INDEX IF EXISTS integrations_kind_key"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS integrations_source_key ON integrations (source_file_id, source_tab)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS channel_posts_key ON channel_posts (platform, external_id)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS employees_email_key ON employees (email)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS projects_name_key ON projects (name)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS kpi_periods_month_key ON kpi_periods (month)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_key ON app_users (email)"),
      env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS sessions_token_key ON sessions (token)"),
    ]);

    const employeeCount = await env.DB.prepare("SELECT COUNT(*) AS total FROM employees").first<{ total: number }>();
    if (!employeeCount?.total) {
      await env.DB.prepare(`INSERT INTO employees
        (full_name, department, role, manager, status, capacity_percent, kpi_target, is_demo)
        VALUES
        ('Minh Anh', 'Content', 'Content Creator', 'Đức Anh', 'active', 96, 85, 1),
        ('Tuấn Nam', 'Video', 'Video Editor', 'Đức Anh', 'active', 118, 85, 1),
        ('Thu Hà', 'Design', 'Graphic Designer', 'Đức Anh', 'active', 88, 85, 1),
        ('Quang Huy', 'Ads/Performance', 'Performance Executive', 'Đức Anh', 'active', 112, 85, 1),
        ('Lan Phương', 'Account', 'Account Executive', 'Đức Anh', 'active', 74, 85, 1),
        ('Hải Yến', 'Content', 'Content Creator', 'Minh Anh', 'on_leave', 0, 80, 1)`).run();
    }

    const projectCount = await env.DB.prepare("SELECT COUNT(*) AS total FROM projects").first<{ total: number }>();
    if (!projectCount?.total) {
      await env.DB.prepare(`INSERT INTO projects
        (name, client, channels, deadline, owner_name, contract_type, status, is_demo)
        VALUES
        ('Dược sĩ Giang', 'Kênh sức khỏe Đông y', 'Facebook · TikTok', '2026-08-31', 'Thu Hà', 'monthly', 'active', 1),
        ('ĐINH Cúng phẩm', 'Chiến dịch tháng 7 âm', 'Facebook · Landing page', '2026-08-18', 'Minh Anh', 'campaign', 'active', 1),
        ('ĐINH Scent', 'Ra mắt bộ quà tặng', 'TikTok · Facebook', '2026-08-12', 'Quang Huy', 'production', 'active', 1),
        ('Minh Trí Kinh Doanh', 'Chiến dịch khóa học AI', 'Facebook · Website', '2026-08-25', 'Tuấn Nam', 'campaign', 'active', 1),
        ('Agency Internal', 'Chuẩn hóa quy trình tháng 8', 'Nội bộ', '2026-08-29', 'Lan Phương', 'internal', 'active', 1),
        ('BIDV Gift', 'Bộ quà tặng khách hàng', 'Landing page · POSM', '2026-08-06', 'Hải Yến', 'production', 'active', 1)`).run();
    }

    await env.DB.prepare("UPDATE tasks SET project_id = (SELECT id FROM projects WHERE projects.name = tasks.project) WHERE project_id IS NULL AND project IS NOT NULL").run();
    await env.DB.prepare("UPDATE tasks SET completed_at = created_at WHERE status = 'done' AND completed_at IS NULL").run();
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });

  return schemaReady;
}

export async function getDb() {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  await ensureRuntimeSchema();

  return drizzle(env.DB, { schema });
}
