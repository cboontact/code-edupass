import { jwtVerify, SignJWT } from "jose";
import { getEnv, type AppEnv } from "./env";

export interface Identity { actor: string; isAdmin: true }
export type AuthResult =
  | { ok: true; identity: Identity }
  | { ok: false; reason: "not_configured" | "unauthenticated" };
type HeaderReader = { get(name: string): string | null };
export const ADMIN_COOKIE = "edupass_admin_session";
export const SESSION_SECONDS = 8 * 60 * 60;
const encoder = new TextEncoder();
const PASSWORD_HASH_PATTERN = /^pbkdf2-sha256\$100000\$[a-f0-9]{32}\$[a-f0-9]{64}$/;

export function adminConfigured(env: AppEnv): boolean {
  return !!env.ADMIN_USERNAME?.trim() && env.ADMIN_USERNAME.length <= 100
    && PASSWORD_HASH_PATTERN.test(env.ADMIN_PASSWORD_HASH ?? "")
    && (env.ADMIN_SESSION_SECRET?.length ?? 0) >= 32;
}

export async function verifyPasswordHash(password: string, passwordHash: string): Promise<boolean> {
  if (!password || password.length > 256 || !PASSWORD_HASH_PATTERN.test(passwordHash)) return false;
  const [, , saltHex, expectedHex] = passwordHash.split("$");
  const salt = Uint8Array.from(saltHex.match(/../g)!, (byte) => parseInt(byte, 16));
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const actual = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 }, material, 256));
  const expected = Uint8Array.from(expectedHex.match(/../g)!, (byte) => parseInt(byte, 16));
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= actual[i] ^ expected[i];
  return difference === 0;
}

export async function verifyAdminPassword(password: string, env: AppEnv): Promise<boolean> {
  if (!adminConfigured(env) || !password || password.length > 256) return false;
  return verifyPasswordHash(password, env.ADMIN_PASSWORD_HASH!);
}

export async function verifyAdminCredentials(username: string, password: string, env: AppEnv): Promise<boolean> {
  const normalizedUsername = username.trim();
  if (!adminConfigured(env) || !normalizedUsername || normalizedUsername.length > 100) return false;
  if (normalizedUsername === env.ADMIN_USERNAME)
    return verifyPasswordHash(password, env.ADMIN_PASSWORD_HASH!);
  try {
    const account = await env.DB.prepare(
      "SELECT password_hash FROM admin_accounts WHERE username = ? AND active = 1",
    ).bind(normalizedUsername).first<{ password_hash: string }>();
    return !!account && await verifyPasswordHash(password, account.password_hash);
  } catch {
    return false;
  }
}

async function isActiveAdmin(username: string, env: AppEnv): Promise<boolean> {
  if (username === env.ADMIN_USERNAME) return true;
  try {
    return !!await env.DB.prepare(
      "SELECT 1 AS active FROM admin_accounts WHERE username = ? AND active = 1",
    ).bind(username).first<{ active: number }>();
  } catch {
    return false;
  }
}

export async function createAdminSession(env: AppEnv, username = env.ADMIN_USERNAME): Promise<string> {
  if (!adminConfigured(env) || !username?.trim() || username.length > 100)
    throw new Error("Admin authentication is not configured");
  return new SignJWT({ role: "admin" }).setProtectedHeader({ alg: "HS256" }).setSubject(username.trim())
    .setIssuer("edupass").setAudience("edupass-admin").setIssuedAt().setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(encoder.encode(env.ADMIN_SESSION_SECRET));
}

export async function authenticate(headers: HeaderReader, env: AppEnv = getEnv()): Promise<AuthResult> {
  if (!adminConfigured(env)) return { ok: false, reason: "not_configured" };
  const cookie = (headers.get("cookie") ?? "").split(";").map((part) => part.trim()).find((part) => part.startsWith(`${ADMIN_COOKIE}=`));
  if (!cookie) return { ok: false, reason: "unauthenticated" };
  try {
    const token = decodeURIComponent(cookie.slice(ADMIN_COOKIE.length + 1));
    const { payload } = await jwtVerify(token, encoder.encode(env.ADMIN_SESSION_SECRET), {
      algorithms: ["HS256"], issuer: "edupass", audience: "edupass-admin", maxTokenAge: SESSION_SECONDS,
      requiredClaims: ["exp", "iat", "sub"],
    });
    if (typeof payload.sub !== "string" || payload.role !== "admin" || !await isActiveAdmin(payload.sub, env))
      return { ok: false, reason: "unauthenticated" };
    return { ok: true, identity: { actor: payload.sub, isAdmin: true } };
  } catch { return { ok: false, reason: "unauthenticated" }; }
}

export function sessionCookie(req: Request, token: string, maxAge = SESSION_SECONDS): string {
  const secure = new URL(req.url).protocol === "https:" ? "; Secure" : "";
  return `${ADMIN_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}
