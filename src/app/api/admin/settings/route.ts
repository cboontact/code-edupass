import { requireAdmin, jsonOk, jsonError, audit } from "@/lib/api";
import { getEnv } from "@/lib/env";
import { loadSettings } from "@/lib/db";
import { serializeSettings, validateSettingsInput } from "@/lib/settings";

export async function GET(req: Request) {
  const a = await requireAdmin(req);
  if (a instanceof Response) return a;
  return jsonOk({ settings: await loadSettings() });
}

export async function PUT(req: Request) {
  const a = await requireAdmin(req);
  if (a instanceof Response) return a;
  const body = await req.json().catch(() => null);
  const v = validateSettingsInput(body);
  if (!v.ok) {
    const [field, message] = Object.entries(v.errors)[0];
    return Response.json({ error: { message, field, fields: v.errors } }, { status: 400 });
  }
  const { DB } = getEnv();
  await DB.batch(
    serializeSettings(v.value).map(([k, val]) =>
      DB.prepare(
        "INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, strftime('%Y-%m-%dT%H:%M:%fZ','now')) ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = excluded.updated_at",
      ).bind(k, val),
    ),
  );
  await audit(DB, a.actor, "settings.update");
  return jsonOk({ settings: v.value });
}
