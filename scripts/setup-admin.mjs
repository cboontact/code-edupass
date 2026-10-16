import { randomBytes, pbkdf2Sync } from 'node:crypto';
import { readFile, writeFile, chmod } from 'node:fs/promises';

const envFile = new URL('../.dev.vars', import.meta.url);
const credentialsFile = new URL('../.admin-credentials', import.meta.url);
const current = await readFile(envFile, 'utf8').catch(() => '');
if (/^ADMIN_USERNAME=.+$/m.test(current) && /^ADMIN_PASSWORD_HASH=.+$/m.test(current) && /^ADMIN_SESSION_SECRET=.+$/m.test(current)) {
  console.log('ตั้งค่าผู้ดูแลไว้แล้ว รหัสผ่านอยู่ในไฟล์ .admin-credentials');
  process.exit(0);
}
const username = "admin";
const password = randomBytes(18).toString('base64url');
const salt = randomBytes(16).toString('hex');
const hash = pbkdf2Sync(password, Buffer.from(salt, 'hex'), 100000, 32, 'sha256').toString('hex');
const secret = randomBytes(48).toString('base64url');
await writeFile(envFile, `ADMIN_USERNAME=${username}\nADMIN_PASSWORD_HASH='pbkdf2-sha256$100000$${salt}$${hash}'\nADMIN_SESSION_SECRET=${secret}\n`, { mode: 0o600 });
await chmod(envFile, 0o600);
await writeFile(credentialsFile, `EDU Pass — บัญชีผู้ดูแลระบบ\nหน้าเข้าสู่ระบบ: /admin\nชื่อผู้ใช้: ${username}\nรหัสผ่าน: ${password}\n\nเก็บไฟล์นี้ไว้เฉพาะผู้ดูแล ห้ามเผยแพร่หรือเพิ่มใน Git\n`, { mode: 0o600 });
console.log('ตั้งค่าผู้ดูแลแล้ว เปิดไฟล์ .admin-credentials เพื่อดูรหัสผ่าน');
