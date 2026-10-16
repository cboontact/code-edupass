import { requireAdmin, jsonOk } from "@/lib/api";
import { getEnv } from "@/lib/env";
import { likeEscape } from "@/lib/db";

export async function GET(req: Request) {
  const a = await requireAdmin(req);
  if (a instanceof Response) return a;
  const p = new URL(req.url).searchParams;
  const dept = Number(p.get("departmentId"));
  const status = p.get("status");
  const q = (p.get("q") ?? "").trim().slice(0, 100);
  const pageSize = 20;
  const page = Math.max(1, Math.floor(Number(p.get("page")) || 1));

  const where: string[] = [];
  const args: (string | number)[] = [];
  if (Number.isInteger(dept) && dept > 0) { where.push("s.department_id = ?"); args.push(dept); }
  if (status === "submitted") where.push("(sub.id IS NOT NULL OR s.marked_submitted_at IS NOT NULL)");
  if (status === "pending") where.push("sub.id IS NULL AND s.marked_submitted_at IS NULL");
  if (q) { where.push("s.full_name LIKE ? ESCAPE '\\'"); args.push(`%${likeEscape(q)}%`); }
  const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const from = `FROM staff s JOIN departments d ON d.id = s.department_id LEFT JOIN submissions sub ON sub.staff_id = s.id ${w}`;
  const { DB } = getEnv();
  const [count, rows] = await Promise.all([
    DB.prepare(`SELECT COUNT(*) AS c ${from}`).bind(...args).first<{ c: number }>(),
    DB.prepare(
      `SELECT s.id, s.full_name AS name, s.position AS position, d.name AS department, (s.email IS NOT NULL) AS hasEmail,
              sub.submitted_at AS submittedAt, COALESCE(sub.updated_at, s.marked_submitted_at) AS updatedAt
       ${from} ORDER BY d.name, s.full_name LIMIT ? OFFSET ?`,
    ).bind(...args, pageSize, (page - 1) * pageSize).all(),
  ]);
  return jsonOk({ total: count?.c ?? 0, page, pageSize, rows: rows.results });
}
