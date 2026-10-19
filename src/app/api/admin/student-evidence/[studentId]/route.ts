import { audit, jsonError, jsonOk, requireAdmin } from "@/lib/api";
import { getEnv } from "@/lib/env";
import { deleteDriveFile, getDriveFile } from "@/lib/google-drive";

export async function DELETE(req: Request, ctx: { params: Promise<{ studentId: string }> }) {
  const auth = await requireAdmin(req); if (auth instanceof Response) return auth;
  const studentId = Number((await ctx.params).studentId);
  if (!Number.isSafeInteger(studentId) || studentId <= 0) return jsonError(400, "รหัสไม่ถูกต้อง");
  const body = await req.json().catch(() => null) as { updatedAt?: unknown } | null;
  if (typeof body?.updatedAt !== "string" || !body.updatedAt)
    return jsonError(400, "กรุณารีเฟรชข้อมูลก่อนลบหลักฐาน");
  const env = getEnv();
  // Remove only the version the administrator reviewed. A concurrent new upload must survive.
  const removed = await env.DB.prepare(
    "DELETE FROM student_submissions WHERE student_id = ? AND updated_at = ? RETURNING drive_file_id",
  ).bind(studentId, body.updatedAt).first<{ drive_file_id: string }>();
  if (!removed) return jsonError(409, "หลักฐานมีการเปลี่ยนแปลงหรือถูกลบแล้ว กรุณารีเฟรชข้อมูล");
  let cleanupPending = false;
  try { await deleteDriveFile(env, removed.drive_file_id); }
  catch (error) {
    cleanupPending = true;
    console.error("Deleted student evidence Drive cleanup failed", { studentId, fileId: removed.drive_file_id, error });
  }
  await audit(env.DB, auth.actor, "student_evidence.delete",
    JSON.stringify({ studentId, driveFileId: removed.drive_file_id, cleanupPending }))
    .catch((error) => console.error("Student evidence deletion audit failed", error));
  return jsonOk({ ok: true, cleanupPending });
}

export async function GET(req: Request, ctx: { params: Promise<{ studentId: string }> }) {
  const auth = await requireAdmin(req); if (auth instanceof Response) return auth;
  const studentId = Number((await ctx.params).studentId);
  if (!Number.isInteger(studentId) || studentId <= 0) return jsonError(400, "รหัสไม่ถูกต้อง");
  const env = getEnv();
  const submission = await env.DB.prepare("SELECT drive_file_id, content_type, size_bytes FROM student_submissions WHERE student_id = ?")
    .bind(studentId).first<{ drive_file_id: string; content_type: string; size_bytes: number }>();
  if (!submission) return jsonError(404, "ยังไม่มีหลักฐานของนักเรียนคนนี้");
  let driveResponse: Response;
  try { driveResponse = await getDriveFile(env, submission.drive_file_id); }
  catch (error) { console.error("Drive evidence fetch failed", error); return jsonError(503, "เชื่อมต่อ Google Drive ไม่สำเร็จ"); }
  if (!driveResponse.ok || !driveResponse.body) return jsonError(driveResponse.status === 404 ? 404 : 503, driveResponse.status === 404 ? "ไม่พบไฟล์หลักฐาน" : "โหลดภาพหลักฐานไม่สำเร็จ");
  await audit(env.DB, auth.actor, "student_evidence.view", `student:${studentId}`).catch((error) => console.error("Audit failed", error));
  return new Response(driveResponse.body, { headers: { "Content-Type": submission.content_type, "Content-Length": String(submission.size_bytes), "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline", "Content-Security-Policy": "default-src 'none'; sandbox" } });
}
