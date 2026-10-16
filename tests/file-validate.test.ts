import { describe, expect, it } from "vitest";
import { validateUpload, sniffImageType } from "../src/lib/file-validate";
import { DEFAULT_SETTINGS } from "../src/lib/settings";

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]);
const s = { ...DEFAULT_SETTINGS, maxFileMb: 2 };

describe("ตรวจไฟล์หลักฐาน", () => {
  it("รับภาพที่ magic bytes ถูกต้อง", () => {
    expect(sniffImageType(png)).toBe("image/png");
    expect(validateUpload(1000, jpg, s)).toMatchObject({ ok: true, ext: "jpg" });
    expect(validateUpload(1000, webp, s)).toMatchObject({ ok: true, ext: "webp" });
  });
  it("ปฏิเสธไฟล์ที่ไม่ใช่ภาพแม้ตั้งชื่อเป็นภาพ", () => {
    expect(validateUpload(1000, exe, s)).toMatchObject({ ok: false });
  });
  it("ปฏิเสธไฟล์ใหญ่เกินและไฟล์ว่าง", () => {
    expect(validateUpload(3 * 1024 * 1024, png, s)).toMatchObject({ ok: false });
    expect(validateUpload(0, png, s)).toMatchObject({ ok: false });
  });
  it("เคารพชนิดไฟล์ที่ผู้ดูแลอนุญาต", () => {
    expect(validateUpload(1000, png, { ...s, allowedTypes: ["image/jpeg"] })).toMatchObject({ ok: false });
  });
});
