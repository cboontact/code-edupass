"use client";

import { useState } from "react";
import { Button, Card, Field, Icon, inputClass } from "./ui";
import { readJson } from "@/lib/http";

export function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      const data = await readJson(response);
      if (!response.ok) { setError(data?.error?.message ?? "เข้าสู่ระบบไม่สำเร็จ"); return; }
      window.location.reload();
    } catch { setError("เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"); }
    finally { setBusy(false); }
  }

  return (
    <Card className="mx-auto max-w-md space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold"><Icon name="user-shield" className="text-blue-700" />เข้าสู่ระบบผู้ดูแล</h1>
        <p className="mt-2 text-sm text-slate-600">สำหรับจัดการรายชื่อ ตรวจหลักฐาน และตั้งค่าระบบ</p>
      </div>
      <form onSubmit={login} className="space-y-4">
        <Field id="admin-username" label="ชื่อผู้ใช้">
          <input id="admin-username" name="username" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={100} disabled={busy}
            value={username} onChange={(event) => setUsername(event.target.value)} className={inputClass} />
        </Field>
        <Field id="admin-password" label="รหัสผ่าน" error={error ?? undefined}>
          <input id="admin-password" name="password" type="password" autoComplete="current-password" required maxLength={256} disabled={busy}
            value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass}
            aria-invalid={!!error} aria-describedby={error ? "admin-password-error" : undefined} />
        </Field>
        <Button type="submit" icon="right-to-bracket" loading={busy} loadingText="กำลังเข้าสู่ระบบ…" className="w-full">เข้าสู่ระบบ</Button>
      </form>
    </Card>
  );
}
