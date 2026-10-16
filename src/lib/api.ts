import { authenticate, type Identity } from "./auth";

export function jsonOk(data: unknown, init?: ResponseInit) {
  return Response.json(data, { ...init, headers: { "Cache-Control": "no-store", ...(init?.headers ?? {}) } });
}

export function jsonError(status: number, message: string, field?: string, code?: string) {
  return Response.json({ error: { message, field, code } }, { status, headers: { "Cache-Control": "no-store" } });
}

/** กัน CSRF สำหรับคำขอที่เปลี่ยนข้อมูล: Origin ต้องตรงกับ host ของคำขอ */
export function sameOriginOk(req: Request): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return true;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(req.url).origin;
  } catch {
    return false;
  }
}

export async function requireAdmin(req: Request): Promise<Identity | Response> {
  if (!sameOriginOk(req)) return jsonError(403, "คำขอไม่ถูกต้อง กรุณารีเฟรชหน้าเว็บ", undefined, "bad_origin");
  const result = await authenticate(req.headers);
  if (result.ok) return result.identity;
  if (result.reason === "not_configured") return jsonError(503, "ยังไม่ได้ตั้งค่าบัญชีผู้ดูแลระบบ", undefined, "auth_not_configured");
  return jsonError(401, "กรุณาเข้าสู่ระบบผู้ดูแล", undefined, "unauthenticated");
}

export async function audit(db: D1Database, actor: string, action: string, detail?: string) {
  await db.prepare("INSERT INTO audit_log (actor, action, detail) VALUES (?, ?, ?)").bind(actor, action, detail ?? null).run();
}
