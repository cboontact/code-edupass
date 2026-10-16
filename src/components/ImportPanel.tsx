"use client";
import { readJson } from "@/lib/http";
import { useRef, useState } from "react";
import { Button, Card, Field, Icon, Notice, inputClass } from "./ui";
import { useToast } from "./toast";

type Status = "new" | "update" | "unchanged" | "duplicate" | "incomplete" | "invalid";
interface PreviewRow { line: number; department: string; name: string; position: string; email: string; status: Status; reason?: string }
interface Preview { counts: Record<Status, number>; newDepartments: string[]; rows: PreviewRow[]; rowsTruncated: boolean; totalRows: number }

const LABEL: Record<Status, { text: string; cls: string }> = {
  new: { text: "เพิ่มใหม่", cls: "bg-emerald-100 text-emerald-800" },
  update: { text: "อัปเดต", cls: "bg-sky-100 text-sky-800" },
  unchanged: { text: "มีอยู่แล้ว", cls: "bg-slate-100 text-slate-700" },
  duplicate: { text: "ซ้ำในไฟล์", cls: "bg-orange-100 text-orange-800" },
  incomplete: { text: "ข้อมูลไม่ครบ", cls: "bg-red-100 text-red-800" },
  invalid: { text: "ไม่ถูกต้อง", cls: "bg-red-100 text-red-800" },
};

export function ImportPanel() {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"preview" | "commit" | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function send(path: string, kind: "preview" | "commit") {
    if (busy) return;
    if (!file) return setError("กรุณาเลือกไฟล์ CSV");
    setBusy(kind); setError(null);
    try {
      const fd = new FormData(); fd.set("file", file);
      const r = await fetch(path, { method: "POST", body: fd });
      const d = await readJson(r);
      if (!r.ok) return setError(d?.error?.message ?? "ดำเนินการไม่สำเร็จ");
      if (kind === "preview") { setPreview(d); setResult(null); }
      else {
        const msg = `นำเข้าสำเร็จ: เพิ่มใหม่ ${d.imported} · อัปเดต ${d.updated} · ข้าม ${d.skipped}`;
        setResult(msg); setPreview(null); setFile(null); if (input.current) input.current.value = "";
        toast("success", msg);
      }
    } catch { setError("เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่"); }
    finally { setBusy(null); }
  }

  const importable = preview ? preview.counts.new + preview.counts.update : 0;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-3 text-2xl font-bold"><Icon name="file-csv" className="text-blue-700" /> นำเข้ารายชื่อ</h1>
        <p className="mt-1 text-slate-600">อัปโหลดไฟล์ CSV (UTF-8) เพื่อเพิ่มหรืออัปเดตรายชื่อ ระบบจะแสดงตัวอย่างและตรวจข้อมูลก่อนยืนยัน การนำเข้าไม่ลบรายชื่อที่มีอยู่</p>
      </div>
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <a href="/templates/staff-template.csv" download className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold hover:bg-slate-50">
            <Icon name="download" /> ดาวน์โหลดแม่แบบ CSV
          </a>
          <p className="text-sm text-slate-600">คอลัมน์: <strong>กลุ่มสาระ</strong>, <strong>ชื่อ-นามสกุล</strong>, <em>ตำแหน่ง (ไม่บังคับ)</em>, <em>อีเมล (ไม่บังคับ)</em></p>
        </div>
        <Field id="csv" label="ไฟล์ CSV" error={error ?? undefined} hint="ขนาดไม่เกิน 1 MB">
          <input ref={input} id="csv" type="file" accept=".csv,text/csv" disabled={busy !== null} className={inputClass} aria-invalid={!!error}
            aria-describedby={error ? "csv-error" : "csv-hint"}
            onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null); setError(null); setResult(null); }} />
        </Field>
        <Button icon="magnifying-glass" loading={busy === "preview"} loadingText="กำลังตรวจไฟล์…" disabled={!file || busy !== null} onClick={() => send("/api/admin/import/preview", "preview")}>
          ตรวจไฟล์และดูตัวอย่าง
        </Button>
      </Card>

      {result && <Notice tone="ok" icon="circle-check" title={result} />}

      {preview && (
        <Card className="space-y-4">
          <h2 className="text-lg font-bold">ตัวอย่างก่อนนำเข้า</h2>
          <div className="flex flex-wrap gap-2 text-sm">
            {(Object.keys(LABEL) as Status[]).map((s) => (
              <span key={s} className={`rounded-full px-3 py-1 font-semibold ${LABEL[s].cls}`}>{LABEL[s].text} {preview.counts[s]}</span>
            ))}
          </div>
          {preview.newDepartments.length > 0 && (
            <Notice tone="info" icon="layer-group" title={`จะสร้างกลุ่มสาระใหม่ ${preview.newDepartments.length} กลุ่ม`}>{preview.newDepartments.join(", ")}</Notice>
          )}
          {preview.counts.incomplete + preview.counts.invalid + preview.counts.duplicate > 0 && (
            <Notice tone="warn" icon="triangle-exclamation" title="มีแถวที่จะถูกข้าม">แถวที่ซ้ำ ข้อมูลไม่ครบ หรือไม่ถูกต้องจะไม่ถูกนำเข้า คุณสามารถแก้ไฟล์แล้วตรวจใหม่ได้</Notice>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <caption className="sr-only">ตัวอย่างข้อมูลที่จะนำเข้า</caption>
              <thead><tr className="border-b text-slate-600"><th className="py-2 pr-3" scope="col">แถว</th><th className="pr-3" scope="col">กลุ่มสาระ</th><th className="pr-3" scope="col">ชื่อ-นามสกุล</th><th className="pr-3" scope="col">ตำแหน่ง</th><th className="pr-3" scope="col">อีเมล</th><th scope="col">ผลตรวจ</th></tr></thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.line} className="border-b border-slate-100">
                    <td className="py-2 pr-3 text-slate-500">{r.line}</td><td className="pr-3">{r.department || "—"}</td><td className="pr-3">{r.name || "—"}</td><td className="pr-3">{r.position || "—"}</td><td className="pr-3">{r.email || "—"}</td>
                    <td><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${LABEL[r.status].cls}`}>{LABEL[r.status].text}</span>{r.reason && <span className="ml-2 text-xs text-slate-500">{r.reason}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.rowsTruncated && <p className="text-sm text-slate-600">แสดง 500 แถวแรกจากทั้งหมด {preview.totalRows} แถว (ระบบนำเข้าทุกแถวที่ผ่านการตรวจ)</p>}
          <Button icon="check" loading={busy === "commit"} loadingText="กำลังนำเข้า…" disabled={importable === 0 || busy !== null} onClick={() => send("/api/admin/import/commit", "commit")}>
            ยืนยันนำเข้า {importable} รายการ
          </Button>
        </Card>
      )}
    </div>
  );
}
