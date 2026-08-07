import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { auditLogs, kpiPeriods } from "../../../db/schema";
import { computePerformance, distributeRewards } from "../../lib/performance";
import { requireUser } from "../../lib/auth";

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Lỗi không xác định";
  return message.includes("no such table")
    ? "Cơ sở dữ liệu đang được khởi tạo. Vui lòng thử lại sau ít phút."
    : message;
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function ensurePeriod(db: Awaited<ReturnType<typeof getDb>>, month: string) {
  const [existing] = await db.select().from(kpiPeriods).where(eq(kpiPeriods.month, month)).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(kpiPeriods).values({ month, bonusPool: 0, updatedAt: new Date().toISOString() }).returning();
  return created;
}

type Snapshot = { name: string; kpi: number; reward: number };

async function buildResponse(period: typeof kpiPeriods.$inferSelect) {
  const { people, summary } = await computePerformance();
  const locked = period.locked;
  const snapshot: Snapshot[] | null = period.lockedBy && period.detailSnapshot ? safeParse(period.detailSnapshot) : null;
  const rewards = locked && snapshot ? snapshot : distributeRewards(people, period.bonusPool);
  return {
    period: { month: period.month, bonusPool: period.bonusPool, locked, lockedAt: period.lockedAt },
    rewards,
    companyKpi: summary.companyKpi,
  };
}

function safeParse(value: string): Snapshot[] | null {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const guard = await requireUser(request);
    if ("response" in guard) return guard.response;
    const db = await getDb();
    const period = await ensurePeriod(db, currentMonthKey());
    return Response.json(await buildResponse(period));
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const guard = await requireUser(request, "director");
    if ("response" in guard) return guard.response;
    const actor = guard.user.fullName;
    const payload = (await request.json()) as { bonusPool?: number; action?: "lock" | "unlock" };
    const db = await getDb();
    const month = currentMonthKey();
    let period = await ensurePeriod(db, month);

    if (payload.action === "lock") {
      if (period.locked) return Response.json({ error: "Kỳ thưởng đã được khóa." }, { status: 400 });
      const { people } = await computePerformance();
      const rewards = distributeRewards(people, period.bonusPool);
      [period] = await db
        .update(kpiPeriods)
        .set({ locked: true, lockedAt: new Date().toISOString(), lockedBy: actor, detailSnapshot: JSON.stringify(rewards), updatedAt: new Date().toISOString() })
        .where(eq(kpiPeriods.id, period.id))
        .returning();
      await db.insert(auditLogs).values({ action: "period_locked", entity: "kpi_period", entityId: month, detail: `Khóa kỳ thưởng ${month} · quỹ ${period.bonusPool.toLocaleString("vi-VN")}đ`, actor });
      return Response.json(await buildResponse(period));
    }

    if (payload.action === "unlock") {
      [period] = await db
        .update(kpiPeriods)
        .set({ locked: false, lockedAt: null, lockedBy: null, detailSnapshot: null, updatedAt: new Date().toISOString() })
        .where(eq(kpiPeriods.id, period.id))
        .returning();
      await db.insert(auditLogs).values({ action: "period_unlocked", entity: "kpi_period", entityId: month, detail: `Mở lại kỳ thưởng ${month}`, actor });
      return Response.json(await buildResponse(period));
    }

    if (payload.bonusPool !== undefined) {
      if (period.locked) return Response.json({ error: "Kỳ thưởng đã khóa, không thể đổi quỹ." }, { status: 400 });
      const pool = Math.max(0, Math.round(Number(payload.bonusPool) || 0));
      [period] = await db.update(kpiPeriods).set({ bonusPool: pool, updatedAt: new Date().toISOString() }).where(eq(kpiPeriods.id, period.id)).returning();
      await db.insert(auditLogs).values({ action: "period_pool_set", entity: "kpi_period", entityId: month, detail: `Đặt quỹ thưởng ${month} = ${pool.toLocaleString("vi-VN")}đ`, actor });
      return Response.json(await buildResponse(period));
    }

    return Response.json({ error: "Không có thay đổi hợp lệ." }, { status: 400 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
