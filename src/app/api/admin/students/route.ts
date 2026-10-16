import { jsonOk, requireAdmin } from "@/lib/api";
import { likeEscape } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { percentOf } from "@/lib/status";

export async function GET(req: Request) {
  const auth = await requireAdmin(req); if (auth instanceof Response) return auth;
  const params = new URL(req.url).searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, 100);
  const status = params.get("status");
  const grade = /^\d+$/.test(params.get("grade") ?? "") ? params.get("grade")! : "";
  const room = /^\d+$/.test(params.get("room") ?? "") ? params.get("room")! : "";
  const page = Math.max(1, Math.floor(Number(params.get("page")) || 1));
  const pageSize = 30;
  const where: string[] = []; const args: string[] = [];
  if (q) { where.push("(s.full_name LIKE ? ESCAPE '\\' OR s.student_number LIKE ? ESCAPE '\\' OR s.class_name LIKE ? ESCAPE '\\' OR s.advisor_name LIKE ? ESCAPE '\\')"); const value = `%${likeEscape(q)}%`; args.push(value, value, value, value); }
  if (status === "submitted") where.push("sub.id IS NOT NULL");
  if (status === "pending") where.push("sub.id IS NULL");
  if (grade && room) { where.push("s.class_name = ?"); args.push(`${grade}/${room}`); }
  else if (grade) { where.push("s.class_name LIKE ? ESCAPE '\\'"); args.push(`${likeEscape(grade)}/%`); }
  else if (room) { where.push("s.class_name LIKE ? ESCAPE '\\'"); args.push(`%/${likeEscape(room)}`); }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const { DB } = getEnv();
  const [totals, count, rows, gradeRows, roomRows] = await Promise.all([
    DB.prepare(`SELECT COUNT(s.id) AS total, COUNT(sub.id) AS submitted, MAX(sub.updated_at) AS lastSubmissionAt FROM students s LEFT JOIN student_submissions sub ON sub.student_id = s.id ${clause}`).bind(...args).first<{ total: number; submitted: number; lastSubmissionAt: string | null }>(),
    DB.prepare(`SELECT COUNT(*) AS total FROM students s LEFT JOIN student_submissions sub ON sub.student_id = s.id ${clause}`).bind(...args).first<{ total: number }>(),
    DB.prepare(`SELECT s.id, s.student_number AS studentNumber, s.full_name AS name, s.class_name AS className, s.advisor_name AS advisorName, sub.updated_at AS updatedAt FROM students s LEFT JOIN student_submissions sub ON sub.student_id = s.id ${clause} ORDER BY COALESCE(s.class_name, ''), s.student_number LIMIT ? OFFSET ?`).bind(...args, pageSize, (page - 1) * pageSize).all(),
    DB.prepare(
      `SELECT substr(s.class_name, 1, instr(s.class_name, '/') - 1) AS grade,
         COUNT(s.id) AS total, COUNT(sub.id) AS submitted
       FROM students s LEFT JOIN student_submissions sub ON sub.student_id = s.id
       WHERE instr(s.class_name, '/') > 0
       GROUP BY grade ORDER BY CAST(grade AS INTEGER)`,
    ).all<{ grade: string; total: number; submitted: number }>(),
    DB.prepare(
      `SELECT s.class_name AS className,
         substr(s.class_name, 1, instr(s.class_name, '/') - 1) AS grade,
         substr(s.class_name, instr(s.class_name, '/') + 1) AS room,
         MAX(s.advisor_name) AS advisorName,
         COUNT(s.id) AS total, COUNT(sub.id) AS submitted
       FROM students s LEFT JOIN student_submissions sub ON sub.student_id = s.id
       WHERE instr(s.class_name, '/') > 0
       GROUP BY s.class_name
       ORDER BY CAST(grade AS INTEGER), CAST(room AS INTEGER)`,
    ).all<{ className: string; grade: string; room: string; advisorName: string | null; total: number; submitted: number }>(),
  ]);
  const total = totals?.total ?? 0; const submitted = totals?.submitted ?? 0;
  const grades = gradeRows.results.map((item) => ({ ...item, percent: percentOf(item.submitted, item.total) }));
  const rooms = roomRows.results.map((item) => ({ ...item, pending: item.total - item.submitted, percent: percentOf(item.submitted, item.total) }));
  return jsonOk({ summary: { total, submitted, pending: total - submitted, percent: percentOf(submitted, total), lastSubmissionAt: totals?.lastSubmissionAt ?? null }, total: count?.total ?? 0, page, pageSize, rows: rows.results, classes: rooms.map((item) => item.className), grades, rooms, generatedAt: new Date().toISOString() });
}
