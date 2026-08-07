import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { auditLogs, integrations, projects, taskReviews, tasks } from "../../../db/schema";
import { requireUser } from "../../lib/auth";

type TaskPayload = {
  id?: number;
  title?: string;
  project?: string;
  department?: string;
  assignee?: string;
  dueDate?: string;
  priority?: string;
  weight?: number;
  status?: string;
  createdBy?: string;
  blockedReason?: string;
  sourceType?: string;
  sourceId?: string;
  sourceSheet?: string;
  sourceRow?: number;
  contentType?: string;
  contentPillar?: string;
  assetType?: string;
  sheetStatus?: string;
  channelStatus?: string;
  postUrl?: string;
  deliverableUrl?: string;
  deliverableType?: string;
  deliverableNote?: string;
  syncState?: string;
  qualityScore?: number;
  qualityNote?: string;
};

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Lỗi không xác định";
  return message.includes("no such table")
    ? "Cơ sở dữ liệu đang được khởi tạo. Vui lòng thử lại sau ít phút."
    : message;
}

export async function GET(request: Request) {
  try {
    const guard = await requireUser(request);
    if ("response" in guard) return guard.response;
    const db = await getDb();
    const rows = await db
      .select()
      .from(tasks)
      .orderBy(desc(tasks.createdAt), desc(tasks.id))
      .limit(200);
    return Response.json({ tasks: rows });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const guard = await requireUser(request);
    if ("response" in guard) return guard.response;
    const payload = (await request.json()) as TaskPayload;
    const title = payload.title?.trim() ?? "";
    const project = payload.project?.trim() ?? "";
    const assignee = payload.assignee?.trim() ?? "";
    const dueDate = payload.dueDate?.trim() ?? "";

    if (!title || !project || !assignee || !dueDate) {
      return Response.json(
        { error: "Vui lòng nhập đủ tên việc, dự án, người phụ trách và deadline." },
        { status: 400 },
      );
    }

    const db = await getDb();
    const [linkedProject] = await db.select({ id: projects.id }).from(projects).where(eq(projects.name, project)).limit(1);
    const [task] = await db
      .insert(tasks)
      .values({
        title,
        project,
        projectId: linkedProject?.id ?? null,
        assignee,
        dueDate,
        department: payload.department?.trim() || "Content",
        priority: payload.priority || "normal",
        weight: Math.max(1, Math.min(8, Number(payload.weight) || 1)),
        status: payload.status || "pending",
        createdBy: payload.createdBy?.trim() || guard.user.fullName,
        blockedReason: payload.blockedReason?.trim() || null,
        sourceType: payload.sourceType || "manual",
        sourceId: payload.sourceId?.trim() || null,
        sourceSheet: payload.sourceSheet?.trim() || null,
        sourceRow: payload.sourceRow || null,
        contentType: payload.contentType?.trim() || null,
        contentPillar: payload.contentPillar?.trim() || null,
        assetType: payload.assetType?.trim() || null,
        sheetStatus: payload.sheetStatus?.trim() || null,
        channelStatus: payload.channelStatus || "not_checked",
        postUrl: payload.postUrl?.trim() || null,
        syncState: payload.syncState || "app_only",
      })
      .returning();

    return Response.json({ task }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const guard = await requireUser(request);
    if ("response" in guard) return guard.response;
    const payload = (await request.json()) as TaskPayload;
    if (!payload.id || (payload.status === undefined && payload.assignee === undefined && payload.postUrl === undefined && payload.deliverableUrl === undefined)) {
      return Response.json({ error: "Thiếu mã task hoặc nội dung cần cập nhật." }, { status: 400 });
    }

    const allowed = ["pending", "todo", "doing", "review", "done", "blocked"];
    if (payload.status !== undefined && !allowed.includes(payload.status)) {
      return Response.json({ error: "Trạng thái không hợp lệ." }, { status: 400 });
    }

    const db = await getDb();
    const appStatusToSheet: Record<string, string> = {
      pending: "Chờ duyệt kế hoạch",
      todo: "Chưa viết",
      doing: "Đang thực hiện",
      review: "Chờ duyệt",
      done: "Đã đăng bài",
      blocked: "Đang vướng",
    };
    const taskUpdate: Partial<typeof tasks.$inferInsert> = {};
    if (payload.status !== undefined) {
      taskUpdate.status = payload.status;
      taskUpdate.blockedReason = payload.blockedReason || null;
      taskUpdate.syncState = "app_newer";
      taskUpdate.completedAt = payload.status === "done" ? new Date().toISOString() : null;
    }
    if (payload.assignee !== undefined) taskUpdate.assignee = payload.assignee.trim() || "Chưa phân công";
    if (payload.postUrl !== undefined) {
      taskUpdate.postUrl = payload.postUrl.trim() || null;
      taskUpdate.channelStatus = payload.postUrl.trim().startsWith("http") ? "published" : "not_published";
    }
    if (payload.deliverableUrl !== undefined) {
      const url = payload.deliverableUrl.trim();
      taskUpdate.deliverableUrl = url || null;
      taskUpdate.deliverableType = url ? (payload.deliverableType?.trim() || "Khác") : null;
      taskUpdate.deliverableNote = url ? (payload.deliverableNote?.trim() || null) : null;
      taskUpdate.submittedBy = url ? guard.user.fullName : null;
      taskUpdate.submittedAt = url ? new Date().toISOString() : null;
    }
    let [task] = await db
      .update(tasks)
      .set(taskUpdate)
      .where(eq(tasks.id, payload.id))
      .returning();
    if (!task) return Response.json({ error: "Không tìm thấy task cần cập nhật." }, { status: 404 });

    if (payload.status === "done" && payload.qualityScore !== undefined) {
      const score = Math.max(1, Math.min(100, Math.round(Number(payload.qualityScore) || 0)));
      await db.insert(taskReviews).values({ taskId: task.id, assignee: task.assignee, reviewer: guard.user.fullName, qualityScore: score, note: payload.qualityNote?.trim() || null });
      await db.insert(auditLogs).values({ action: "task_reviewed", entity: "task", entityId: String(task.id), detail: `Chấm chất lượng ${score}/100 cho “${task.title}”`, actor: guard.user.fullName });
    } else if (payload.status !== undefined) {
      await db.insert(auditLogs).values({ action: "task_status", entity: "task", entityId: String(task.id), detail: `Đổi trạng thái “${task.title}” → ${payload.status}`, actor: guard.user.fullName });
    }

    if (payload.deliverableUrl !== undefined && payload.deliverableUrl.trim()) {
      await db.insert(auditLogs).values({ action: "task_deliverable", entity: "task", entityId: String(task.id), detail: `Bàn giao ${task.deliverableType || "sản phẩm"} cho “${task.title}”`, actor: guard.user.fullName });
    }

    // Có nội dung nào cần ghi ngược ra sheet không? (trạng thái / link sản phẩm / link bài đăng)
    const wantsWriteback =
      (payload.status !== undefined || payload.deliverableUrl !== undefined || payload.postUrl !== undefined) &&
      task?.sourceType === "google_sheet";
    let sheetWriteback = wantsWriteback ? "waiting_bridge" : "not_applicable";
    if (wantsWriteback && task.sourceId) {
      // source_id dạng "fileId::tab::rawId" → tìm đúng kết nối của sheet đó.
      const parts = task.sourceId.split("::");
      const fileId = parts.length >= 3 ? parts[0] : null;
      const tab = parts.length >= 3 ? parts[1] : null;
      const rawId = parts.length >= 3 ? parts.slice(2).join("::") : task.sourceId;
      const candidates = await db.select().from(integrations).where(eq(integrations.kind, "google_sheets"));
      const integration =
        (fileId && tab && candidates.find((row) => row.sourceFileId === fileId && row.sourceTab === tab)) ||
        candidates.find((row) => row.bridgeUrl) ||
        null;
      if (integration?.bridgeUrl) {
        let mapping: { statusCol?: number; startRow?: number; idCol?: number; deliverableCol?: number; postUrlCol?: number; statusMap?: Record<string, string> } = {};
        try { mapping = integration.mapping ? JSON.parse(integration.mapping) : {}; } catch { mapping = {}; }
        // Gom các ô cần ghi: trạng thái + link sản phẩm + link bài đăng (chỉ ghi cột đã khai báo).
        const writes: { col: number; value: string }[] = [];
        let sheetLabel: string | null = null;
        if (payload.status !== undefined && (mapping.statusCol || 12)) {
          const reverse = Object.entries(mapping.statusMap || {}).find(([, app]) => app === payload.status)?.[0];
          sheetLabel = reverse || appStatusToSheet[payload.status];
          writes.push({ col: Number(mapping.statusCol) || 12, value: sheetLabel });
        }
        if (payload.deliverableUrl !== undefined && mapping.deliverableCol) {
          writes.push({ col: Number(mapping.deliverableCol), value: task.deliverableUrl || "" });
        }
        if (payload.postUrl !== undefined && mapping.postUrlCol) {
          writes.push({ col: Number(mapping.postUrlCol), value: task.postUrl || "" });
        }
        if (writes.length) {
          try {
            const response = await fetch(integration.bridgeUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "write_cells",
                token: integration.bridgeToken,
                tab: integration.sourceTab,
                idCol: Number(mapping.idCol) || 1,
                startRow: Number(mapping.startRow) || 5,
                sourceId: rawId,
                rowNumber: task.sourceRow,
                sourceRow: task.sourceRow,
                writes,
                // Back-compat với cầu nối cũ (chỉ ghi 1 ô trạng thái).
                statusCol: Number(mapping.statusCol) || 12,
                status: sheetLabel ?? undefined,
              }),
            });
            if (response.ok) {
              const patch: Partial<typeof tasks.$inferInsert> = { syncState: "synced", lastSyncedAt: new Date().toISOString() };
              if (sheetLabel) patch.sheetStatus = sheetLabel;
              [task] = await db.update(tasks).set(patch).where(eq(tasks.id, task.id)).returning();
              sheetWriteback = "synced";
            } else {
              sheetWriteback = "bridge_error";
            }
          } catch {
            sheetWriteback = "bridge_error";
          }
        } else {
          sheetWriteback = "no_write_column";
        }
      }
    }

    return Response.json({ task, sheetWriteback });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
