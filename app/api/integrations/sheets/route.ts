import { and, desc, eq, like } from "drizzle-orm";
import { getDb } from "../../../../db";
import { integrations, tasks } from "../../../../db/schema";
import planRows from "../../../data/duoc-si-giang-plan.json";
import { requireUser } from "../../../lib/auth";

const LEGACY_URL = "https://docs.google.com/spreadsheets/d/1YUpAQlbNHy_tKmmkeqiaSHQ3JRHYKcC8/edit";
const LEGACY_ID = "1YUpAQlbNHy_tKmmkeqiaSHQ3JRHYKcC8";
const LEGACY_TAB = "5. CHECKLIST CONTENT";

type PlanRow = {
  sourceId: string;
  sourceRow: number;
  dueDate: string;
  pillar: string;
  contentType: string;
  publishTime: string;
  title: string;
  assetType: string;
  sheetStatus: string;
  brief: string;
};

// Configurable column mapping so mỗi sheet có cấu trúc riêng vẫn nạp được.
// Các chỉ số cột là 1-based (A=1, B=2, ...). idCol/statusCol bắt buộc; còn lại tùy chọn.
type ColumnMap = {
  sourceId: number;
  title: number;
  dueDate?: number;
  pillar?: number;
  contentType?: number;
  assetType?: number;
  brief?: number;
  sheetStatus: number;
};

type SheetMapping = {
  startRow: number;
  statusCol: number;
  idCol: number;
  columns: ColumnMap;
  statusMap: Record<string, string>;
  project: string;
  // Cột GHI ngược ra sheet (0/undefined = không ghi).
  deliverableCol?: number;
  postUrlCol?: number;
  // Nhân sự phụ trách sheet — task nhập về tự gán cho người này.
  owner?: string;
  // gid của tab (chế độ link CSV) để đọc lại đúng tab khi đồng bộ.
  gid?: string;
};

type BridgeRow = { rowNumber: number; cells: string[] };
type BridgeData = {
  error?: string;
  meta?: {
    spreadsheetId?: string;
    spreadsheetUrl?: string;
    spreadsheetName?: string;
    tab?: string;
    tabs?: string[];
    startRow?: number;
    lastColumn?: number;
  };
  headers?: string[];
  rows?: BridgeRow[];
};

type SyncPayload = {
  action?: "import_snapshot" | "connect_bridge" | "connect_link" | "sync_now" | "preview" | "remove";
  bridgeUrl?: string;
  bridgeToken?: string;
  linkUrl?: string;
  tab?: string;
  integrationId?: number;
  mapping?: Partial<SheetMapping>;
  name?: string;
};

// Tách fileId + gid từ link Google Sheets thông thường (không cần Apps Script).
function parseSheetLink(url: string): { fileId: string; gid: string } | null {
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch) return null;
  const gidMatch = url.match(/[#?&]gid=([0-9]+)/);
  return { fileId: idMatch[1], gid: gidMatch ? gidMatch[1] : "0" };
}

// Parser CSV chịu được dấu phẩy/xuống dòng trong ô có ngoặc kép.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; } else inQuotes = false;
      } else field += char;
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field); field = "";
    } else if (char === "\n") {
      row.push(field); rows.push(row); row = []; field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// Đọc trực tiếp qua endpoint xuất CSV của Google (yêu cầu sheet chia sẻ "Anyone with link · Viewer").
async function fetchSheetCsv(fileId: string, gid: string, startRow: number): Promise<BridgeData> {
  const url = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv&gid=${gid}`;
  const response = await fetch(url, { redirect: "follow", headers: { Accept: "text/csv" } });
  if (!response.ok) throw new Error("Không đọc được sheet. Hãy đặt Chia sẻ → “Bất kỳ ai có liên kết · Người xem”.");
  const text = await response.text();
  if (text.trimStart().startsWith("<")) {
    throw new Error("Sheet chưa công khai. Vào Chia sẻ → “Bất kỳ ai có liên kết · Người xem” rồi thử lại.");
  }
  const matrix = parseCsv(text);
  const headers = matrix.length ? matrix[0] : [];
  const rows = matrix
    .map((cells, index) => ({ rowNumber: index + 1, cells }))
    .filter((row) => row.rowNumber >= startRow);
  return { meta: { spreadsheetId: fileId, tab: `gid:${gid}`, lastColumn: headers.length }, headers, rows };
}

const DEFAULT_STATUS_MAP: Record<string, string> = {
  "Chưa viết": "todo",
  "Đang viết": "doing",
  "Đang thực hiện": "doing",
  "Chờ duyệt": "review",
  "Đã duyệt": "review",
  "Đã đăng bài": "done",
  Done: "done",
};

const DEFAULT_MAPPING: SheetMapping = {
  startRow: 5,
  statusCol: 12,
  idCol: 1,
  columns: { sourceId: 1, dueDate: 2, pillar: 3, contentType: 4, title: 5, assetType: 7, sheetStatus: 12 },
  statusMap: DEFAULT_STATUS_MAP,
  project: "Dược sĩ Giang",
};

function coerceMapping(raw: unknown): SheetMapping {
  const value = (raw && typeof raw === "object" ? raw : {}) as Partial<SheetMapping>;
  const columns = { ...DEFAULT_MAPPING.columns, ...(value.columns || {}) } as ColumnMap;
  const statusMap = value.statusMap && Object.keys(value.statusMap).length ? value.statusMap : DEFAULT_MAPPING.statusMap;
  return {
    startRow: Number(value.startRow) || DEFAULT_MAPPING.startRow,
    statusCol: Number(value.statusCol) || columns.sheetStatus || DEFAULT_MAPPING.statusCol,
    idCol: Number(value.idCol) || columns.sourceId || DEFAULT_MAPPING.idCol,
    columns,
    statusMap,
    project: (value.project && String(value.project).trim()) || DEFAULT_MAPPING.project,
    deliverableCol: Number(value.deliverableCol) || 0,
    postUrlCol: Number(value.postUrlCol) || 0,
    owner: (value.owner && String(value.owner).trim()) || "",
    gid: (value.gid && String(value.gid).trim()) || undefined,
  };
}

function readMapping(stored: string | null | undefined): SheetMapping {
  if (!stored) return DEFAULT_MAPPING;
  try {
    return coerceMapping(JSON.parse(stored));
  } catch {
    return DEFAULT_MAPPING;
  }
}

function sheetKey(fileId: string, tab: string) {
  return `${fileId}::${tab}`;
}

function makeSourceId(fileId: string, tab: string, rawId: string) {
  return `${sheetKey(fileId, tab)}::${rawId}`;
}

function cellAt(cells: string[], col?: number) {
  if (!col || col < 1) return "";
  return (cells[col - 1] ?? "").toString().trim();
}

function rowsFromBridge(data: BridgeData, mapping: SheetMapping): PlanRow[] {
  const rows = data.rows || [];
  return rows
    .map((row) => {
      const rawId = cellAt(row.cells, mapping.columns.sourceId) || String(row.rowNumber);
      const title = cellAt(row.cells, mapping.columns.title);
      const contentTypeRaw = cellAt(row.cells, mapping.columns.contentType);
      return {
        sourceId: rawId,
        sourceRow: row.rowNumber,
        dueDate: cellAt(row.cells, mapping.columns.dueDate),
        pillar: cellAt(row.cells, mapping.columns.pillar),
        contentType: contentTypeRaw.toUpperCase().includes("VIDEO") ? "VIDEO" : contentTypeRaw || "BÀI ẢNH",
        publishTime: "",
        title,
        assetType: cellAt(row.cells, mapping.columns.assetType),
        sheetStatus: cellAt(row.cells, mapping.columns.sheetStatus) || "Chưa viết",
        brief: cellAt(row.cells, mapping.columns.brief),
      } satisfies PlanRow;
    })
    .filter((row) => row.sourceId && (row.title || row.sheetStatus));
}

function normalizedRows(rows: PlanRow[], mapping: SheetMapping, fileId: string, tab: string, sheetName: string) {
  const syncedAt = new Date().toISOString();
  return rows.map((row) => ({
    title: row.title || `Task ${row.sourceId}`,
    project: mapping.project,
    department: row.contentType === "VIDEO" ? "Video" : "Design",
    assignee: mapping.owner?.trim() || "Chưa phân công",
    dueDate: row.dueDate || "Chưa có hạn",
    priority: "normal",
    weight: row.contentType === "VIDEO" ? 5 : 3,
    status: mapping.statusMap[row.sheetStatus] || "todo",
    createdBy: sheetName,
    sourceType: "google_sheet",
    sourceId: makeSourceId(fileId, tab, row.sourceId),
    sourceSheet: sheetName,
    sourceRow: row.sourceRow,
    contentType: row.contentType,
    contentPillar: row.pillar,
    assetType: row.assetType,
    sheetStatus: row.sheetStatus,
    sheetBrief: row.brief || null,
    channelStatus: "not_published",
    syncState: "synced",
    lastSyncedAt: syncedAt,
  }));
}

async function upsertRows(rows: ReturnType<typeof normalizedRows>) {
  const db = await getDb();
  const sourceIds = rows.map((row) => row.sourceId);
  const existingRows = sourceIds.length
    ? await db.select().from(tasks).where(eq(tasks.sourceType, "google_sheet")).limit(500)
    : [];
  const existingBySource = new Map(existingRows.map((row) => [row.sourceId, row]));
  const values = rows.map((row) => {
    const existing = existingBySource.get(row.sourceId);
    if (existing?.syncState === "app_newer" && existing.sheetStatus !== row.sheetStatus) {
      return { ...row, status: existing.status, syncState: "app_newer" };
    }
    return row;
  });
  const { env } = await import("cloudflare:workers");
  if (!env.DB) throw new Error("Kho dữ liệu chưa sẵn sàng.");
  const sql = `INSERT INTO tasks (
    title, project, department, assignee, due_date, priority, weight, status,
    created_by, source_type, source_id, source_sheet, source_row, content_type,
    content_pillar, asset_type, sheet_status, sheet_brief, channel_status, sync_state, last_synced_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(source_type, source_id) DO UPDATE SET
    title = excluded.title,
    due_date = excluded.due_date,
    content_type = excluded.content_type,
    content_pillar = excluded.content_pillar,
    asset_type = excluded.asset_type,
    sheet_status = excluded.sheet_status,
    sheet_brief = excluded.sheet_brief,
    status = excluded.status,
    department = excluded.department,
    weight = excluded.weight,
    project = excluded.project,
    source_sheet = excluded.source_sheet,
    source_row = excluded.source_row,
    sync_state = excluded.sync_state,
    last_synced_at = excluded.last_synced_at`;

  for (let index = 0; index < values.length; index += 40) {
    const statements = values.slice(index, index + 40).map((row) => env.DB.prepare(sql).bind(
      row.title, row.project, row.department, row.assignee, row.dueDate, row.priority,
      row.weight, row.status, row.createdBy, row.sourceType, row.sourceId, row.sourceSheet,
      row.sourceRow, row.contentType, row.contentPillar, row.assetType, row.sheetStatus,
      row.sheetBrief, row.channelStatus, row.syncState, row.lastSyncedAt,
    ));
    await env.DB.batch(statements);
  }
  return values.length;
}

async function readBridge(bridgeUrl: string, tab: string, mapping: SheetMapping, bridgeToken?: string | null) {
  const url = new URL(bridgeUrl);
  url.searchParams.set("action", "read");
  url.searchParams.set("tab", tab);
  url.searchParams.set("startRow", String(mapping.startRow));
  if (bridgeToken) url.searchParams.set("token", bridgeToken);
  const response = await fetch(url.toString(), { headers: { Accept: "application/json" }, redirect: "follow" });
  if (!response.ok) throw new Error("Google Sheet chưa phản hồi. Kiểm tra quyền Web App là “Anyone”.");
  const data = (await response.json()) as BridgeData;
  if (data.error) throw new Error(data.error === "invalid token" ? "Token trong Apps Script chưa trùng với token trên app." : data.error);
  if (!Array.isArray(data.rows)) throw new Error(`Cầu nối chưa trả về dữ liệu. Kiểm tra đúng tên tab “${tab}”.`);
  return data;
}

function integrationView(row: typeof integrations.$inferSelect) {
  const mapping = readMapping(row.mapping);
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    sourceUrl: row.sourceUrl,
    sourceFileId: row.sourceFileId,
    sourceTab: row.sourceTab,
    sourceFormat: row.sourceFormat,
    rowsImported: row.rowsImported,
    lastSyncedAt: row.lastSyncedAt,
    bridgeConfigured: Boolean(row.bridgeUrl),
    mapping,
  };
}

export async function GET(request: Request) {
  try {
    const guard = await requireUser(request);
    if ("response" in guard) return guard.response;
    const db = await getDb();
    const rawIntegrations = await db.select().from(integrations).where(eq(integrations.kind, "google_sheets")).orderBy(desc(integrations.updatedAt));
    const list = rawIntegrations.map(integrationView);
    const rows = await db.select().from(tasks).where(eq(tasks.sourceType, "google_sheet")).orderBy(desc(tasks.dueDate), desc(tasks.id)).limit(200);
    const summary = {
      total: rows.length,
      appDone: rows.filter((row) => row.status === "done").length,
      sheetDone: rows.filter((row) => row.sheetStatus === "Đã đăng bài" || row.sheetStatus === "Done").length,
      channelMatched: rows.filter((row) => row.channelStatus === "published").length,
      mismatches: rows.filter((row) => row.syncState === "app_newer" || row.syncState === "sheet_newer").length,
      sheetCount: list.length,
    };
    const primary = list[0];
    return Response.json({
      integrations: list,
      integration: primary ? { name: primary.name, status: primary.status, rowsImported: primary.rowsImported, lastSyncedAt: primary.lastSyncedAt, bridgeConfigured: primary.bridgeConfigured, sourceUrl: primary.sourceUrl, sourceFormat: primary.sourceFormat } : null,
      summary,
      rows: rows.slice(0, 80),
      source: {
        name: primary?.name || "PLAN_CONTENT_DUOC_SI_GIANG_V4_GIONG_NOI_THAT_30_NGAY.xlsm",
        format: primary?.sourceFormat || "xlsm",
        tab: primary?.sourceTab || LEGACY_TAB,
        availableRows: (planRows as PlanRow[]).length,
        url: primary?.sourceUrl || LEGACY_URL,
      },
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Không đọc được trạng thái đồng bộ." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const guard = await requireUser(request, "director");
    if ("response" in guard) return guard.response;
    const payload = (await request.json()) as SyncPayload;
    const db = await getDb();
    const now = new Date().toISOString();

    if (payload.action === "preview") {
      const mapping = coerceMapping(payload.mapping);
      // Chế độ dán link: đọc thẳng CSV, không cần Apps Script.
      if (payload.linkUrl) {
        const link = parseSheetLink(payload.linkUrl.trim());
        if (!link) return Response.json({ error: "Link không hợp lệ. Hãy dán link Google Sheets (…/spreadsheets/d/…)." }, { status: 400 });
        const data = await fetchSheetCsv(link.fileId, link.gid, mapping.startRow);
        return Response.json({
          ok: true,
          mode: "link",
          meta: data.meta,
          headers: data.headers || [],
          sample: (data.rows || []).slice(0, 6),
          mappedSample: rowsFromBridge(data, mapping).slice(0, 6),
        });
      }
      if (!payload.bridgeUrl || !/^https:\/\/(script\.google\.com|script\.googleusercontent\.com)\//.test(payload.bridgeUrl)) {
        return Response.json({ error: "URL phải là Google Apps Script Web App." }, { status: 400 });
      }
      const tab = payload.tab?.trim() || LEGACY_TAB;
      const data = await readBridge(payload.bridgeUrl, tab, mapping, payload.bridgeToken);
      return Response.json({
        ok: true,
        meta: data.meta,
        headers: data.headers || [],
        sample: (data.rows || []).slice(0, 6),
        mappedSample: rowsFromBridge(data, mapping).slice(0, 6),
      });
    }

    if (payload.action === "remove") {
      if (!payload.integrationId) return Response.json({ error: "Thiếu mã kết nối cần gỡ." }, { status: 400 });
      const [target] = await db.select().from(integrations).where(eq(integrations.id, payload.integrationId)).limit(1);
      if (!target) return Response.json({ error: "Không tìm thấy kết nối." }, { status: 404 });
      await db.delete(integrations).where(eq(integrations.id, payload.integrationId));
      // Gỡ kết nối thì xoá luôn task đã nạp từ nguồn đó (tránh để lại dữ liệu mồ côi/trùng lặp).
      let purged = 0;
      if (target.sourceFileId && target.sourceTab) {
        const res = await db.delete(tasks).where(and(eq(tasks.sourceType, "google_sheet"), like(tasks.sourceId, `${target.sourceFileId}::${target.sourceTab}::%`)));
        purged = (res as { meta?: { changes?: number } }).meta?.changes ?? 0;
      }
      return Response.json({ ok: true, removed: target.name, purged });
    }

    if (payload.action === "connect_bridge") {
      if (!payload.bridgeUrl || !/^https:\/\/(script\.google\.com|script\.googleusercontent\.com)\//.test(payload.bridgeUrl)) {
        return Response.json({ error: "URL phải là Google Apps Script Web App." }, { status: 400 });
      }
      const mapping = coerceMapping(payload.mapping);
      const requestedTab = payload.tab?.trim() || LEGACY_TAB;
      const data = await readBridge(payload.bridgeUrl, requestedTab, mapping, payload.bridgeToken);
      const fileId = data.meta?.spreadsheetId || LEGACY_ID;
      const tab = data.meta?.tab || requestedTab;
      const baseName = payload.name?.trim() || data.meta?.spreadsheetName || "Google Sheet";
      const sheetName = `${baseName} · ${tab}`;
      const parsed = rowsFromBridge(data, mapping);
      const count = await upsertRows(normalizedRows(parsed, mapping, fileId, tab, sheetName));

      const [matched] = await db.select().from(integrations).where(and(eq(integrations.sourceFileId, fileId), eq(integrations.sourceTab, tab))).limit(1);
      const record = {
        kind: "google_sheets",
        name: sheetName,
        sourceUrl: data.meta?.spreadsheetUrl || payload.bridgeUrl,
        sourceFileId: fileId,
        sourceTab: tab,
        sourceFormat: "google_sheets",
        status: "live_synced",
        bridgeUrl: payload.bridgeUrl,
        bridgeToken: payload.bridgeToken || null,
        mapping: JSON.stringify(mapping),
        rowsImported: count,
        lastSyncedAt: now,
        updatedAt: now,
      };
      if (matched) {
        await db.update(integrations).set(record).where(eq(integrations.id, matched.id));
      } else {
        await db.insert(integrations).values(record);
      }
      return Response.json({ ok: true, mode: "live", imported: count, name: sheetName, message: `Kết nối “${sheetName}” và đã đọc ${count} task.` });
    }

    if (payload.action === "connect_link") {
      if (!payload.linkUrl) return Response.json({ error: "Hãy dán link Google Sheets." }, { status: 400 });
      const link = parseSheetLink(payload.linkUrl.trim());
      if (!link) return Response.json({ error: "Link không hợp lệ. Hãy dán link Google Sheets (…/spreadsheets/d/…)." }, { status: 400 });
      const mapping = coerceMapping({ ...payload.mapping, gid: link.gid });
      const data = await fetchSheetCsv(link.fileId, link.gid, mapping.startRow);
      const fileId = link.fileId;
      const tab = `gid:${link.gid}`;
      const baseName = payload.name?.trim() || "Google Sheet (link)";
      const sheetName = `${baseName} · ${tab}`;
      const parsed = rowsFromBridge(data, mapping);
      const count = await upsertRows(normalizedRows(parsed, mapping, fileId, tab, sheetName));

      const [matched] = await db.select().from(integrations).where(and(eq(integrations.sourceFileId, fileId), eq(integrations.sourceTab, tab))).limit(1);
      const record = {
        kind: "google_sheets",
        name: sheetName,
        sourceUrl: payload.linkUrl.trim(),
        sourceFileId: fileId,
        sourceTab: tab,
        sourceFormat: "google_link",
        status: "link_readonly",
        bridgeUrl: null,
        bridgeToken: null,
        mapping: JSON.stringify(mapping),
        rowsImported: count,
        lastSyncedAt: now,
        updatedAt: now,
      };
      if (matched) {
        await db.update(integrations).set(record).where(eq(integrations.id, matched.id));
      } else {
        await db.insert(integrations).values(record);
      }
      return Response.json({ ok: true, mode: "link", imported: count, name: sheetName, message: `Đã đọc ${count} task từ link (một chiều).` });
    }

    if (payload.action === "sync_now") {
      const targets = payload.integrationId
        ? await db.select().from(integrations).where(eq(integrations.id, payload.integrationId)).limit(1)
        : await db.select().from(integrations).where(eq(integrations.kind, "google_sheets"));
      const live = targets.filter((row) => row.bridgeUrl);
      const linkTargets = targets.filter((row) => !row.bridgeUrl && row.sourceFormat === "google_link");
      if (live.length || linkTargets.length) {
        let total = 0;
        for (const target of live) {
          const mapping = readMapping(target.mapping);
          const data = await readBridge(target.bridgeUrl!, target.sourceTab, mapping, target.bridgeToken);
          const fileId = target.sourceFileId || LEGACY_ID;
          const parsed = rowsFromBridge(data, mapping);
          const count = await upsertRows(normalizedRows(parsed, mapping, fileId, target.sourceTab, target.name));
          total += count;
          await db.update(integrations).set({ status: "live_synced", rowsImported: count, lastSyncedAt: now, updatedAt: now }).where(eq(integrations.id, target.id));
        }
        for (const target of linkTargets) {
          const mapping = readMapping(target.mapping);
          const fileId = target.sourceFileId;
          if (!fileId) continue;
          const gid = mapping.gid || (target.sourceTab?.startsWith("gid:") ? target.sourceTab.slice(4) : "0");
          const data = await fetchSheetCsv(fileId, gid, mapping.startRow);
          const parsed = rowsFromBridge(data, mapping);
          const count = await upsertRows(normalizedRows(parsed, mapping, fileId, target.sourceTab, target.name));
          total += count;
          await db.update(integrations).set({ status: "link_readonly", rowsImported: count, lastSyncedAt: now, updatedAt: now }).where(eq(integrations.id, target.id));
        }
        return Response.json({ ok: true, mode: live.length ? "live" : "link", imported: total, sheets: live.length + linkTargets.length });
      }
    }

    // Fallback: snapshot import from bundled plan (legacy single sheet, không cần cầu nối).
    const mapping = DEFAULT_MAPPING;
    const parsed = planRows as PlanRow[];
    const sheetName = "PLAN CONTENT DƯỢC SĨ GIANG · 30 ngày";
    const count = await upsertRows(normalizedRows(parsed, mapping, LEGACY_ID, LEGACY_TAB, sheetName));
    const [existing] = await db.select().from(integrations).where(eq(integrations.sourceFileId, LEGACY_ID)).limit(1);
    const record = {
      kind: "google_sheets",
      name: sheetName,
      sourceUrl: LEGACY_URL,
      sourceFileId: LEGACY_ID,
      sourceTab: LEGACY_TAB,
      sourceFormat: "xlsm",
      status: "snapshot_synced",
      mapping: JSON.stringify(mapping),
      rowsImported: count,
      lastSyncedAt: now,
      updatedAt: now,
    };
    if (existing) {
      await db.update(integrations).set({ ...record, bridgeUrl: existing.bridgeUrl, bridgeToken: existing.bridgeToken }).where(eq(integrations.id, existing.id));
    } else {
      await db.insert(integrations).values(record);
    }
    return Response.json({ ok: true, mode: "snapshot", imported: count, message: `Đã nhập ${count} task từ plan.` });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Đồng bộ thất bại." }, { status: 500 });
  }
}
