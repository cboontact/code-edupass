import { FILE_TYPE_OPTIONS, type FileType, type Settings } from "./settings";

/** ตรวจ magic bytes ของไฟล์จริง ไม่เชื่อ Content-Type ที่ client ส่งมาอย่างเดียว */
export function sniffImageType(b: Uint8Array): FileType | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  return null;
}

export type UploadCheck = { ok: true; type: FileType; ext: string } | { ok: false; message: string };

export function validateUpload(size: number, head: Uint8Array, s: Pick<Settings, "maxFileMb" | "allowedTypes">): UploadCheck {
  if (size <= 0) return { ok: false, message: "ไฟล์ว่างเปล่า กรุณาเลือกภาพใหม่" };
  if (size > s.maxFileMb * 1024 * 1024) return { ok: false, message: `ไฟล์ใหญ่เกินไป (สูงสุด ${s.maxFileMb} MB)` };
  const type = sniffImageType(head);
  const allowedLabels = s.allowedTypes.map((t) => FILE_TYPE_OPTIONS[t].label).join(", ");
  if (!type || !s.allowedTypes.includes(type)) return { ok: false, message: `ชนิดไฟล์ไม่รองรับ (รับเฉพาะ ${allowedLabels})` };
  return { ok: true, type, ext: FILE_TYPE_OPTIONS[type].ext };
}
