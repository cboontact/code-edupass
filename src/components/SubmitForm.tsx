"use client";
import { readJson } from "@/lib/http";
import { useEffect, useRef, useState } from "react";
import { Button, Card, Field, Icon, Notice, Skeleton } from "./ui";
import { useToast } from "./toast";
import { FILE_TYPE_OPTIONS, type FileType } from "@/lib/settings";
import { percentOf, type DeptCount } from "@/lib/status";
import { departmentIcon } from "@/lib/department-icons";

interface Staff { id: number; name: string; submitted: boolean; hasEvidence: boolean }
type Errors = Partial<Record<"departmentId" | "staffId" | "file" | "form", string>>;
type StaffStatusFilter = "all" | "submitted" | "pending";

export function SubmitForm({
  departments,
  maxFileMb,
  allowedTypes,
  allowResubmit,
  closed,
}: {
  departments: DeptCount[];
  maxFileMb: number;
  allowedTypes: FileType[];
  allowResubmit: boolean;
  closed: boolean;
}) {
  const toast = useToast();
  const [departmentId, setDepartmentId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [counts, setCounts] = useState<Record<string, { total: number; submitted: number }>>({});
  const [staff, setStaff] = useState<Staff[] | null>(null);
  const [staffStatusFilter, setStaffStatusFilter] = useState<StaffStatusFilter>("all");
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const accept = allowedTypes.join(",");
  const typeLabels = allowedTypes.map((t) => FILE_TYPE_OPTIONS[t].label).join(", ");

  useEffect(() => {
    if (!departmentId) { setStaff(null); setLoadingStaff(false); return; }
    const ctrl = new AbortController();
    setStaff(null);
    setStaffError(null);
    setLoadingStaff(true);
    fetch(`/api/staff?departmentId=${departmentId}`, { signal: ctrl.signal, cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error((await readJson(r))?.error?.message ?? "โหลดรายชื่อไม่สำเร็จ");
        return readJson(r);
      })
      .then((d: { staff: Staff[] }) => {
        if (ctrl.signal.aborted) return;
        setStaff(d.staff);
        setCounts((current) => ({ ...current, [departmentId]: { total: d.staff.length, submitted: d.staff.filter((s) => s.submitted).length } }));
      })
      .catch((e) => { if (!ctrl.signal.aborted) setStaffError(e.message ?? "โหลดรายชื่อไม่สำเร็จ"); })
      .finally(() => { if (!ctrl.signal.aborted) setLoadingStaff(false); });
    return () => ctrl.abort();
  }, [departmentId, reload]);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function backToStaff() {
    setDone(null);
    setStaffId("");
    setFile(null);
    setPreview(null);
    setErrors({});
    setReload((value) => value + 1);
  }

  function pickFile(f: File | null) {
    setErrors((e) => ({ ...e, file: undefined }));
    if (!f) return setFile(null);
    if (!allowedTypes.includes(f.type as FileType)) { setFile(null); return setErrors((e) => ({ ...e, file: `ชนิดไฟล์ไม่รองรับ (รับเฉพาะ ${typeLabels})` })); }
    if (f.size > maxFileMb * 1024 * 1024) { setFile(null); return setErrors((e) => ({ ...e, file: `ไฟล์ใหญ่เกินไป (สูงสุด ${maxFileMb} MB)` })); }
    setFile(f);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || closed) return;
    const errs: Errors = {};
    if (!departmentId) errs.departmentId = "กรุณาเลือกกลุ่มสาระ";
    if (!staffId) errs.staffId = "กรุณาเลือกชื่อของท่าน";
    if (!file) errs.file = errs.file ?? "กรุณาแนบภาพหลักฐาน";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("staffId", staffId);
      fd.set("file", file!);
      const res = await fetch("/api/submissions", { method: "POST", body: fd });
      const data = await readJson(res);
      if (!res.ok) {
        const err = data?.error ?? {};
        const field = err.field as keyof Errors | undefined;
        const msg = err.message ?? "ส่งหลักฐานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
        setErrors(field && ["departmentId", "staffId", "file"].includes(field) ? { [field]: msg } : { form: msg });
        toast("error", msg);
        return;
      }
      const name = staff?.find((s) => String(s.id) === staffId)?.name ?? "";
      const updatedStaff = (staff ?? []).map((s) => String(s.id) === staffId ? { ...s, submitted: true, hasEvidence: true } : s);
      setStaff(updatedStaff);
      setCounts((current) => ({ ...current, [departmentId]: { total: updatedStaff.length, submitted: updatedStaff.filter((s) => s.submitted).length } }));
      setDone(name);
      toast("success", "ส่งหลักฐานเรียบร้อยแล้ว");
    } catch {
      setErrors({ form: "เชื่อมต่อไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่" });
      toast("error", "เชื่อมต่อไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  if (done !== null)
    return (
      <Card className="text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700"><Icon name="circle-check" /></div>
        <h2 className="mt-4 text-xl font-bold text-slate-900">ส่งหลักฐานเรียบร้อยแล้ว</h2>
        {done && <p className="mt-1 text-slate-700">{done}</p>}
        <p className="mt-1 text-sm text-slate-600">ขอบคุณที่ส่งหลักฐานการสมัคร EDU Pass</p>
        <Button className="mt-5" variant="secondary" icon="rotate-left" onClick={backToStaff}>
          กลับไปดูรายชื่อและสถานะ
        </Button>
      </Card>
    );

  const department = departments.find((d) => String(d.id) === departmentId);
  const selected = staff?.find((s) => String(s.id) === staffId);
  const submitted = staff?.filter((s) => s.submitted).length ?? 0;
  const visibleStaff = staff?.filter((s) => staffStatusFilter === "all" || (staffStatusFilter === "submitted" ? s.submitted : !s.submitted)) ?? [];

  if (!department) {
    return (
      <section aria-labelledby="department-heading" className="space-y-4">
        <div>
          <h2 id="department-heading" className="text-lg font-bold text-slate-900">1. เลือกกลุ่มสาระ</h2>
          <p className="text-sm text-slate-600">กดการ์ดเพื่อดูว่าใครส่งหลักฐานแล้ว และใครยังไม่ส่ง</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {departments.map((d) => {
            const count = counts[d.id] ?? d;
            const percent = percentOf(count.submitted, count.total);
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => { setStaff(null); setStaffError(null); setLoadingStaff(true); setStaffStatusFilter("all"); setDepartmentId(String(d.id)); }}
                className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-colors hover:border-blue-400 hover:bg-blue-50"
              >
                <span className="flex w-full items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><Icon name={departmentIcon(d.name)} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-slate-900">{d.name}</span>
                    <span className="block text-sm text-slate-500">ทั้งหมด {count.total} คน</span>
                  </span>
                  <Icon name="chevron-right" className="mt-3 text-slate-400" />
                </span>
                <span className="grid w-full grid-cols-2 gap-2 text-sm">
                  <span className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">ส่งแล้ว <strong>{count.submitted}</strong> คน</span>
                  <span className="rounded-lg bg-orange-50 px-3 py-2 text-orange-800">ยังไม่ส่ง <strong>{count.total - count.submitted}</strong> คน</span>
                </span>
                <span className="w-full">
                  <span className="mb-1 block text-xs text-slate-500">ส่งแล้ว {percent}%</span>
                  <span className="block h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                    <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  if (!selected) {
    return (
      <Card>
        <div className="space-y-4">
          <Button variant="ghost" icon="arrow-left" onClick={() => { backToStaff(); setDepartmentId(""); }}>กลับไปเลือกกลุ่มสาระ</Button>
          <div>
            <p className="text-sm font-medium text-blue-700">2. เลือกชื่อของท่าน</p>
            <h2 className="mt-1 flex items-center gap-2 text-xl font-bold text-slate-900"><Icon name={departmentIcon(department.name)} className="shrink-0 text-blue-700" />{department.name}</h2>
            <p className="mt-1 text-sm text-slate-600">ดูสถานะข้างรายชื่อ แล้วกดชื่อของท่านเพื่อส่งหลักฐาน</p>
          </div>
          {closed && <Notice tone="warn" icon="lock" title="ปิดรับหลักฐานแล้ว">ยังสามารถดูรายชื่อและสถานะการส่งได้</Notice>}
          {loadingStaff ? (
            <div role="status" aria-live="polite" className="space-y-3">
              <span className="flex items-center gap-2 text-sm text-slate-600"><Icon name="spinner" className="fa-spin" /> กำลังโหลดรายชื่อ…</span>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : staffError ? (
            <div className="space-y-3">
              <Notice tone="error" icon="triangle-exclamation" title={staffError} />
              <Button variant="secondary" icon="rotate-right" onClick={() => setReload((value) => value + 1)}>ลองโหลดรายชื่ออีกครั้ง</Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm" aria-label="กรองรายชื่อตามสถานะ">
                <button
                  type="button"
                  aria-pressed={staffStatusFilter === "all"}
                  onClick={() => setStaffStatusFilter("all")}
                  className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-slate-100 px-2 font-medium text-slate-700 transition ${staffStatusFilter === "all" ? "ring-2 ring-slate-400 ring-offset-1" : "hover:bg-slate-200"}`}
                >
                  <Icon name="users" /><span>ทั้งหมด <strong>{staff?.length ?? 0}</strong><span className="hidden sm:inline"> คน</span></span>
                </button>
                <button
                  type="button"
                  aria-pressed={staffStatusFilter === "submitted"}
                  onClick={() => setStaffStatusFilter("submitted")}
                  className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-emerald-50 px-2 font-medium text-emerald-800 transition ${staffStatusFilter === "submitted" ? "ring-2 ring-emerald-500 ring-offset-1" : "hover:bg-emerald-100"}`}
                >
                  <Icon name="circle-check" /><span>ส่งแล้ว <strong>{submitted}</strong><span className="hidden sm:inline"> คน</span></span>
                </button>
                <button
                  type="button"
                  aria-pressed={staffStatusFilter === "pending"}
                  onClick={() => setStaffStatusFilter("pending")}
                  className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-orange-50 px-2 font-medium text-orange-800 transition ${staffStatusFilter === "pending" ? "ring-2 ring-orange-500 ring-offset-1" : "hover:bg-orange-100"}`}
                >
                  <Icon name="hourglass-half" /><span>ยังไม่ส่ง <strong>{(staff?.length ?? 0) - submitted}</strong><span className="hidden sm:inline"> คน</span></span>
                </button>
              </div>
              {staff?.length === 0 ? (
                <Notice tone="info" icon="users" title="ยังไม่มีรายชื่อในกลุ่มสาระนี้">กรุณาเลือกกลุ่มสาระอื่น หรือติดต่อผู้ดูแลระบบ</Notice>
              ) : visibleStaff.length === 0 ? (
                <Notice tone="info" icon="filter" title="ไม่พบรายชื่อตามสถานะที่เลือก">เลือกตัวกรองอื่นเพื่อดูรายชื่อ</Notice>
              ) : (
                <ul className="space-y-2">
                  {visibleStaff.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => { setStaffId(String(s.id)); setErrors({}); setFile(null); setPreview(null); }}
                        className="flex min-h-16 w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 text-left transition-colors hover:border-blue-400 hover:bg-blue-50"
                      >
                        <span className="min-w-0 flex-1 font-semibold text-slate-800">{s.name}</span>
                        <span className="flex shrink-0 items-center gap-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${s.submitted ? "bg-emerald-50 text-emerald-800" : "bg-orange-50 text-orange-800"}`}>
                            <Icon name={s.submitted ? "circle-check" : "clock"} />{s.submitted ? "ส่งแล้ว" : "ยังไม่ส่ง"}
                          </span>
                          <Icon name="chevron-right" className="text-xs text-slate-400" />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-5 space-y-4">
        <Button variant="ghost" icon="arrow-left" disabled={busy} onClick={backToStaff}>กลับไปดูรายชื่อ</Button>
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="flex items-center gap-2 text-sm text-slate-600"><Icon name={departmentIcon(department.name)} className="shrink-0 text-blue-700" />{department.name}</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">{selected.name}</h2>
          <p className={`mt-2 flex items-center gap-2 text-sm font-medium ${selected.submitted ? "text-emerald-700" : "text-orange-700"}`}>
            <Icon name={selected.submitted ? "circle-check" : "clock"} />{selected.submitted ? "ส่งหลักฐานแล้ว" : "ยังไม่ส่งหลักฐาน"}
          </p>
        </div>
      </div>
      {closed ? (
        <Notice tone="warn" icon="lock" title="ปิดรับหลักฐานแล้ว">หมดกำหนดส่งหลักฐาน หากมีข้อสงสัยโปรดติดต่อผู้ดูแลระบบ</Notice>
      ) : selected.hasEvidence && !allowResubmit ? (
        <Notice tone="ok" icon="circle-check" title="รายชื่อนี้ส่งหลักฐานแล้ว">หากต้องการแก้ไขหลักฐาน กรุณาติดต่อผู้ดูแลระบบ</Notice>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-5" aria-describedby={errors.form ? "form-error" : undefined}>
          {errors.form && <div id="form-error"><Notice tone="error" icon="triangle-exclamation" title={errors.form} /></div>}
          {errors.staffId && <Notice tone="error" icon="triangle-exclamation" title={errors.staffId} />}
          {selected.hasEvidence && <Notice tone="info" icon="circle-info" title="รายชื่อนี้เคยส่งหลักฐานแล้ว">สามารถแนบภาพใหม่เพื่อแทนที่หลักฐานเดิมได้</Notice>}
          {selected.submitted && !selected.hasEvidence && <Notice tone="info" icon="circle-info" title="บันทึกสถานะว่าส่งแล้ว">ยังไม่มีไฟล์หลักฐาน สามารถแนบภาพได้เมื่อพร้อม</Notice>}

          <Field id="file" label="3. ภาพหลักฐาน (แคปหน้าจอ)" hint={`รับไฟล์ ${typeLabels} ขนาดไม่เกิน ${maxFileMb} MB`} error={errors.file}>
            <details className="rounded-xl border border-slate-200 bg-white p-3">
              <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-bold text-slate-900">
                <Icon name="images" className="text-blue-700" /> ดูตัวอย่างภาพแคปหน้าจอ Edu Pass
              </summary>
              <figure className="mt-4 flex flex-col items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/examples/edupass-home-example.jpg" alt="ตัวอย่างหน้าแรกของแอป Edu Pass ที่ต้องแคปเพื่อส่งหลักฐาน" width={868} height={1887} loading="lazy" className="h-auto w-full max-w-xs rounded-xl border border-slate-200" />
                <figcaption className="text-center text-sm text-slate-600">ตัวอย่างภาพแคปหน้าจอสำหรับส่งหลักฐาน</figcaption>
              </figure>
            </details>
            <input
              ref={fileRef}
              id="file"
              type="file"
              disabled={busy}
              accept={accept}
              className="sr-only"
              aria-invalid={!!errors.file}
              aria-describedby={errors.file ? "file-error" : "file-hint"}
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); if (!busy) pickFile(e.dataTransfer.files?.[0] ?? null); }}
              className={`flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-5 text-center ${errors.file ? "border-red-400 bg-red-50" : "border-slate-300 bg-slate-50"}`}
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="ตัวอย่างภาพหลักฐานที่เลือก" className="max-h-72 rounded-lg border border-slate-200 object-contain" />
              ) : (
                <Icon name="image" className="text-4xl text-slate-400" />
              )}
              {file && <p className="text-sm text-slate-700">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</p>}
              <Button variant="secondary" icon="folder-open" disabled={busy} onClick={() => fileRef.current?.click()}>
                {file ? "เปลี่ยนภาพ" : "เลือกภาพจากเครื่อง"}
              </Button>
              <p className="text-xs text-slate-500">หรือลากไฟล์มาวางที่นี่</p>
            </div>
          </Field>

          <Button type="submit" loading={busy} loadingText="กำลังส่งหลักฐาน…" icon="paper-plane" className="w-full sm:w-auto">
            ส่งหลักฐาน
          </Button>
        </form>
      )}
    </Card>
  );
}
