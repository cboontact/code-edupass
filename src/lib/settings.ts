// ค่าที่ผู้ดูแลปรับได้ — ค่าตั้งต้นเป็นเพียงค่าเริ่มต้นที่ปลอดภัย รอผู้ดูแลยืนยัน
export const FILE_TYPE_OPTIONS = {
  "image/jpeg": { ext: "jpg", label: "JPG" },
  "image/png": { ext: "png", label: "PNG" },
  "image/webp": { ext: "webp", label: "WebP" },
} as const;
export type FileType = keyof typeof FILE_TYPE_OPTIONS;

export interface Settings {
  maxFileMb: number;
  allowedTypes: FileType[];
  deadline: string; // YYYY-MM-DD หรือ "" (ยังไม่กำหนด)
  blockAfterDeadline: boolean;
  allowResubmit: boolean;
  evidenceInstructions: string; // ข้อมูลที่ต้องปรากฏในภาพ (ยังรอผู้ดูแลระบุ)
}

export const DEFAULT_SETTINGS: Settings = {
  maxFileMb: 5,
  allowedTypes: ["image/jpeg", "image/png", "image/webp"],
  deadline: "",
  blockAfterDeadline: false,
  allowResubmit: false,
  evidenceInstructions: "",
};

export const MAX_FILE_MB_LIMIT = 20;

export function parseSettings(rows: { key: string; value: string }[]): Settings {
  const m = new Map(rows.map((r) => [r.key, r.value]));
  const s: Settings = { ...DEFAULT_SETTINGS };
  const mb = Number(m.get("maxFileMb"));
  if (Number.isFinite(mb) && mb >= 1 && mb <= MAX_FILE_MB_LIMIT) s.maxFileMb = mb;
  const types = (m.get("allowedTypes") ?? "").split(",").filter((t): t is FileType => t in FILE_TYPE_OPTIONS);
  if (types.length) s.allowedTypes = types;
  if (m.has("deadline") && /^(\d{4}-\d{2}-\d{2})?$/.test(m.get("deadline")!)) s.deadline = m.get("deadline")!;
  const bool = (k: string, d: boolean) => (m.has(k) ? m.get(k) === "true" : d);
  s.blockAfterDeadline = bool("blockAfterDeadline", s.blockAfterDeadline);
  s.allowResubmit = bool("allowResubmit", s.allowResubmit);
  if (m.has("evidenceInstructions")) s.evidenceInstructions = m.get("evidenceInstructions")!.slice(0, 1000);
  return s;
}

/** ตรวจค่าจากฟอร์มผู้ดูแล; คืน error รายช่อง */
export function validateSettingsInput(
  input: unknown,
): { ok: true; value: Settings } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const i = (input ?? {}) as Record<string, unknown>;
  const mb = Number(i.maxFileMb);
  if (!Number.isFinite(mb) || mb < 1 || mb > MAX_FILE_MB_LIMIT)
    errors.maxFileMb = `ขนาดไฟล์ต้องอยู่ระหว่าง 1–${MAX_FILE_MB_LIMIT} MB`;
  const types = Array.isArray(i.allowedTypes) ? i.allowedTypes.filter((t): t is FileType => typeof t === "string" && t in FILE_TYPE_OPTIONS) : [];
  if (!types.length) errors.allowedTypes = "ต้องเลือกชนิดไฟล์อย่างน้อย 1 ชนิด";
  const deadline = typeof i.deadline === "string" ? i.deadline : "";
  if (!/^(\d{4}-\d{2}-\d{2})?$/.test(deadline)) errors.deadline = "รูปแบบวันที่ไม่ถูกต้อง";
  const instr = typeof i.evidenceInstructions === "string" ? i.evidenceInstructions.trim() : "";
  if (instr.length > 1000) errors.evidenceInstructions = "ยาวเกิน 1,000 ตัวอักษร";
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      maxFileMb: mb,
      allowedTypes: types,
      deadline,
      blockAfterDeadline: i.blockAfterDeadline === true,
      allowResubmit: i.allowResubmit === true,
      evidenceInstructions: instr,
    },
  };
}

export function serializeSettings(s: Settings): [string, string][] {
  return [
    ["maxFileMb", String(s.maxFileMb)],
    ["allowedTypes", s.allowedTypes.join(",")],
    ["deadline", s.deadline],
    ["blockAfterDeadline", String(s.blockAfterDeadline)],
    ["allowResubmit", String(s.allowResubmit)],
    ["evidenceInstructions", s.evidenceInstructions],
  ];
}

/** กำหนดส่งหมดเมื่อสิ้นวันตามเวลาประเทศไทย (UTC+7) */
export function isPastDeadline(deadline: string, now = new Date()): boolean {
  if (!deadline) return false;
  const end = new Date(`${deadline}T23:59:59.999+07:00`);
  return now.getTime() > end.getTime();
}
