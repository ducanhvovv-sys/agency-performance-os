import { getDb } from "../../../../db";
import { appUsers, auditLogs } from "../../../../db/schema";
import { countUsers, createSession, hashPassword, sessionCookie } from "../../../lib/auth";

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Lỗi không xác định";
  return message.includes("no such table")
    ? "Cơ sở dữ liệu đang được khởi tạo. Vui lòng thử lại sau ít phút."
    : message;
}

/**
 * Bootstrap the very first account. This endpoint only works when there are no
 * users yet — the first person to register becomes the Giám đốc (director).
 * After that, further accounts must be created by a director via /api/auth/users.
 */
export async function POST(request: Request) {
  try {
    const total = await countUsers();
    if (total > 0) {
      return Response.json(
        { error: "Hệ thống đã có tài khoản. Vui lòng nhờ Giám đốc tạo tài khoản cho bạn." },
        { status: 403 }
      );
    }

    const payload = (await request.json()) as {
      email?: string;
      password?: string;
      fullName?: string;
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
    const [user] = await db
      .insert(appUsers)
      .values({
        email,
        fullName,
        passwordHash: hash,
        passwordSalt: salt,
        role: "director",
        status: "active",
        updatedAt: new Date().toISOString(),
      })
      .returning();

    const session = await createSession(user.id);
    await db.insert(auditLogs).values({
      action: "auth_bootstrap",
      entity: "app_user",
      entityId: String(user.id),
      detail: `Khởi tạo tài khoản Giám đốc: ${user.email}`,
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
