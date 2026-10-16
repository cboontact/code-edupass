import { beforeAll, describe, expect, it, vi } from "vitest";
import { pbkdf2Sync } from "node:crypto";
import { SignJWT } from "jose";

vi.mock("../src/lib/env", () => ({ getEnv: () => ({}) }));
const { authenticate, createAdminSession, verifyAdminCredentials, verifyAdminPassword, sessionCookie } = await import("../src/lib/auth");
const { sameOriginOk } = await import("../src/lib/api");
const { isPastDeadline } = await import("../src/lib/settings");
const h = (o: Record<string, string> = {}) => ({ get: (k: string) => o[k.toLowerCase()] ?? null });
const base = { DB: {} as D1Database, EVIDENCE: {} as R2Bucket };
const password = "valid-private-admin-password";
const salt = "a1".repeat(16);
const env = {
  ...base,
  ADMIN_USERNAME: "school-admin",
  ADMIN_PASSWORD_HASH: `pbkdf2-sha256$100000$${salt}$${pbkdf2Sync(password, Buffer.from(salt, "hex"), 100000, 32, "sha256").toString("hex")}`,
  ADMIN_SESSION_SECRET: "secret".repeat(8),
};

describe("สิทธิ์ผู้ดูแลระบบ", () => {
  let token: string;
  beforeAll(async () => { token = await createAdminSession(env); });
  it("รับรหัสผ่านที่ถูกต้องและปฏิเสธรหัสผ่านอื่น", async () => {
    expect(await verifyAdminPassword(password, env)).toBe(true);
    expect(await verifyAdminPassword("wrong", env)).toBe(false);
    expect(await verifyAdminPassword("", env)).toBe(false);
  });
  it("รองรับบัญชีผู้ดูแลเพิ่มเติมจากฐานข้อมูล", async () => {
    const secondaryPassword = "secondary-private-password";
    const secondaryHash = `pbkdf2-sha256$100000$${salt}$${pbkdf2Sync(secondaryPassword, Buffer.from(salt, "hex"), 100000, 32, "sha256").toString("hex")}`;
    const db = {
      prepare: () => ({
        bind: (username: string) => ({
          first: async () => username === "secondary-admin" ? { password_hash: secondaryHash, active: 1 } : null,
        }),
      }),
    } as unknown as D1Database;
    const secondaryEnv = { ...env, DB: db };
    expect(await verifyAdminCredentials("secondary-admin", secondaryPassword, secondaryEnv)).toBe(true);
    expect(await verifyAdminCredentials("secondary-admin", "wrong", secondaryEnv)).toBe(false);
    const secondaryToken = await createAdminSession(secondaryEnv, "secondary-admin");
    expect(await authenticate(h({ cookie: `edupass_admin_session=${secondaryToken}` }), secondaryEnv))
      .toEqual({ ok: true, identity: { actor: "secondary-admin", isAdmin: true } });
  });
  it("ไม่ให้สิทธิ์เมื่อยังไม่ตั้งค่ารหัสผ่านหรือ session secret", async () => {
    expect(await authenticate(h(), base)).toEqual({ ok: false, reason: "not_configured" });
    expect(await verifyAdminPassword(password, { ...env, ADMIN_SESSION_SECRET: "short" })).toBe(false);
  });
  it("ยอมรับ session ที่ลงลายเซ็นและไม่หมดอายุ", async () => {
    expect(await authenticate(h({ cookie: `edupass_admin_session=${token}` }), env))
      .toEqual({ ok: true, identity: { actor: "school-admin", isAdmin: true } });
  });
  it("ปฏิเสธ cookie เก่า cookie เสีย และ session ที่ถูกแก้ไข", async () => {
    for (const cookie of ["", "edupass_dev_user=admin@example.test", "edupass_admin_session=%", `edupass_admin_session=${token}x`]) {
      expect(await authenticate(h({ cookie }), env)).toEqual({ ok: false, reason: "unauthenticated" });
    }
  });
  it("ปฏิเสธ session ที่หมดอายุหรือเซ็นด้วย secret อื่น", async () => {
    const expired = await new SignJWT({ role: "admin" }).setProtectedHeader({ alg: "HS256" }).setSubject(env.ADMIN_USERNAME)
      .setIssuer("edupass").setAudience("edupass-admin").setIssuedAt(1).setExpirationTime(2)
      .sign(new TextEncoder().encode(env.ADMIN_SESSION_SECRET));
    expect(await authenticate(h({ cookie: `edupass_admin_session=${expired}` }), env)).toMatchObject({ ok: false });
    expect(await authenticate(h({ cookie: `edupass_admin_session=${token}` }), { ...env, ADMIN_SESSION_SECRET: "different".repeat(8) })).toMatchObject({ ok: false });
    expect(await authenticate(h({ cookie: `edupass_admin_session=${token}` }), { ...env, ADMIN_USERNAME: "another-admin" })).toMatchObject({ ok: false });
  });
  it("cookie เป็น HttpOnly, SameSite=Strict และ Secure บน HTTPS", () => {
    const cookie = sessionCookie(new Request("https://app.example"), "token");
    expect(cookie).toContain("HttpOnly; SameSite=Strict");
    expect(cookie).toContain("; Secure");
    expect(sessionCookie(new Request("http://localhost:3001"), "", 0)).toContain("Max-Age=0");
  });
});

describe("คำขอและกำหนดส่ง", () => {
  it("คำขอแก้ข้อมูลต้องมาจาก origin เดียวกันทั้ง scheme และ host", () => {
    const mk = (origin?: string) => new Request("https://app.example/api/x", { method: "POST", headers: origin ? { origin } : {} });
    expect(sameOriginOk(mk("https://app.example"))).toBe(true);
    expect(sameOriginOk(mk("http://app.example"))).toBe(false);
    expect(sameOriginOk(mk("https://other.example"))).toBe(false);
    expect(sameOriginOk(mk())).toBe(false);
    expect(sameOriginOk(new Request("https://app.example/api/x"))).toBe(true);
  });
  it("กำหนดส่งหมดเมื่อสิ้นวันเวลาไทย", () => {
    expect(isPastDeadline("", new Date())).toBe(false);
    expect(isPastDeadline("2026-01-31", new Date("2026-01-31T16:59:00Z"))).toBe(false);
    expect(isPastDeadline("2026-01-31", new Date("2026-01-31T17:01:00Z"))).toBe(true);
  });
});
