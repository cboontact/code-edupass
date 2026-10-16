import { requireAdmin, jsonOk, jsonError, audit } from "@/lib/api";
import { getEnv } from "@/lib/env";
import { analyzeUpload } from "@/lib/import-service";

// ตรวจไฟล์ซ้ำฝั่ง server ทุกครั้ง ไม่เชื่อผล preview จาก client
export async function POST(req: Request) {
  const a = await requireAdmin(req);
  if (a instanceof Response) return a;
  const { DB } = getEnv();
  const r = await analyzeUpload(req, DB);
  if ("error" in r) return jsonError(400, r.error, "file");
  const an = r.analysis;
  if (!an.ok) return jsonError(400, an.headerError ?? "ไฟล์ไม่ถูกต้อง", "file");
  const todo = an.rows.filter((x) => x.status === "new" || x.status === "update");
  if (!todo.length) return jsonError(400, "ไม่มีแถวที่นำเข้าได้", "file");

  const stmts: D1PreparedStatement[] = [];
  for (const d of an.newDepartments) stmts.push(DB.prepare("INSERT OR IGNORE INTO departments (name) VALUES (?)").bind(d));
  const now = new Date().toISOString();
  for (const row of todo) {
    stmts.push(
      DB.prepare(
        `INSERT INTO staff (department_id, full_name, email, position, created_at, updated_at)
         VALUES ((SELECT id FROM departments WHERE name = ?1 COLLATE NOCASE), ?2, ?3, ?5, ?4, ?4)
         ON CONFLICT(department_id, full_name) DO UPDATE SET email = COALESCE(excluded.email, staff.email), position = COALESCE(excluded.position, staff.position), updated_at = excluded.updated_at`,
      ).bind(row.department, row.name, row.email || null, now, row.position || null),
    );
  }
  for (let i = 0; i < stmts.length; i += 90) await DB.batch(stmts.slice(i, i + 90));
  await audit(DB, a.actor, "staff.import", `new:${an.counts.new} update:${an.counts.update} skipped:${an.rows.length - todo.length}`);
  return jsonOk({ ok: true, imported: an.counts.new, updated: an.counts.update, skipped: an.rows.length - todo.length });
}
