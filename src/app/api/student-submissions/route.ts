import { audit, jsonError, jsonOk, sameOriginOk } from "@/lib/api";
import { loadSettings } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { validateUpload } from "@/lib/file-validate";
import { deleteDriveFile, googleDriveConfigured, uploadStudentEvidence } from "@/lib/google-drive";
import { isPastDeadline } from "@/lib/settings";
import { normalizeStudentNumber, studentDriveFolders } from "@/lib/student";

export async function POST(req: Request) {
  if (!sameOriginOk(req)) return jsonError(403, "คำขอไม่ถูกต้อง กรุณารีเฟรชหน้าเว็บ", undefined, "bad_origin");
  const env = getEnv();
  const settings = await loadSettings(env.DB);
  if (!googleDriveConfigured(env)) return jsonError(503, "ระบบจัดเก็บหลักฐานนักเรียนยังไม่พร้อม กรุณาติดต่อผู้ดูแลระบบ", undefined, "drive_not_configured");
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > settings.maxFileMb * 1024 * 1024 + 64 * 1024)
    return jsonError(413, `ไฟล์ใหญ่เกินไป (สูงสุด ${settings.maxFileMb} MB)`, "file");
  let form: FormData;
  try { form = await req.formData(); } catch { return jsonError(400, "อ่านข้อมูลที่ส่งมาไม่ได้", "file"); }
  const studentNumber = normalizeStudentNumber(form.get("studentNumber"));
  const file = form.get("file");
  if (!studentNumber) return jsonError(400, "กรุณากรอกเลขประจำตัวนักเรียนให้ถูกต้อง", "studentNumber");
  if (!(file instanceof File)) return jsonError(400, "กรุณาแนบภาพหลักฐาน", "file");
  if (settings.blockAfterDeadline && isPastDeadline(settings.deadline)) return jsonError(403, "หมดกำหนดส่งหลักฐานแล้ว", undefined, "deadline_passed");

  const student = await env.DB.prepare(
    `SELECT s.id, s.class_name, sub.drive_file_id
     FROM students s LEFT JOIN student_submissions sub ON sub.student_id = s.id
     WHERE s.student_number = ?`,
  ).bind(studentNumber).first<{ id: number; class_name: string | null; drive_file_id: string | null }>();
  if (!student) return jsonError(404, "ไม่พบเลขประจำตัวนักเรียนในระบบ", "studentNumber");
  const existing = student.drive_file_id ? { drive_file_id: student.drive_file_id } : null;
  if (existing && !settings.allowResubmit)
    return jsonError(409, "เลขประจำตัวนี้ส่งหลักฐานแล้ว หากต้องการแก้ไขโปรดติดต่อผู้ดูแลระบบ", "studentNumber", "already_submitted");

  const bytes = await file.arrayBuffer();
  const check = validateUpload(bytes.byteLength, new Uint8Array(bytes, 0, Math.min(16, bytes.byteLength)), settings);
  if (!check.ok) return jsonError(400, check.message, "file", "bad_file");
  let driveFileId: string;
  try { driveFileId = await uploadStudentEvidence(env, bytes, check.type, check.ext, studentNumber, studentDriveFolders(student.class_name)); }
  catch (error) {
    console.error("Google Drive upload failed", error);
    return jsonError(503, "จัดเก็บภาพไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "file");
  }

  const now = new Date().toISOString();
  try {
    const result = existing
      ? await env.DB.prepare(
        `UPDATE student_submissions SET drive_file_id = ?2, content_type = ?3, size_bytes = ?4, updated_at = ?5
         WHERE student_id = ?1 AND drive_file_id = ?6`,
      ).bind(student.id, driveFileId, check.type, bytes.byteLength, now, existing.drive_file_id).run()
      : await env.DB.prepare(
        `INSERT INTO student_submissions (student_id, drive_file_id, content_type, size_bytes, submitted_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?5) ON CONFLICT(student_id) DO NOTHING`,
      ).bind(student.id, driveFileId, check.type, bytes.byteLength, now).run();
    if (!result.meta.changes) {
      await deleteDriveFile(env, driveFileId).catch((error) => console.error("Drive conflict cleanup failed", error));
      return jsonError(409, "เลขประจำตัวนี้มีการส่งหลักฐานแล้ว กรุณาตรวจสอบสถานะล่าสุด", "studentNumber", "submission_conflict");
    }
  } catch (error) {
    await deleteDriveFile(env, driveFileId).catch((cleanupError) => console.error("Drive rollback failed", cleanupError));
    console.error("Student submission database write failed", error);
    return jsonError(500, "บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
  }
  if (existing) await deleteDriveFile(env, existing.drive_file_id).catch((error) => console.error("Old Drive file cleanup failed", error));
  await audit(env.DB, `student:${student.id}`, existing ? "student_submission.replace" : "student_submission.create", `student:${student.id}`)
    .catch((error) => console.error("Student submission audit failed", error));
  return jsonOk({ ok: true, submittedAt: now, replaced: !!existing }, { status: 201 });
}
