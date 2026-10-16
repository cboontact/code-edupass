import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ saved: false, existing: false, storageFails: false, files: new Set<string>() }));
vi.mock("../src/lib/env", () => ({
  getEnv: () => ({
    DB: {
      prepare: (sql: string) => ({
        bind() { return this; },
        async all() { return { results: [] }; },
        async first() {
          if (sql.includes("FROM staff")) return { id: 1 };
          if (sql.includes("FROM submissions")) return state.existing ? { id: 1, object_key: "previous.png" } : null;
          return null;
        },
        async run() {
          if (sql.includes("INSERT INTO submissions")) {
            if (state.saved) return { meta: { changes: 0 } };
            state.saved = true;
          }
          return { meta: { changes: 1 } };
        },
      }),
    },
    EVIDENCE: {
      async put(key: string) {
        if (state.storageFails) throw new Error("storage unavailable");
        state.files.add(key);
      },
      async delete(key: string) { state.files.delete(key); },
    },
  }),
}));

const { POST } = await import("../src/app/api/submissions/route");
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
function request(bytes = png, origin = "https://edupass.example") {
  const form = new FormData();
  form.set("staffId", "1");
  form.set("file", new File([bytes], "evidence.png", { type: "image/png" }));
  return new Request("https://edupass.example/api/submissions", { method: "POST", headers: { Origin: origin }, body: form });
}

beforeEach(() => { state.saved = false; state.existing = false; state.storageFails = false; state.files.clear(); });
describe("การส่งหลักฐานโดยไม่ต้องเข้าสู่ระบบ", () => {
  it("ส่งได้โดยไม่มี cookie หรืออีเมลผูกบัญชี", async () => {
    expect((await POST(request())).status).toBe(201);
    expect(state.saved).toBe(true);
    expect(state.files.size).toBe(1);
  });
  it("การส่งพร้อมกันบันทึกได้เพียงครั้งเดียวและลบไฟล์ของคำขอที่ชนกัน", async () => {
    const responses = await Promise.all([POST(request()), POST(request())]);
    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(state.files.size).toBe(1);
  });
  it("ปฏิเสธการส่งซ้ำเมื่อไม่อนุญาตให้แทนที่", async () => {
    state.existing = true;
    expect((await POST(request())).status).toBe(409);
    expect(state.files.size).toBe(0);
  });
  it("ปฏิเสธคำขอจากเว็บอื่นและไฟล์ที่ไม่ใช่ภาพ", async () => {
    expect((await POST(request(png, "https://other.example"))).status).toBe(403);
    expect((await POST(request(new Uint8Array([1, 2, 3])))).status).toBe(400);
    expect(state.saved).toBe(false);
  });
  it("แจ้งข้อผิดพลาดเมื่อจัดเก็บภาพไม่ได้และไม่บันทึกสถานะสำเร็จ", async () => {
    state.storageFails = true;
    expect((await POST(request())).status).toBe(503);
    expect(state.saved).toBe(false);
  });
});
