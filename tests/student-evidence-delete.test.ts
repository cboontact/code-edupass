import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ admin: true, version: "old" as string | null, trashed: [] as string[], fail: false }));
vi.mock("../src/lib/auth", () => ({ authenticate: async () => state.admin
  ? { ok: true, identity: { actor: "admin", isAdmin: true } }
  : { ok: false, reason: "unauthenticated" } }));
vi.mock("../src/lib/env", () => ({ getEnv: () => ({ DB: {
  prepare: (sql: string) => ({
    bind: (...args: unknown[]) => ({
      first: async () => {
        if (!sql.startsWith("DELETE FROM student_submissions")) throw new Error("Unexpected SQL");
        if (args[0] !== 1 || args[1] !== state.version) return null;
        state.version = null;
        return { drive_file_id: "old-file" };
      },
      run: async () => ({ meta: { changes: 1 } }),
    }),
  }),
} }) }));
vi.mock("../src/lib/google-drive", () => ({
  getDriveFile: vi.fn(),
  deleteDriveFile: async (_env: unknown, id: string) => {
    if (state.fail) throw new Error("Drive unavailable");
    state.trashed.push(id);
  },
}));
const { DELETE } = await import("../src/app/api/admin/student-evidence/[studentId]/route");
const ctx = { params: Promise.resolve({ studentId: "1" }) };
function req(origin = "https://school.test", version = "old") {
  return new Request("https://school.test/api/admin/student-evidence/1", {
    method: "DELETE", headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ updatedAt: version }),
  });
}
beforeEach(() => { state.admin = true; state.version = "old"; state.trashed = []; state.fail = false; });
it("requires admin and same origin before changing data", async () => {
  state.admin = false;
  expect((await DELETE(req(), ctx)).status).toBe(401);
  state.admin = true;
  expect((await DELETE(req("https://other.test"), ctx)).status).toBe(403);
  expect(state.version).toBe("old");
});
it("removes the submission and trashes only its file", async () => {
  expect((await DELETE(req(), ctx)).status).toBe(200);
  expect(state.version).toBeNull();
  expect(state.trashed).toEqual(["old-file"]);
});
it("does not delete a newer submission or trash its file", async () => {
  state.version = "new";
  expect((await DELETE(req(), ctx)).status).toBe(409);
  expect(state.version).toBe("new");
  expect(state.trashed).toEqual([]);
});
it("concurrent deletes only remove and trash once", async () => {
  const results = await Promise.all([DELETE(req(), ctx), DELETE(req(), ctx)]);
  expect(results.map(r => r.status).sort()).toEqual([200, 409]);
  expect(state.trashed).toEqual(["old-file"]);
});
it("reports cleanup failure without restoring submitted status", async () => {
  state.fail = true;
  vi.spyOn(console, "error").mockImplementation(() => {});
  const result = await DELETE(req(), ctx);
  expect(await result.json()).toEqual({ ok: true, cleanupPending: true });
  expect(state.version).toBeNull();
  vi.restoreAllMocks();
});
