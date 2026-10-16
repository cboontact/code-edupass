import { importPKCS8, SignJWT } from "jose";
import type { FileType } from "./settings";

type DriveEnv = {
  DB: D1Database;
  GOOGLE_SERVICE_ACCOUNT_EMAIL?: string;
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?: string;
  GOOGLE_DRIVE_FOLDER_ID?: string;
};

let cachedToken: { value: string; expiresAt: number; email: string } | null = null;
let pendingToken: Promise<string> | null = null;
const folderIdCache = new Map<string, string>();
const pendingFolders = new Map<string, Promise<string>>();

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function driveFetch(input: string, init?: RequestInit): Promise<Response> {
  let response: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    response = await fetch(input, init);
    const retryable = response.status === 403 || response.status === 429 || response.status >= 500;
    if (!retryable || attempt === 2) return response;
    await response.body?.cancel().catch(() => undefined);
    await wait((2 ** attempt) * 1000 + Math.floor(Math.random() * 500));
  }
  return response!;
}

function config(env: DriveEnv) {
  const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  const folderId = env.GOOGLE_DRIVE_FOLDER_ID?.trim();
  if (!email || !privateKey || !folderId) throw new Error("google_drive_not_configured");
  return { email, privateKey, folderId };
}

async function accessToken(env: DriveEnv): Promise<string> {
  const { email, privateKey } = config(env);
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.email === email && cachedToken.expiresAt > now + 60) return cachedToken.value;
  if (pendingToken) return pendingToken;
  pendingToken = (async () => {
    const key = await importPKCS8(privateKey, "RS256");
    const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/drive" })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .setIssuer(email)
      .setAudience("https://oauth2.googleapis.com/token")
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(key);
    const response = await driveFetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    });
    if (!response.ok) throw new Error(`google_oauth_${response.status}`);
    const data = await response.json() as { access_token?: string; expires_in?: number };
    if (!data.access_token) throw new Error("google_oauth_missing_token");
    cachedToken = { value: data.access_token, expiresAt: now + (data.expires_in ?? 3600), email };
    return data.access_token;
  })();
  try { return await pendingToken; }
  finally { pendingToken = null; }
}

function driveQueryValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function ensureFolder(token: string, parentId: string, name: string): Promise<string> {
  const query = `'${driveQueryValue(parentId)}' in parents and name = '${driveQueryValue(name)}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const search = await driveFetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&spaces=drive&includeItemsFromAllDrives=true&supportsAllDrives=true&fields=files(id,name)&pageSize=10`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!search.ok) throw new Error(`google_drive_folder_search_${search.status}`);
  const found = await search.json() as { files?: { id: string; name: string }[] };
  if (found.files?.[0]?.id) return found.files[0].id;
  const create = await driveFetch("https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", parents: [parentId] }),
  });
  if (!create.ok) throw new Error(`google_drive_folder_create_${create.status}`);
  const folder = await create.json() as { id?: string };
  if (!folder.id) throw new Error("google_drive_missing_folder_id");
  return folder.id;
}

async function cachedFolder(env: DriveEnv, token: string, parentId: string, path: string, name: string): Promise<string> {
  const memory = folderIdCache.get(path);
  if (memory) return memory;
  const stored = await env.DB.prepare("SELECT folder_id FROM google_drive_folders WHERE path = ?")
    .bind(path).first<{ folder_id: string }>();
  if (stored?.folder_id) {
    folderIdCache.set(path, stored.folder_id);
    return stored.folder_id;
  }
  const pending = pendingFolders.get(path);
  if (pending) return pending;
  const resolving = (async () => {
    const id = await ensureFolder(token, parentId, name);
    await env.DB.prepare(
      `INSERT INTO google_drive_folders (path, folder_id) VALUES (?, ?)
       ON CONFLICT(path) DO UPDATE SET folder_id = excluded.folder_id,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
    ).bind(path, id).run();
    folderIdCache.set(path, id);
    return id;
  })();
  pendingFolders.set(path, resolving);
  try { return await resolving; }
  finally { pendingFolders.delete(path); }
}

async function evidenceFolder(env: DriveEnv, token: string, rootId: string, folders: { grade: string; room: string }) {
  const roomPath = `${folders.grade}/${folders.room}`;
  const memory = folderIdCache.get(roomPath);
  if (memory) return memory;
  const stored = await env.DB.prepare("SELECT folder_id FROM google_drive_folders WHERE path = ?")
    .bind(roomPath).first<{ folder_id: string }>();
  if (stored?.folder_id) {
    folderIdCache.set(roomPath, stored.folder_id);
    return stored.folder_id;
  }
  const gradeFolderId = await cachedFolder(env, token, rootId, folders.grade, folders.grade);
  return cachedFolder(env, token, gradeFolderId, roomPath, folders.room);
}

export async function uploadStudentEvidence(
  env: DriveEnv,
  bytes: ArrayBuffer,
  contentType: FileType,
  extension: string,
  studentNumber: string,
  folders: { grade: string; room: string },
): Promise<string> {
  const { folderId } = config(env);
  const token = await accessToken(env);
  const roomFolderId = await evidenceFolder(env, token, folderId, folders);
  const boundary = `edupass_${crypto.randomUUID().replaceAll("-", "")}`;
  const metadata = JSON.stringify({
    name: `${studentNumber}.${extension}`,
    parents: [roomFolderId],
    mimeType: contentType,
  });
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
    `--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`,
    bytes,
    `\r\n--${boundary}--`,
  ]);
  const response = await driveFetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
  if (!response.ok) throw new Error(`google_drive_upload_${response.status}`);
  const data = await response.json() as { id?: string };
  if (!data.id) throw new Error("google_drive_missing_file_id");
  return data.id;
}

export async function getDriveFile(env: DriveEnv, fileId: string): Promise<Response> {
  const token = await accessToken(env);
  return driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function deleteDriveFile(env: DriveEnv, fileId: string): Promise<void> {
  const token = await accessToken(env);
  const response = await driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?supportsAllDrives=true`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ trashed: true }),
  });
  if (!response.ok && response.status !== 404) throw new Error(`google_drive_delete_${response.status}`);
}

export function googleDriveConfigured(env: DriveEnv): boolean {
  return !!(env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() && env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim() && env.GOOGLE_DRIVE_FOLDER_ID?.trim());
}
