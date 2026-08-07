import { computePerformance } from "../../lib/performance";
import { requireUser } from "../../lib/auth";

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
    const { people, summary } = await computePerformance();
    return Response.json({ people, summary });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
