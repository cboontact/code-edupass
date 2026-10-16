import { jsonError, jsonOk, sameOriginOk } from "@/lib/api";
import { getEnv } from "@/lib/env";
import { normalizeStudentNumber } from "@/lib/student";

export async function POST(req: Request) {
  if (!sameOriginOk(req)) return jsonError(403, "คำขอไม่ถูกต้อง กรุณารีเฟรชหน้าเว็บ", undefined, "bad_origin");
  let body: unknown;
  try { body = await req.json(); } catch { return jsonError(400, "ข้อมูลไม่ถูกต้อง"); }
  const studentNumber = normalizeStudentNumber((body as { studentNumber?: unknown })?.studentNumber);
  if (!studentNumber) return jsonError(400, "กรุณากรอกเลขประจำตัวนักเรียนให้ถูกต้อง", "studentNumber");
  const row = await getEnv().DB.prepare(
    `SELECT s.id, s.full_name AS name, s.class_name AS className, s.advisor_name AS advisorName,
      (sub.id IS NOT NULL) AS submitted
     FROM students s LEFT JOIN student_submissions sub ON sub.student_id = s.id
     WHERE s.student_number = ?`,
  ).bind(studentNumber).first<{ id: number; name: string; className: string | null; advisorName: string | null; submitted: number }>();
  if (!row) return jsonError(404, "ไม่พบเลขประจำตัวนักเรียนในระบบ กรุณาตรวจสอบอีกครั้ง", "studentNumber", "student_not_found");
  return jsonOk({ student: { name: row.name, className: row.className, advisorName: row.advisorName, submitted: !!row.submitted } });
}
