import { getEnv } from "./env";
import { parseSettings, type Settings } from "./settings";

export async function loadSettings(db: D1Database = getEnv().DB): Promise<Settings> {
  const { results } = await db.prepare("SELECT key, value FROM settings").all<{ key: string; value: string }>();
  return parseSettings(results);
}

export const likeEscape = (s: string) => s.replace(/[\\%_]/g, (c) => "\\" + c);

export function formatThai(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(d);
}
