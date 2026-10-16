import { describe, expect, it } from "vitest";
import { computeProgress, percentOf } from "../src/lib/status";

describe("การคำนวณสถานะ", () => {
  it("รายชื่อว่าง → 0%", () => {
    expect(computeProgress([])).toEqual({ total: 0, submitted: 0, pending: 0, percent: 0 });
    expect(percentOf(0, 0)).toBe(0);
  });
  it("รวมทุกกลุ่มสาระและคำนวณเปอร์เซ็นต์", () => {
    const p = computeProgress([
      { id: 1, name: "ก", total: 10, submitted: 4 },
      { id: 2, name: "ข", total: 5, submitted: 5 },
    ]);
    expect(p).toEqual({ total: 15, submitted: 9, pending: 6, percent: 60 });
  });
  it("ปัดทศนิยม 1 ตำแหน่ง และไม่เกิน 100%", () => {
    expect(percentOf(1, 3)).toBe(33.3);
    expect(percentOf(7, 5)).toBe(100);
  });
});
