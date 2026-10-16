import { audit, jsonError, requireAdmin } from "@/lib/api";
import { getEnv } from "@/lib/env";
import { getDriveFile } from "@/lib/google-drive";

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
