import { sessionCookie } from "@/lib/auth";
import { jsonError, jsonOk, sameOriginOk } from "@/lib/api";

export async function POST(req: Request) {
  if (!sameOriginOk(req)) return jsonError(403, "คำขอไม่ถูกต้อง");
  return jsonOk({ ok: true }, { headers: { "Set-Cookie": sessionCookie(req, "", 0) } });
}
