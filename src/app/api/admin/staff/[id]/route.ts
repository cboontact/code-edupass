import { requireAdmin, jsonOk, jsonError, audit } from "@/lib/api";
import { getEnv } from "@/lib/env";

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const a = await requireAdmin(req);
  if (a instanceof Response) return a;
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return jsonError(400, "รหัสไม่ถูกต้อง");
  const { DB, EVIDENCE } = getEnv();
  const sub = await DB.prepare("SELECT object_key FROM submissions WHERE staff_id = ?").bind(id).first<{ object_key: string }>();
  const res = await DB.prepare("DELETE FROM staff WHERE id = ?").bind(id).run();
  if (!res.meta.changes) return jsonError(404, "ไม่พบรายชื่อ");
  if (sub) await EVIDENCE.delete(sub.object_key);
  await audit(DB, a.actor, "staff.delete", `staff:${id}`);
  return jsonOk({ ok: true });
}
