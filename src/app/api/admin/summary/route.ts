import { requireAdmin, jsonOk } from "@/lib/api";
import { getEnv } from "@/lib/env";
import { computeProgress, percentOf, type DeptCount } from "@/lib/status";
import { loadSettings } from "@/lib/db";

export async function GET(req: Request) {
  const a = await requireAdmin(req);
  if (a instanceof Response) return a;
  const { DB } = getEnv();
  const [{ results }, last, settings] = await Promise.all([
    DB.prepare(
      `SELECT d.id, d.name, COUNT(s.id) AS total,
         COUNT(CASE WHEN sub.id IS NOT NULL OR s.marked_submitted_at IS NOT NULL THEN 1 END) AS submitted
       FROM departments d
       LEFT JOIN staff s ON s.department_id = d.id
       LEFT JOIN submissions sub ON sub.staff_id = s.id
       GROUP BY d.id ORDER BY d.name`,
    ).all<DeptCount>(),
    DB.prepare("SELECT MAX(updated_at) AS t FROM submissions").first<{ t: string | null }>(),
    loadSettings(DB),
  ]);
  const departments = results.map((d) => ({ ...d, percent: percentOf(d.submitted, d.total) }));
  return jsonOk({
    ...computeProgress(results),
    departments,
    lastSubmissionAt: last?.t ?? null,
    generatedAt: new Date().toISOString(),
    deadline: settings.deadline,
  });
}
