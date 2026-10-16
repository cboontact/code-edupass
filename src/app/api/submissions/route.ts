import { sameOriginOk, jsonOk, jsonError, audit } from "@/lib/api";
import { getEnv } from "@/lib/env";
import { loadSettings } from "@/lib/db";
import { validateUpload } from "@/lib/file-validate";
import { isPastDeadline } from "@/lib/settings";

export async function POST(req: Request) {
  if (!sameOriginOk(req)) return jsonError(403, "คำขอไม่ถูกต้อง กรุณารีเฟรชหน้าเว็บ", undefined, "bad_origin");
  const { DB, EVIDENCE } = getEnv();
  const settings = await loadSettings(DB);

  // ปฏิเสธเร็วก่อนอ่านตัวไฟล์ทั้งหมด (ขอบเขตหยาบ: ไฟล์ + ส่วนหัว multipart)
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > settings.maxFileMb * 1024 * 1024 + 64 * 1024)
    return jsonError(413, `ไฟล์ใหญ่เกินไป (สูงสุด ${settings.maxFileMb} MB)`, "file");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError(400, "อ่านข้อมูลที่ส่งมาไม่ได้", "file");
  }
  const staffId = Number(form.get("staffId"));
  const file = form.get("file");
  if (!Number.isInteger(staffId) || staffId <= 0) return jsonError(400, "กรุณาเลือกชื่อของท่าน", "staffId");
  if (!(file instanceof File)) return jsonError(400, "กรุณาแนบภาพหลักฐาน", "file");

  if (settings.blockAfterDeadline && isPastDeadline(settings.deadline))
    return jsonError(403, "หมดกำหนดส่งหลักฐานแล้ว", undefined, "deadline_passed");

  const staff = await DB.prepare("SELECT id FROM staff WHERE id = ?")
    .bind(staffId)
    .first<{ id: number }>();
  if (!staff) return jsonError(404, "ไม่พบรายชื่อที่เลือก", "staffId");

  const actor = `staff:${staffId}`; // Selected name; no authenticated identity is claimed.

  const existing = await DB.prepare("SELECT id, object_key FROM submissions WHERE staff_id = ?")
    .bind(staffId)
    .first<{ id: number; object_key: string }>();
  if (existing && !settings.allowResubmit)
    return jsonError(409, "รายชื่อนี้ส่งหลักฐานไปแล้ว หากต้องการแก้ไขโปรดติดต่อผู้ดูแลระบบ", "staffId", "already_submitted");

  const buf = await file.arrayBuffer();
  const check = validateUpload(buf.byteLength, new Uint8Array(buf, 0, Math.min(16, buf.byteLength)), settings);
  if (!check.ok) return jsonError(400, check.message, "file", "bad_file");

  const key = `evidence/${crypto.randomUUID()}.${check.ext}`;
  try {
    await EVIDENCE.put(key, buf, { httpMetadata: { contentType: check.type } });
  } catch {
    return jsonError(503, "จัดเก็บภาพไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "file");
  }

  const now = new Date().toISOString();
  try {
    // Compare the previous object when replacing; concurrent uploads must not overwrite each other.
    const result = existing
      ? await DB.prepare(
        `UPDATE submissions SET object_key = ?2, content_type = ?3, size_bytes = ?4,
          submitted_by = ?5, updated_at = ?6 WHERE staff_id = ?1 AND object_key = ?7`,
      ).bind(staffId, key, check.type, buf.byteLength, actor, now, existing.object_key).run()
      : await DB.prepare(
        `INSERT INTO submissions (staff_id, object_key, content_type, size_bytes, submitted_by, submitted_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6) ON CONFLICT(staff_id) DO NOTHING`,
      ).bind(staffId, key, check.type, buf.byteLength, actor, now).run();
    if (!result.meta.changes) {
      await EVIDENCE.delete(key);
      return jsonError(409, "รายชื่อนี้มีการส่งหลักฐานแล้ว กรุณากลับไปตรวจสอบสถานะล่าสุด", "staffId", "submission_conflict");
    }
  } catch {
    await EVIDENCE.delete(key);
    return jsonError(500, "บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
  }
  // Saving succeeded: cleanup/logging failures must not tell the user to submit again.
  if (existing) {
    try { await EVIDENCE.delete(existing.object_key); }
    catch (error) { console.error("Evidence cleanup failed", error); }
  }
  try { await audit(DB, actor, existing ? "submission.replace" : "submission.create", `staff:${staffId}`); }
  catch (error) { console.error("Submission audit failed", error); }
  return jsonOk({ ok: true, submittedAt: now, replaced: !!existing }, { status: 201 });
}
