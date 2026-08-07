import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { projects } from "../../../db/schema";
import { requireUser } from "../../lib/auth";

type ProjectPayload = {
  id?: number;
  name?: string;
  client?: string;
  channels?: string;
  deadline?: string;
  ownerName?: string;
  ownerId?: number;
  contractType?: string;
  status?: string;
};

const allowedStatuses = ["active", "paused", "done"];

function clean(value?: string) {
  return value?.trim() || null;
}

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Lỗi không xác định";
  if (message.includes("UNIQUE constraint failed")) {
    return "Đã có dự án trùng tên. Vui lòng đặt tên khác.";
  }
  return message.includes("no such table")
    ? "Cơ sở dữ liệu đang được khởi tạo. Vui lòng thử lại sau ít phút."
    : message;
}

function parseDeadline(value?: string | null): number | null {
  if (!value) return null;
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const dmy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) return Date.UTC(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  return null;
}

function health(progress: number, deadline?: string | null): { status: "good" | "warning" | "risk"; statusLabel: string } {
  const due = parseDeadline(deadline);
  const overdue = due !== null && due < Date.now() && progress < 100;
  if (progress >= 100) return { status: "good", statusLabel: "Hoàn thành" };
  if (overdue) return { status: "risk", statusLabel: "Quá hạn" };
  if (progress >= 75) return { status: "good", statusLabel: "Đúng tiến độ" };
  if (progress >= 45) return { status: "warning", statusLabel: "Cần chú ý" };
  return { status: "risk", statusLabel: "Có nguy cơ" };
}

export async function GET(request: Request) {
  try {
    const guard = await requireUser(request);
    if ("response" in guard) return guard.response;
    const db = await getDb();
    const rows = await db.select().from(projects).orderBy(asc(projects.name));
    const { env } = await import("cloudflare:workers");
    const counts = await env.DB.prepare(
      "SELECT project AS name, COUNT(*) AS total, SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done FROM tasks GROUP BY project",
    ).all<{ name: string; total: number; done: number }>();
    const countByName = new Map((counts.results || []).map((row) => [row.name, row]));
    const enriched = rows.map((project) => {
      const stat = countByName.get(project.name);
      const total = Number(stat?.total || 0);
      const done = Number(stat?.done || 0);
      const progress = total ? Math.round((done / total) * 100) : 0;
      return {
        ...project,
        owner: project.ownerName || "Chưa phân công",
        progress,
        doneTasks: done,
        totalTasks: total,
        tasksLabel: `${done}/${total} task`,
        ...health(progress, project.deadline),
      };
    });
    return Response.json({ projects: enriched });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const guard = await requireUser(request, "director");
    if ("response" in guard) return guard.response;
    const payload = (await request.json()) as ProjectPayload;
    const name = payload.name?.trim() || "";
    if (!name) {
      return Response.json({ error: "Vui lòng nhập tên dự án." }, { status: 400 });
    }

    const db = await getDb();
    const [project] = await db.insert(projects).values({
      name,
      client: clean(payload.client),
      channels: clean(payload.channels),
      deadline: clean(payload.deadline),
      ownerName: clean(payload.ownerName),
      ownerId: payload.ownerId || null,
      contractType: payload.contractType?.trim() || "monthly",
      status: allowedStatuses.includes(payload.status || "") ? payload.status! : "active",
      isDemo: false,
      updatedAt: new Date().toISOString(),
    }).returning();

    return Response.json({ project }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const guard = await requireUser(request, "director");
    if ("response" in guard) return guard.response;
    const payload = (await request.json()) as ProjectPayload;
    if (!payload.id) {
      return Response.json({ error: "Thiếu mã dự án." }, { status: 400 });
    }

    const update: Partial<typeof projects.$inferInsert> = {
      updatedAt: new Date().toISOString(),
      isDemo: false,
    };
    if (payload.name !== undefined) {
      const name = payload.name.trim();
      if (!name) return Response.json({ error: "Tên dự án không được để trống." }, { status: 400 });
      update.name = name;
    }
    if (payload.client !== undefined) update.client = clean(payload.client);
    if (payload.channels !== undefined) update.channels = clean(payload.channels);
    if (payload.deadline !== undefined) update.deadline = clean(payload.deadline);
    if (payload.ownerName !== undefined) update.ownerName = clean(payload.ownerName);
    if (payload.ownerId !== undefined) update.ownerId = payload.ownerId || null;
    if (payload.contractType !== undefined) update.contractType = payload.contractType.trim() || "monthly";
    if (payload.status !== undefined && allowedStatuses.includes(payload.status)) update.status = payload.status;

    const db = await getDb();
    const [project] = await db.update(projects).set(update).where(eq(projects.id, payload.id)).returning();
    if (!project) return Response.json({ error: "Không tìm thấy dự án." }, { status: 404 });
    return Response.json({ project });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
