import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { appUsers, auditLogs } from "../../../../db/schema";
import { createSession, sessionCookie, verifyPassword } from "../../../lib/auth";

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Lỗi không xác định";
  return message.includes("no such table")
    ? "Cơ sở dữ liệu đang được khởi tạo. Vui lòng thử lại sau ít phút."
    : message;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { email?: string; password?: string };
    const email = (payload.email || "").trim().toLowerCase();
    const password = payload.password || "";
    if (!email || !password) {
      return Response.json({ error: "Vui lòng nhập email và mật khẩu." }, { status: 400 });
    }

    const db = await getDb();
    const [user] = await db.select().from(appUsers).where(eq(appUsers.email, email)).limit(1);
    if (!user || user.status !== "active") {
      return Response.json({ error: "Email hoặc mật khẩu không đúng." }, { status: 401 });
    }

    const ok = await verifyPassword(password, user.passwordSalt, user.passwordHash);
    if (!ok) {
      return Response.json({ error: "Email hoặc mật khẩu không đúng." }, { status: 401 });
    }

    const session = await createSession(user.id);
    await db.insert(auditLogs).values({
      action: "auth_login",
      entity: "app_user",
      entityId: String(user.id),
      detail: `Đăng nhập: ${user.email}`,
      actor: user.fullName,
    });

    return Response.json(
      {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          employeeName: user.employeeName,
        },
      },
      { headers: { "Set-Cookie": sessionCookie(session.token, session.maxAgeSeconds) } }
    );
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
