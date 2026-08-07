import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import { employees } from "../../db/schema";

export type PerformanceRow = {
  id: number;
  rank: number;
  name: string;
  role: string;
  department: string;
  doneTasks: number;
  totalTasks: number;
  doneWeight: number;
  activeWeight: number;
  volumeScore: number;
  deadlineScore: number | null;
  kpi: number;
  capacityPercent: number;
  kpiTarget: number;
  quality: number | null;
  outcome: null;
};

export type PerformanceSummary = {
  companyKpi: number;
  doneThisPeriod: number;
  overloadedCount: number;
  headcount: number;
  qualityReady: boolean;
  outcomeReady: boolean;
};

type Aggregate = { assignee: string; total: number; doneCount: number; doneWeight: number; activeWeight: number };
type DoneRow = { assignee: string; dueDate: string | null; completedAt: string | null };

function parseDate(value?: string | null): number | null {
  if (!value) return null;
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const dmy = value.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
  if (dmy) return Date.UTC(Number(dmy[3]) || new Date().getUTCFullYear(), Number(dmy[2]) - 1, Number(dmy[1]));
  return null;
}

export async function computePerformance(): Promise<{ people: PerformanceRow[]; summary: PerformanceSummary }> {
  const db = await getDb();
  const activeEmployees = await db.select().from(employees).where(eq(employees.status, "active"));
  const { env } = await import("cloudflare:workers");

  const aggregates = await env.DB.prepare(
    `SELECT assignee,
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS doneCount,
      SUM(CASE WHEN status = 'done' THEN weight ELSE 0 END) AS doneWeight,
      SUM(CASE WHEN status IN ('todo','doing','review') THEN weight ELSE 0 END) AS activeWeight
    FROM tasks GROUP BY assignee`,
  ).all<Aggregate>();
  const aggByName = new Map((aggregates.results || []).map((row) => [row.assignee, row]));

  const qualityRows = await env.DB.prepare(
    "SELECT assignee, AVG(quality_score) AS avgQuality FROM task_reviews GROUP BY assignee",
  ).all<{ assignee: string; avgQuality: number }>();
  const qualityByName = new Map((qualityRows.results || []).map((row) => [row.assignee, Math.round(Number(row.avgQuality))]));

  const doneRows = await env.DB.prepare(
    "SELECT assignee, due_date AS dueDate, completed_at AS completedAt FROM tasks WHERE status = 'done'",
  ).all<DoneRow>();
  const deadlineByName = new Map<string, { onTime: number; rated: number }>();
  for (const row of doneRows.results || []) {
    const due = parseDate(row.dueDate);
    const done = parseDate(row.completedAt);
    if (due === null || done === null) continue;
    const entry = deadlineByName.get(row.assignee) || { onTime: 0, rated: 0 };
    entry.rated += 1;
    if (done <= due) entry.onTime += 1;
    deadlineByName.set(row.assignee, entry);
  }

  const maxDoneWeight = Math.max(
    1,
    ...activeEmployees.map((employee) => Number(aggByName.get(employee.fullName)?.doneWeight || 0)),
  );

  const rows = activeEmployees.map((employee) => {
    const agg = aggByName.get(employee.fullName);
    const doneWeight = Number(agg?.doneWeight || 0);
    const doneTasks = Number(agg?.doneCount || 0);
    const totalTasks = Number(agg?.total || 0);
    const activeWeight = Number(agg?.activeWeight || 0);
    const deadline = deadlineByName.get(employee.fullName);
    const deadlineScore = deadline && deadline.rated ? Math.round((deadline.onTime / deadline.rated) * 100) : null;
    const volumeScore = Math.round((doneWeight / maxDoneWeight) * 100);
    const quality = qualityByName.has(employee.fullName) ? qualityByName.get(employee.fullName)! : null;
    const components = [
      volumeScore,
      ...(deadlineScore !== null ? [deadlineScore] : []),
      ...(quality !== null ? [quality] : []),
    ];
    const kpi = components.length ? Math.round(components.reduce((sum, value) => sum + value, 0) / components.length) : 0;
    return {
      id: employee.id,
      name: employee.fullName,
      role: employee.role,
      department: employee.department,
      doneTasks,
      totalTasks,
      doneWeight,
      activeWeight,
      volumeScore,
      deadlineScore,
      kpi,
      capacityPercent: employee.capacityPercent,
      kpiTarget: employee.kpiTarget,
      quality,
      outcome: null as null,
    };
  });

  rows.sort((a, b) => b.kpi - a.kpi || b.doneWeight - a.doneWeight);
  const people = rows.map((row, index) => ({ ...row, rank: index + 1 }));

  const scored = people.filter((row) => row.doneTasks > 0);
  const companyKpi = scored.length ? Math.round(scored.reduce((sum, row) => sum + row.kpi, 0) / scored.length) : 0;
  const doneThisPeriod = people.reduce((sum, row) => sum + row.doneTasks, 0);
  const overloadedCount = people.filter((row) => row.capacityPercent > 105).length;
  const qualityReady = qualityByName.size > 0;

  return {
    people,
    summary: { companyKpi, doneThisPeriod, overloadedCount, headcount: people.length, qualityReady, outcomeReady: false },
  };
}

export function distributeRewards(people: { name: string; kpi: number }[], bonusPool: number) {
  const totalKpi = people.reduce((sum, person) => sum + person.kpi, 0);
  return people.map((person) => ({
    name: person.name,
    kpi: person.kpi,
    reward: totalKpi > 0 ? Math.round((bonusPool * person.kpi) / totalKpi) : 0,
  }));
}
