import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { employees } from "../../../db/schema";
import { requireUser } from "../../lib/auth";

type EmployeePayload = {
  id?: number;
  fullName?: string;
  email?: string;
  phone?: string;
  department?: string;
  role?: string;
  manager?: string;
  startDate?: string;
  status?: string;
  capacityPercent?: number;
  kpiTarget?: number;
};

const allowedStatuses = ["active", "on_leave", "inactive"];

function clean(value?: string) {
  return value?.trim() || null;
}

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Lỗi không xác định";
  if (message.includes("UNIQUE constraint failed")) {
    return "Email này đã được dùng cho một nhân sự khác.";
  }
  return message;
}

export async function GET(request: Request) {
  try {
    const guard = await requireUser(request);
    if ("response" in guard) return guard.response;
    const db = await getDb();
    const rows = await db.select().from(employees).orderBy(asc(employees.fullName));
    return Response.json({ employees: rows });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const guard = await requireUser(request, "director");
    if ("response" in guard) return guard.response;
    const payload = (await request.json()) as EmployeePayload;
    const fullName = payload.fullName?.trim() || "";
    const department = payload.department?.trim() || "";
    const role = payload.role?.trim() || "";
    if (!fullName || !department || !role) {
      return Response.json({ error: "Vui lòng nhập họ tên, bộ phận và vị trí." }, { status: 400 });
    }

    const db = await getDb();
    const [employee] = await db.insert(employees).values({
      fullName,
      email: clean(payload.email),
      phone: clean(payload.phone),
      department,
      role,
      manager: clean(payload.manager),
      startDate: clean(payload.startDate),
      status: allowedStatuses.includes(payload.status || "") ? payload.status! : "active",
      capacityPercent: Math.max(0, Math.min(200, Number(payload.capacityPercent) || 100)),
      kpiTarget: Math.max(0, Math.min(100, Number(payload.kpiTarget) || 85)),
      isDemo: false,
      updatedAt: new Date().toISOString(),
    }).returning();

    return Response.json({ employee }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const guard = await requireUser(request, "director");
    if ("response" in guard) return guard.response;
    const payload = (await request.json()) as EmployeePayload;
    if (!payload.id) {
      return Response.json({ error: "Thiếu mã nhân sự." }, { status: 400 });
    }

    const update: Partial<typeof employees.$inferInsert> = {
      updatedAt: new Date().toISOString(),
      isDemo: false,
    };
    if (payload.fullName !== undefined) update.fullName = payload.fullName.trim();
    if (payload.email !== undefined) update.email = clean(payload.email);
    if (payload.phone !== undefined) update.phone = clean(payload.phone);
    if (payload.department !== undefined) update.department = payload.department.trim();
    if (payload.role !== undefined) update.role = payload.role.trim();
    if (payload.manager !== undefined) update.manager = clean(payload.manager);
    if (payload.startDate !== undefined) update.startDate = clean(payload.startDate);
    if (payload.status !== undefined && allowedStatuses.includes(payload.status)) update.status = payload.status;
    if (payload.capacityPercent !== undefined) update.capacityPercent = Math.max(0, Math.min(200, Number(payload.capacityPercent) || 0));
    if (payload.kpiTarget !== undefined) update.kpiTarget = Math.max(0, Math.min(100, Number(payload.kpiTarget) || 0));

    const db = await getDb();
    const [employee] = await db.update(employees).set(update).where(eq(employees.id, payload.id)).returning();
    if (!employee) return Response.json({ error: "Không tìm thấy nhân sự." }, { status: 404 });
    return Response.json({ employee });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
