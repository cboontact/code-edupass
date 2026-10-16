import { describe, expect, it } from "vitest";
import { analyzeImport, parseCsv } from "../src/lib/csv";

// ข้อมูลสมมติเท่านั้น
const csv = (s: string) => "﻿" + s;

describe("นำเข้า CSV", () => {
  it("แยก CSV รองรับเครื่องหมายคำพูด/BOM/CRLF", () => {
    expect(parseCsv(csv('ก,"ข, ค"\r\n"a ""q""",b\r\n'))).toEqual([["ก", "ข, ค"], ['a "q"', "b"]]);
  });
  it("ไม่พบหัวคอลัมน์ที่จำเป็น → ไม่ ok", () => {
    const a = analyzeImport("a,b\n1,2", [], []);
    expect(a.ok).toBe(false);
    expect(a.headerError).toContain("กลุ่มสาระ");
  });
  it("จัดประเภทแถว: ใหม่/ซ้ำ/ไม่ครบ/อีเมลผิด/มีอยู่แล้ว/อัปเดต", () => {
    const text = csv(
      [
        "กลุ่มสาระ,ชื่อ-นามสกุล,ตำแหน่ง,อีเมล",
        "กลุ่ม ก,คนทดสอบ หนึ่ง,ครู,t1@example.test",
        "กลุ่ม ก,คนทดสอบ หนึ่ง,,", // ซ้ำในไฟล์
        "กลุ่ม ก,,,", // ไม่ครบ
        "กลุ่ม ข,คนทดสอบ สอง,ครู,not-an-email", // อีเมลผิด
        "กลุ่ม ข,คนทดสอบ สาม,,", // มีอยู่แล้ว
        "กลุ่ม ข,คนทดสอบ สี่,,new@example.test", // อัปเดตอีเมล
      ].join("\n"),
    );
    const a = analyzeImport(
      text,
      [
        { department: "กลุ่ม ข", name: "คนทดสอบ สาม", email: null },
        { department: "กลุ่ม ข", name: "คนทดสอบ สี่", email: "old@example.test" },
      ],
      ["กลุ่ม ข"],
    );
    expect(a.ok).toBe(true);
    expect(a.counts).toEqual({ new: 1, duplicate: 1, incomplete: 1, invalid: 1, unchanged: 1, update: 1 });
    expect(a.newDepartments).toEqual(["กลุ่ม ก"]);
  });
  it("อัปเดตตำแหน่งของรายชื่อที่มีอยู่", () => {
    const a = analyzeImport(csv("กลุ่มสาระ,ชื่อ-นามสกุล,ตำแหน่ง\nกลุ่ม ก,คนทดสอบ ห้า,ครู"), [{ department: "กลุ่ม ก", name: "คนทดสอบ ห้า", position: null, email: null }], ["กลุ่ม ก"]);
    expect(a.counts.update).toBe(1);
    expect(a.rows[0].position).toBe("ครู");
  });
  it("จำกัดจำนวนแถว", () => {
    const rows = Array.from({ length: 3001 }, (_, i) => `ก,ชื่อ ${i}`).join("\n");
    expect(analyzeImport("กลุ่มสาระ,ชื่อ-นามสกุล\n" + rows, [], []).ok).toBe(false);
  });
});
