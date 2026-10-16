import { describe, expect, it } from "vitest";
import { normalizeStudentNumber, studentDriveFolders } from "@/lib/student";

describe("normalizeStudentNumber", () => {
  it("preserves leading zeroes and removes spaces", () => {
    expect(normalizeStudentNumber(" 001 234 ")).toBe("001234");
  });
  it("rejects non-numeric and empty values", () => {
    expect(normalizeStudentNumber("12A34")).toBeNull();
    expect(normalizeStudentNumber(" ")).toBeNull();
    expect(normalizeStudentNumber(null)).toBeNull();
  });
});

describe("studentDriveFolders", () => {
  it("creates separate grade and room folder names", () => {
    expect(studentDriveFolders("1/12")).toEqual({ grade: "ม.1", room: "ห้อง 12" });
    expect(studentDriveFolders("ม.6/3")).toEqual({ grade: "ม.6", room: "ห้อง 3" });
  });
  it("uses safe fallback folders for an unknown format", () => {
    expect(studentDriveFolders("อื่น ๆ")).toEqual({ grade: "ไม่ระบุชั้น", room: "ไม่ระบุห้อง" });
  });
});
