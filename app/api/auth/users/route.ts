import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { appUsers, auditLogs } from "../../../../db/schema";
import { hashPassword, requireUser, type Role } from "../../../lib/auth";

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Lỗi không xác định";
  if (message.includes("no such table")) {
    return "Cơ sở dữ liệu đang được khởi tạo. Vui lòng thử lại sau ít phút.";
  }
  if (message.includes("UNIQUE") || message.includes("app_users_email_key")) {
    return "Email này đã được sử dụng.";
  }
  return message;
}

function normalizeRole(value: unknown): Role {
  return value === "director" ? "director" : "staff";
}

export async function GET(request: Request) {
  try {
    const guard = await requireUser(request, "director");
    if ("response" in guard) return guard.response;

    const db = await getDb();
    const rows = await db
      .select({
        id: appUsers.id,
        email: appUsers.email,
        fullName: appUsers.fullName,
        role: appUsers.role,
        employeeName: appUsers.employeeName,
        status: appUsers.status,
        createdAt: appUsers.createdAt,
      })
      .from(appUsers)
      .orderBy(appUsers.createdAt);
    return Response.json({ users: rows });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const guard = await requireUser(request, "director");
    if ("response" in guard) return guard.response;

    const payload = (await request.json()) as {
      email?: string;
      password?: string;
      fullName?: string;
      role?: string;
      employeeName?: string;
    };
    const email = (payload.email || "").trim().toLowerCase();
    const password = payload.password || "";
    const fullName = (payload.fullName || "").trim();
    if (!email || !password || !fullName) {
      return Response.json({ error: "Vui lòng nhập đủ họ tên, email và mật khẩu." }, { status: 400 });
    }
    if (password.length < 6) {
      return Response.json({ error: "Mật khẩu cần tối thiểu 6 ký tự." }, { status: 400 });
    }

    const db = await getDb();
    const { hash, salt } = await hashPassword(password);
    const role = normalizeRole(payload.role);
    const [user] = await db
      .insert(appUsers)
      .values({
        email,
        fullName,
        passwordHash: hash,
        passwordSalt: salt,
        role,
        employeeName: (payload.employeeName || "").trim() || null,
        status: "active",
        updatedAt: new Date().toISOString(),
      })
      .returning();

    await db.insert(auditLogs).values({
      action: "user_created",
      entity: "app_user",
      entityId: String(user.id),
      detail: `Tạo tài khoản ${role === "director" ? "Giám đốc" : "Nhân viên"}: ${user.email}`,
      actor: guard.user.fullName,
    });

    return Response.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        employeeName: user.employeeName,
        status: user.status,
      },
    });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const guard = await requireUser(request, "director");
    if ("response" in guard) return guard.response;

    const payload = (await request.json()) as {
      id?: number;
      status?: string;
      role?: string;
      password?: string;
    };
    const id = Number(payload.id);
    if (!id) return Response.json({ error: "Thiếu mã tài khoản." }, { status: 400 });

    const db = await getDb();
    const [target] = await db.select().from(appUsers).where(eq(appUsers.id, id)).limit(1);
    if (!target) return Response.json({ error: "Không tìm thấy tài khoản." }, { status: 404 });

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    const notes: string[] = [];

    if (payload.status === "active" || payload.status === "disabled") {
      if (payload.status === "disabled" && target.id === guard.user.id) {
        return Response.json({ error: "Không thể tự khóa tài khoản của chính mình." }, { status: 400 });
      }
      updates.status = payload.status;
      notes.push(payload.status === "disabled" ? "khóa truy cập" : "mở truy cập");
    }

    if (payload.role === "director" || payload.role === "staff") {
      if (target.id === guard.user.id && payload.role !== "director") {
        return Response.json({ error: "Không thể tự hạ quyền của chính mình." }, { status: 400 });
      }
      updates.role = payload.role;
      notes.push(`đổi quyền → ${payload.role === "director" ? "Giám đốc" : "Nhân viên"}`);
    }

    if (payload.password) {
      if (payload.password.length < 6) {
        return Response.json({ error: "Mật khẩu cần tối thiểu 6 ký tự." }, { status: 400 });
      }
      const { hash, salt } = await hashPassword(payload.password);
      updates.passwordHash = hash;
      updates.passwordSalt = salt;
      notes.push("đặt lại mật khẩu");
    }

    if (notes.length === 0) {
      return Response.json({ error: "Không có thay đổi hợp lệ." }, { status: 400 });
    }

    const [user] = await db.update(appUsers).set(updates).where(eq(appUsers.id, id)).returning();
    await db.insert(auditLogs).values({
      action: "user_updated",
      entity: "app_user",
      entityId: String(id),
      detail: `Cập nhật ${user.email}: ${notes.join(", ")}`,
      actor: guard.user.fullName,
    });

    return Response.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        employeeName: user.employeeName,
        status: user.status,
      },
    });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
