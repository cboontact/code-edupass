"use client";

import { useState } from "react";
import { Button } from "./ui";
import { useToast } from "./toast";

export function AdminLogout() {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  async function logout() {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/logout", { method: "POST" });
      if (!response.ok) throw new Error();
      window.location.assign("/");
    } catch { toast("error", "ออกจากระบบไม่สำเร็จ กรุณาลองใหม่"); setBusy(false); }
  }
  return <Button variant="ghost" icon="right-from-bracket" loading={busy} onClick={logout}>ออกจากระบบ</Button>;
}
