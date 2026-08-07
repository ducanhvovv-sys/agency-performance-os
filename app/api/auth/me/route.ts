import { countUsers, getSessionUser } from "../../../lib/auth";

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Lỗi không xác định";
  return message.includes("no such table")
    ? "Cơ sở dữ liệu đang được khởi tạo. Vui lòng thử lại sau ít phút."
    : message;
}

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      // Report whether the system still needs its first (bootstrap) account so
      // the UI can show the "create director" flow instead of the login form.
      const total = await countUsers();
      return Response.json({ user: null, needsBootstrap: total === 0 });
    }
    return Response.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        employeeName: user.employeeName,
      },
      needsBootstrap: false,
    });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
