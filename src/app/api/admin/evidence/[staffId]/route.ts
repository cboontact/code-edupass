import { requireAdmin, jsonError, audit } from "@/lib/api";
import { getEnv } from "@/lib/env";

// อ่านภาพหลักฐานได้เฉพาะผู้ดูแลที่ผ่านการตรวจสิทธิ์ฝั่ง server เท่านั้น
export async function GET(req: Request, ctx: { params: Promise<{ staffId: string }> }) {
  const a = await requireAdmin(req);
  if (a instanceof Response) return a;
  const staffId = Number((await ctx.params).staffId);
  if (!Number.isInteger(staffId) || staffId <= 0) return jsonError(400, "รหัสไม่ถูกต้อง");
  const { DB, EVIDENCE } = getEnv();
  const sub = await DB.prepare("SELECT object_key, content_type FROM submissions WHERE staff_id = ?")
    .bind(staffId)
    .first<{ object_key: string; content_type: string }>();
  if (!sub) return jsonError(404, "ยังไม่มีหลักฐานของรายชื่อนี้");
  const obj = await EVIDENCE.get(sub.object_key);
  if (!obj) return jsonError(404, "ไม่พบไฟล์หลักฐาน");
  await audit(DB, a.actor, "evidence.view", `staff:${staffId}`);
  return new Response(obj.body, {
    headers: {
      "Content-Type": sub.content_type,
      "Content-Length": String(obj.size),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
