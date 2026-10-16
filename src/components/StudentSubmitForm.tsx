"use client";
import { useEffect, useRef, useState } from "react";
import { readJson } from "@/lib/http";
import { FILE_TYPE_OPTIONS, type FileType } from "@/lib/settings";
import { Button, Card, Field, Icon, Notice, inputClass } from "./ui";
import { useToast } from "./toast";

type Student = { name: string; className: string | null; advisorName: string | null; submitted: boolean };
type Errors = Partial<Record<"studentNumber" | "file" | "form", string>>;

export function StudentSubmitForm({ maxFileMb, allowedTypes, allowResubmit, closed }: {
  maxFileMb: number; allowedTypes: FileType[]; allowResubmit: boolean; closed: boolean;
}) {
  const toast = useToast();
  const [studentNumber, setStudentNumber] = useState("");
  const [student, setStudent] = useState<Student | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const typeLabels = allowedTypes.map((type) => FILE_TYPE_OPTIONS[type].label).join(", ");

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function resetIdentity() {
    setStudent(null); setConfirmed(false); setFile(null); setErrors({}); setDone(false);
  }

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    if (lookupBusy) return;
    if (!/^\d{1,20}$/.test(studentNumber.trim())) return setErrors({ studentNumber: "กรุณากรอกเลขประจำตัวนักเรียนเป็นตัวเลข" });
    setLookupBusy(true); setErrors({}); setStudent(null); setConfirmed(false);
    try {
      const response = await fetch("/api/students/lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studentNumber }) });
      const data = await readJson(response);
      if (!response.ok) return setErrors({ studentNumber: data?.error?.message ?? "ตรวจสอบเลขประจำตัวไม่สำเร็จ" });
      setStudent(data.student);
    } catch { setErrors({ form: "เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่" }); }
    finally { setLookupBusy(false); }
  }

  function pickFile(value: File | null) {
    setErrors((current) => ({ ...current, file: undefined }));
    if (!value) return setFile(null);
    if (!allowedTypes.includes(value.type as FileType)) return setErrors((current) => ({ ...current, file: `ชนิดไฟล์ไม่รองรับ (รับเฉพาะ ${typeLabels})` }));
    if (value.size > maxFileMb * 1024 * 1024) return setErrors((current) => ({ ...current, file: `ไฟล์ใหญ่เกินไป (สูงสุด ${maxFileMb} MB)` }));
    setFile(value);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || closed || !student || !confirmed) return;
    if (!file) return setErrors({ file: "กรุณาแนบภาพหลักฐาน" });
    setBusy(true); setErrors({});
    try {
      const form = new FormData(); form.set("studentNumber", studentNumber); form.set("file", file);
      const response = await fetch("/api/student-submissions", { method: "POST", body: form });
      const data = await readJson(response);
      if (!response.ok) {
        const field = data?.error?.field as keyof Errors | undefined;
        const message = data?.error?.message ?? "ส่งหลักฐานไม่สำเร็จ กรุณาลองใหม่";
        setErrors(field === "file" || field === "studentNumber" ? { [field]: message } : { form: message });
        return toast("error", message);
      }
      setDone(true); toast("success", "ส่งหลักฐานเรียบร้อยแล้ว");
    } catch { setErrors({ form: "เชื่อมต่อไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่" }); }
    finally { setBusy(false); }
  }

  if (done) return <Card className="text-center"><div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700"><Icon name="circle-check" /></div><h2 className="mt-4 text-xl font-bold">ส่งหลักฐานเรียบร้อยแล้ว</h2><p className="mt-1 text-slate-700">{student?.name}</p><Button className="mt-5" variant="secondary" icon="rotate-left" onClick={() => { setStudentNumber(""); resetIdentity(); }}>ส่งหลักฐานของนักเรียนคนอื่น</Button></Card>;

  if (!student) return (
    <Card>
      <form onSubmit={lookup} className="space-y-4" noValidate>
        <h2 className="text-lg font-bold text-slate-900">1. ตรวจสอบเลขประจำตัวนักเรียน</h2>
        {errors.form && <Notice tone="error" icon="triangle-exclamation" title={errors.form} />}
        <Field id="studentNumber" label="เลขประจำตัวนักเรียน" hint="กรอกตัวเลขให้ครบถ้วน" error={errors.studentNumber}>
          <input id="studentNumber" inputMode="numeric" autoComplete="off" className={inputClass} value={studentNumber} disabled={lookupBusy} aria-invalid={!!errors.studentNumber} aria-describedby={errors.studentNumber ? "studentNumber-error" : "studentNumber-hint"} onChange={(e) => { setStudentNumber(e.target.value.replace(/\D/g, "")); setErrors({}); }} />
        </Field>
        <Button type="submit" icon="magnifying-glass" loading={lookupBusy} loadingText="กำลังตรวจสอบ…">ตรวจสอบรายชื่อ</Button>
      </form>
    </Card>
  );

  return (
    <Card>
      <Button variant="ghost" icon="arrow-left" disabled={busy} onClick={resetIdentity}>เปลี่ยนเลขประจำตัว</Button>
      <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-medium text-emerald-800">2. ตรวจสอบชื่อ-นามสกุล</p><h2 className="mt-1 text-xl font-bold text-slate-900">{student.name}</h2>{student.className && <p className="text-sm text-slate-600">ชั้น {student.className}</p>}{student.advisorName && <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-700"><Icon name="user-tie" className="text-emerald-700" /> ครูที่ปรึกษา: {student.advisorName}</p>}
      </div>
      {student.submitted && !allowResubmit ? <Notice tone="ok" icon="circle-check" title="เลขประจำตัวนี้ส่งหลักฐานแล้ว">หากต้องการแก้ไข กรุณาติดต่อผู้ดูแลระบบ</Notice> : closed ? <Notice tone="warn" icon="lock" title="ปิดรับหลักฐานแล้ว" /> : (
        <form onSubmit={submit} className="mt-5 space-y-5" noValidate>
          {errors.form && <Notice tone="error" icon="triangle-exclamation" title={errors.form} />}
          {student.submitted && <Notice tone="info" icon="circle-info" title="เคยส่งหลักฐานแล้ว">ภาพใหม่จะแทนที่หลักฐานเดิมเมื่อส่งสำเร็จ</Notice>}
          <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3"><input type="checkbox" className="mt-1 size-5" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /><span><strong className="block text-slate-900">ชื่อ-นามสกุลถูกต้อง</strong><span className="text-sm text-slate-600">ยืนยันว่ารายชื่อด้านบนเป็นข้อมูลของนักเรียนผู้ส่ง</span></span></label>
          {confirmed && <Field id="studentFile" label="3. ภาพหลักฐาน (แคปหน้าจอ)" hint={`รับไฟล์ ${typeLabels} ขนาดไม่เกิน ${maxFileMb} MB`} error={errors.file}>
            <input ref={fileRef} id="studentFile" type="file" accept={allowedTypes.join(",")} className="sr-only" disabled={busy} onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
            <div className={`flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-5 text-center ${errors.file ? "border-red-400 bg-red-50" : "border-slate-300 bg-slate-50"}`}>
              {preview ? <>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={preview} alt="ตัวอย่างภาพหลักฐานที่เลือก" className="max-h-72 rounded-lg border object-contain" /></> : <Icon name="image" className="text-4xl text-slate-400" />}
              {file && <p className="text-sm text-slate-700">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</p>}
              <Button variant="secondary" icon="folder-open" disabled={busy} onClick={() => fileRef.current?.click()}>{file ? "เปลี่ยนภาพ" : "เลือกภาพจากเครื่อง"}</Button>
            </div>
          </Field>}
          <Button type="submit" icon="paper-plane" loading={busy} loadingText="กำลังส่งหลักฐาน…" disabled={!confirmed} className="w-full sm:w-auto">ส่งหลักฐาน</Button>
        </form>
      )}
    </Card>
  );
}
