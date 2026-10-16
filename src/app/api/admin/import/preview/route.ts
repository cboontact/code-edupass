import { requireAdmin, jsonOk, jsonError } from "@/lib/api";
import { getEnv } from "@/lib/env";
import { analyzeUpload } from "@/lib/import-service";

export async function POST(req: Request) {
  const a = await requireAdmin(req);
  if (a instanceof Response) return a;
  const r = await analyzeUpload(req, getEnv().DB);
  if ("error" in r) return jsonError(400, r.error, "file");
  if (!r.analysis.ok) return jsonError(400, r.analysis.headerError ?? "ไฟล์ไม่ถูกต้อง", "file");
  const { rows, ...rest } = r.analysis;
  return jsonOk({ ...rest, rows: rows.slice(0, 500), rowsTruncated: rows.length > 500, totalRows: rows.length });
}
