import { adminConfigured, createAdminSession, sessionCookie, verifyAdminCredentials } from "@/lib/auth";
import { audit, jsonError, jsonOk, sameOriginOk } from "@/lib/api";
import { getEnv } from "@/lib/env";

export async function POST(req: Request) {
  if (!sameOriginOk(req)) return jsonError(403, "คำขอไม่ถูกต้อง กรุณารีเฟรชหน้าเว็บ");
  const env = getEnv();
  if (!adminConfigured(env)) return jsonError(503, "ยังไม่ได้ตั้งค่ารหัสผ่านผู้ดูแลระบบ");
  if (Number(req.headers.get("content-length") ?? 0) > 2048) return jsonError(413, "ข้อมูลยาวเกินกำหนด");

  const client = req.headers.get("cf-connecting-ip") ?? "local";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(client));
  const key = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  const now = Math.floor(Date.now() / 1000);
  const window = Math.floor(now / 900) * 900;
  await env.DB.prepare("DELETE FROM admin_login_attempts WHERE window_start < ?").bind(now - 86400).run();
  const attempt = await env.DB.prepare(
    `INSERT INTO admin_login_attempts (client_key, window_start, attempts) VALUES (?1, ?2, 1)
     ON CONFLICT(client_key) DO UPDATE SET window_start = ?2,
       attempts = CASE WHEN admin_login_attempts.window_start = ?2 THEN admin_login_attempts.attempts + 1 ELSE 1 END
     RETURNING attempts`,
  ).bind(key, window).first<{ attempts: number }>();
  if (!attempt || attempt.attempts > 10) return jsonOk(
    { error: { message: "เข้าสู่ระบบหลายครั้งเกินไป กรุณารอ 15 นาทีแล้วลองใหม่" } },
    { status: 429, headers: { "Retry-After": String(window + 900 - now) } },
  );

  const body = await req.json().catch(() => null) as { username?: unknown; password?: unknown } | null;
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const credentialsValid = typeof body?.password === "string"
    && await verifyAdminCredentials(username, body.password, env);
  if (!credentialsValid)
    return jsonError(401, "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง", "password");

  const token = await createAdminSession(env, username);
  await env.DB.prepare("DELETE FROM admin_login_attempts WHERE client_key = ?").bind(key).run();
  await audit(env.DB, username, "admin.login");
  return jsonOk({ ok: true }, { headers: { "Set-Cookie": sessionCookie(req, token) } });
}
