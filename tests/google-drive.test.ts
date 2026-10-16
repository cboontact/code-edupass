import { afterEach, describe, expect, it, vi } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import { uploadStudentEvidence } from "../src/lib/google-drive";

afterEach(() => vi.unstubAllGlobals());

describe("Google Drive เมื่อมีการส่งพร้อมกัน", () => {
  it("ค้นหาโฟลเดอร์เพียงครั้งเดียวและใช้ Folder ID เดิมกับคำขอถัดไป", async () => {
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const folders = new Map<string, string>();
    const db = {
      prepare: (sql: string) => ({
        bind: (path: string, folderId?: string) => ({
          first: async () => folders.has(path) ? { folder_id: folders.get(path) } : null,
          run: async () => { if (folderId) folders.set(path, folderId); return { meta: { changes: 1 } }; },
        }),
      }),
    } as unknown as D1Database;
    let searches = 0;
    let uploads = 0;
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("oauth2.googleapis.com")) return Response.json({ access_token: "token", expires_in: 3600 });
      if (url.includes("upload/drive")) { uploads++; return Response.json({ id: `file-${uploads}` }); }
      if (url.includes("drive/v3/files?q=")) { searches++; return Response.json({ files: [{ id: `folder-${searches}` }] }); }
      throw new Error(`unexpected request: ${url}`);
    }));
    const env = {
      DB: db,
      GOOGLE_SERVICE_ACCOUNT_EMAIL: "service@example.test",
      GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: pem,
      GOOGLE_DRIVE_FOLDER_ID: "root",
    };
    const bytes = new Uint8Array([0xff, 0xd8, 0xff]).buffer;

    await Promise.all([
      uploadStudentEvidence(env, bytes, "image/jpeg", "jpg", "10001", { grade: "ม.1", room: "ห้อง 1" }),
      uploadStudentEvidence(env, bytes, "image/jpeg", "jpg", "10002", { grade: "ม.1", room: "ห้อง 1" }),
    ]);

    expect(searches).toBe(2);
    expect(uploads).toBe(2);
    expect(folders.get("ม.1/ห้อง 1")).toBe("folder-2");
  });
});
