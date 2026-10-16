import { readFile } from "node:fs/promises";
import { importPKCS8, SignJWT } from "jose";

const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
if (!credentialsPath || !folderId) throw new Error("Missing GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_DRIVE_FOLDER_ID");
const credentials = JSON.parse(await readFile(credentialsPath, "utf8"));
const now = Math.floor(Date.now() / 1000);
const key = await importPKCS8(credentials.private_key, "RS256");
const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/drive" })
  .setProtectedHeader({ alg: "RS256", typ: "JWT" })
  .setIssuer(credentials.client_email)
  .setAudience("https://oauth2.googleapis.com/token")
  .setIssuedAt(now)
  .setExpirationTime(now + 600)
  .sign(key);
const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
});
if (!tokenResponse.ok) throw new Error(`OAuth failed: ${tokenResponse.status} ${await tokenResponse.text()}`);
const { access_token: token } = await tokenResponse.json();
if (process.env.GOOGLE_DRIVE_DEBUG === "1") {
  const drives = await fetch("https://www.googleapis.com/drive/v3/drives?fields=drives(id,name)", { headers: { Authorization: `Bearer ${token}` } });
  const files = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${folderId}' in parents`)}&includeItemsFromAllDrives=true&supportsAllDrives=true&fields=files(id,name,driveId)`, { headers: { Authorization: `Bearer ${token}` } });
  console.log(JSON.stringify({ drives: await drives.json(), files: await files.json() }));
  process.exit(0);
}
if (process.env.GOOGLE_DRIVE_CLEANUP_FILE_ID) {
  const id = process.env.GOOGLE_DRIVE_CLEANUP_FILE_ID;
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?supportsAllDrives=true`, { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ trashed: true }) });
  if (!response.ok) throw new Error(`Cleanup failed: ${response.status} ${await response.text()}`);
  console.log("Google Drive cleanup succeeded.");
  process.exit(0);
}
const boundary = `verify_${crypto.randomUUID().replaceAll("-", "")}`;
const metadata = JSON.stringify({ name: `edupass-connection-test-${Date.now()}.txt`, parents: [folderId], mimeType: "text/plain" });
const uploadResponse = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": `multipart/related; boundary=${boundary}` },
  body: new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`, `--${boundary}\r\nContent-Type: text/plain\r\n\r\n`, "EDU Pass connection test", `\r\n--${boundary}--`]),
});
if (!uploadResponse.ok) throw new Error(`Upload failed: ${uploadResponse.status} ${await uploadResponse.text()}`);
const { id } = await uploadResponse.json();
const deleteResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?supportsAllDrives=true`, { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ trashed: true }) });
if (!deleteResponse.ok) throw new Error(`Upload passed but cleanup failed: ${deleteResponse.status} ${await deleteResponse.text()}`);
console.log("Google Drive upload and cleanup succeeded.");
