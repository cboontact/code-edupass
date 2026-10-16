"use client";
import { readJson } from "@/lib/http";
import { useEffect, useState } from "react";
import { Button, Card, Field, Icon, Notice, Skeleton, inputClass } from "./ui";
import { useToast } from "./toast";
import { FILE_TYPE_OPTIONS, type FileType, type Settings } from "@/lib/settings";

export function SettingsForm() {
  const toast = useToast();
  const [s, setS] = useState<Settings | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings").then(async (r) => { if (!r.ok) throw new Error(); setS((await readJson(r)).settings); }).catch(() => setLoadError(true));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!s || busy) return;
    setBusy(true); setErrors({});
    try {
      const r = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
      const d = await readJson(r);
      if (!r.ok) { setErrors(d?.error?.fields ?? { form: d?.error?.message ?? "บันทึกไม่สำเร็จ" }); toast("error", "บันทึกไม่สำเร็จ กรุณาตรวจสอบข้อมูล"); return; }
      setS(d.settings); toast("success", "บันทึกการตั้งค่าเรียบร้อยแล้ว");
    } catch { toast("error", "เชื่อมต่อไม่สำเร็จ"); }
    finally { setBusy(false); }
  }

  const check = "size-5 accent-blue-700";
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="flex items-center gap-3 text-2xl font-bold"><Icon name="sliders" className="text-blue-700" /> ตั้งค่าระบบ</h1>
      {loadError && <Notice tone="error" icon="triangle-exclamation" title="โหลดการตั้งค่าไม่สำเร็จ" />}
      {!s && !loadError && <Card className="space-y-3"><Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-24" /></Card>}
      {s && (
        <form onSubmit={save} noValidate>
          <Card className="space-y-5">
            {errors.form && <Notice tone="error" icon="triangle-exclamation" title={errors.form} />}
            <Field id="maxFileMb" label="ขนาดไฟล์สูงสุด (MB)" error={errors.maxFileMb}>
              <input id="maxFileMb" type="number" min={1} max={20} step={1} className={inputClass} value={s.maxFileMb} aria-invalid={!!errors.maxFileMb}
                onChange={(e) => setS({ ...s, maxFileMb: Number(e.target.value) })} />
            </Field>
            <fieldset aria-describedby={errors.allowedTypes ? "types-error" : undefined}>
              <legend className="text-base font-semibold">ชนิดไฟล์ที่รับ</legend>
              <div className="mt-2 flex flex-wrap gap-4">
                {(Object.keys(FILE_TYPE_OPTIONS) as FileType[]).map((t) => (
                  <label key={t} className="flex min-h-11 items-center gap-2">
                    <input type="checkbox" className={check} checked={s.allowedTypes.includes(t)}
                      onChange={(e) => setS({ ...s, allowedTypes: e.target.checked ? [...s.allowedTypes, t] : s.allowedTypes.filter((x) => x !== t) })} />
                    {FILE_TYPE_OPTIONS[t].label}
                  </label>
                ))}
              </div>
              {errors.allowedTypes && <p id="types-error" role="alert" className="mt-1 text-sm font-medium text-red-700">{errors.allowedTypes}</p>}
            </fieldset>
            <Field id="deadline" label="กำหนดส่ง" hint="เว้นว่างหากยังไม่กำหนด" error={errors.deadline}>
              <input id="deadline" type="date" className={inputClass} value={s.deadline} onChange={(e) => setS({ ...s, deadline: e.target.value })} />
            </Field>
            <label className="flex min-h-11 items-center gap-3"><input type="checkbox" className={check} checked={s.blockAfterDeadline} onChange={(e) => setS({ ...s, blockAfterDeadline: e.target.checked })} /> ปิดรับหลักฐานหลังเลยกำหนดส่ง</label>
            <label className="flex min-h-11 items-center gap-3"><input type="checkbox" className={check} checked={s.allowResubmit} onChange={(e) => setS({ ...s, allowResubmit: e.target.checked })} /> อนุญาตให้ส่งซ้ำ/แทนที่หลักฐานเดิม</label>
            <Field id="evidenceInstructions" label="ข้อมูลที่ต้องปรากฏในภาพหลักฐาน" hint="แสดงให้ครูเห็นในหน้าส่งหลักฐาน (เว้นว่างหากยังไม่กำหนด)" error={errors.evidenceInstructions}>
              <textarea id="evidenceInstructions" rows={4} maxLength={1000} className={inputClass} value={s.evidenceInstructions} onChange={(e) => setS({ ...s, evidenceInstructions: e.target.value })} />
            </Field>
            <Button type="submit" icon="floppy-disk" loading={busy} loadingText="กำลังบันทึก…">บันทึกการตั้งค่า</Button>
          </Card>
        </form>
      )}
    </div>
  );
}
