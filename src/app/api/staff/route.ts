import { jsonOk, jsonError } from "@/lib/api";
import { getEnv } from "@/lib/env";

// เปิดให้ดูเฉพาะรายชื่อและสถานะ ไม่เปิดเผยอีเมลหรือภาพหลักฐาน
export async function GET(req: Request) {
  const departmentId = Number(new URL(req.url).searchParams.get("departmentId"));
  if (!Number.isInteger(departmentId) || departmentId <= 0) return jsonError(400, "กรุณาเลือกกลุ่มสาระ", "departmentId");
  const { results } = await getEnv()
    .DB.prepare(
      `SELECT s.id, s.full_name AS name,
         (sub.id IS NOT NULL OR s.marked_submitted_at IS NOT NULL) AS submitted,
         (sub.id IS NOT NULL) AS hasEvidence
       FROM staff s LEFT JOIN submissions sub ON sub.staff_id = s.id
       WHERE s.department_id = ? ORDER BY s.full_name`,
    )
    .bind(departmentId)
    .all<{ id: number; name: string; submitted: number; hasEvidence: number }>();
  return jsonOk({ staff: results.map((r) => ({ id: r.id, name: r.name, submitted: !!r.submitted, hasEvidence: !!r.hasEvidence })) });
}
