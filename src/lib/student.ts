export function normalizeStudentNumber(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, "").trim();
  return /^\d{1,20}$/.test(normalized) ? normalized : null;
}

export function studentDriveFolders(className: string | null | undefined): { grade: string; room: string } {
  const normalized = (className ?? "").normalize("NFC").trim();
  const match = normalized.match(/^(?:ม\.?\s*)?(\d+)\s*\/\s*(\d+)$/);
  if (!match) return { grade: "ไม่ระบุชั้น", room: "ไม่ระบุห้อง" };
  return { grade: `ม.${match[1]}`, room: `ห้อง ${match[2]}` };
}
