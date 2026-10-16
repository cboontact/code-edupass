"use client";
import { readJson } from "@/lib/http";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, Icon, Notice, Skeleton, inputClass } from "./ui";
import { useToast } from "./toast";
import { departmentIcon } from "@/lib/department-icons";

interface Dept { id: number; name: string; total: number; submitted: number; percent: number }
interface Summary {
  total: number; submitted: number; pending: number; percent: number; departments: Dept[];
  lastSubmissionAt: string | null; generatedAt: string;
}
interface Row { id: number; name: string; position: string | null; department: string; hasEmail: number; submittedAt: string | null; updatedAt: string | null }
interface Page { total: number; page: number; pageSize: number; rows: Row[] }

const fmt = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(iso)) : "—";
const nf = new Intl.NumberFormat("th-TH");

function Stat({ icon, label, value, tone }: { icon: string; label: string; value: string | null; tone: string }) {
  return (
    <Card className="flex items-center gap-4">
      <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl text-xl ${tone}`}><Icon name={icon} /></div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        {value === null ? <Skeleton className="mt-1 h-8 w-20" /> : <p className="text-3xl font-bold text-slate-900">{value}</p>}
      </div>
    </Card>
  );
}

export function AdminDashboard() {
  const toast = useToast();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [page, setPage] = useState<Page | null>(null);
  const [loadingRows, setLoadingRows] = useState(true);
  const [dept, setDept] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [pageNo, setPageNo] = useState(1);
  const [viewing, setViewing] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/summary");
      if (!r.ok) throw new Error();
      setSummary(await readJson(r));
    } catch { setLoadError("โหลดสถิติไม่สำเร็จ"); }
  }, []);

  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => { const t = setTimeout(() => { setQDebounced(q); setPageNo(1); }, 300); return () => clearTimeout(t); }, [q]);

  const loadRows = useCallback(async () => {
    setLoadingRows(true);
    const p = new URLSearchParams({ page: String(pageNo) });
    if (dept) p.set("departmentId", dept);
    if (status) p.set("status", status);
    if (qDebounced) p.set("q", qDebounced);
    try {
      const r = await fetch(`/api/admin/staff?${p}`);
      if (!r.ok) throw new Error();
      setPage(await readJson(r));
      setLoadError(null);
    } catch { setLoadError("โหลดตารางรายชื่อไม่สำเร็จ"); }
    finally { setLoadingRows(false); }
  }, [dept, status, qDebounced, pageNo]);
  useEffect(() => { loadRows(); }, [loadRows]);

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      const r = await fetch(`/api/admin/staff/${deleting.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error((await readJson(r))?.error?.message ?? "ลบไม่สำเร็จ");
      toast("success", "ลบรายชื่อเรียบร้อยแล้ว");
      setDeleting(null);
      loadSummary(); loadRows();
    } catch (e) { toast("error", (e as Error).message); }
    finally { setDeleteBusy(false); }
  }

  const empty = summary && summary.total === 0;
  const lastPage = page ? Math.max(1, Math.ceil(page.total / page.pageSize)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold"><Icon name="chart-column" className="text-blue-700" /> สรุปข้อมูลครู</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-600" aria-live="polite">
            <Icon name="clock" /> อัปเดตล่าสุด: {summary ? fmt(summary.generatedAt) : "กำลังโหลด…"}
            {summary?.lastSubmissionAt && <span className="hidden sm:inline">· ส่งล่าสุด {fmt(summary.lastSubmissionAt)}</span>}
          </p>
        </div>
        <Button variant="secondary" icon="rotate" onClick={() => { loadSummary(); loadRows(); }}>รีเฟรชข้อมูล</Button>
      </div>

      {loadError && <Notice tone="error" icon="triangle-exclamation" title={loadError} />}
      {empty && (
        <Notice tone="info" icon="hourglass-half" title="รอผู้ดูแลนำเข้ารายชื่อ">
          ยังไม่มีรายชื่อครูและบุคลากรในระบบ <Link href="/admin/import" className="font-semibold underline">ไปที่หน้านำเข้ารายชื่อ</Link>
        </Notice>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900"><Icon name="chalkboard-user" className="text-blue-700" /> ภาพรวมครูและบุคลากร</h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon="users" label="ครู/บุคลากรทั้งหมด" value={summary ? nf.format(summary.total) : null} tone="bg-sky-100 text-sky-700" />
        <Stat icon="circle-check" label="ส่งหลักฐานแล้ว" value={summary ? nf.format(summary.submitted) : null} tone="bg-emerald-100 text-emerald-700" />
        <Stat icon="hourglass-half" label="ยังไม่ส่ง" value={summary ? nf.format(summary.pending) : null} tone="bg-orange-100 text-orange-700" />
        <Stat icon="percent" label="ความคืบหน้า" value={summary ? `${summary.percent}%` : null} tone="bg-blue-100 text-blue-700" />
      </div>

      <Card>
        <h2 className="flex items-center gap-2 text-lg font-bold"><Icon name="layer-group" className="text-blue-700" /> ความคืบหน้าแยกตามกลุ่มสาระ</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {!summary && [0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
          {summary && summary.departments.length === 0 && <p className="text-slate-600">ยังไม่มีกลุ่มสาระในระบบ</p>}
          {summary?.departments.map((d) => (
            <div key={d.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                  <Icon name={departmentIcon(d.name)} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug text-slate-800">{d.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">ส่งแล้ว {d.submitted}/{d.total} คน</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${d.percent >= 100 ? "bg-emerald-100 text-emerald-700" : "bg-white text-blue-700"}`}>
                  {d.percent}%
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label={`ความคืบหน้า ${d.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={d.percent}>
                <div className={`h-full rounded-full transition-[width] duration-500 ${d.percent >= 100 ? "bg-emerald-600" : "bg-blue-600"}`} style={{ width: `${d.percent}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="flex items-center gap-2 text-lg font-bold"><Icon name="table-list" className="text-blue-700" /> รายชื่อครูและบุคลากร</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="block text-sm font-semibold">ค้นหาชื่อ
            <span className="relative mt-1 block"><Icon name="magnifying-glass" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className={`${inputClass} pl-9`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="พิมพ์ชื่อ…" /></span>
          </label>
          <label className="block text-sm font-semibold">กลุ่มสาระ
            <select className={`${inputClass} mt-1`} value={dept} onChange={(e) => { setDept(e.target.value); setPageNo(1); }}>
              <option value="">ทั้งหมด</option>
              {summary?.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold">สถานะ
            <select className={`${inputClass} mt-1`} value={status} onChange={(e) => { setStatus(e.target.value); setPageNo(1); }}>
              <option value="">ทั้งหมด</option>
              <option value="submitted">ส่งแล้ว</option>
              <option value="pending">ยังไม่ส่ง</option>
            </select>
          </label>
        </div>

        <div className="mt-4" aria-busy={loadingRows}>
          {loadingRows && !page ? (
            <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : page && page.rows.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-6 text-center text-slate-600">
              {empty ? "รอผู้ดูแลนำเข้ารายชื่อ" : "ไม่พบรายชื่อตามเงื่อนไขที่เลือก"}
            </p>
          ) : (
            <>
              <div className={`hidden md:block ${loadingRows ? "opacity-60" : ""}`}>
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">รายชื่อครูและบุคลากรพร้อมสถานะการส่งหลักฐาน</caption>
                  <thead><tr className="border-b border-slate-200 text-slate-600">
                    <th scope="col" className="py-2 pr-3">ชื่อ-นามสกุล</th><th scope="col" className="py-2 pr-3">กลุ่มสาระ</th><th scope="col" className="py-2 pr-3">ตำแหน่ง</th>
                    <th scope="col" className="py-2 pr-3">สถานะ</th><th scope="col" className="py-2 pr-3">เวลาที่ส่ง</th><th scope="col" className="py-2"><span className="sr-only">การดำเนินการ</span></th>
                  </tr></thead>
                  <tbody>
                    {page?.rows.map((r) => (
                      <tr key={r.id} className="border-b border-slate-100">
                        <td className="py-3 pr-3 font-medium">{r.name}</td>
                        <td className="py-3 pr-3 text-slate-700">{r.department}</td>
                        <td className="py-3 pr-3 text-slate-700">{r.position || "—"}</td>
                        <td className="py-3 pr-3"><StatusBadge done={!!r.updatedAt} /></td>
                        <td className="py-3 pr-3 text-slate-600">{fmt(r.updatedAt)}</td>
                        <td className="py-3 text-right whitespace-nowrap">
                          {r.submittedAt && <Button variant="ghost" icon="eye" onClick={() => setViewing(r)} aria-label={`ดูหลักฐานของ ${r.name}`}>ดูหลักฐาน</Button>}
                          <Button variant="ghost" icon="trash" onClick={() => setDeleting(r)} aria-label={`ลบ ${r.name}`}>ลบ</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className={`space-y-2 md:hidden ${loadingRows ? "opacity-60" : ""}`}>
                {page?.rows.map((r) => (
                  <li key={r.id} className="rounded-xl border border-slate-200 px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold leading-snug text-slate-900">{r.name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{r.department}{r.position ? ` · ${r.position}` : ""}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <StatusBadge done={!!r.updatedAt} />
                          {r.updatedAt && <span className="text-xs text-slate-500">{fmt(r.updatedAt)}</span>}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {r.submittedAt && (
                          <button type="button" onClick={() => setViewing(r)} className="inline-flex size-11 items-center justify-center rounded-lg text-blue-700 hover:bg-blue-50" aria-label={`ดูหลักฐานของ ${r.name}`}>
                            <Icon name="eye" />
                          </button>
                        )}
                        <button type="button" onClick={() => setDeleting(r)} className="inline-flex size-11 items-center justify-center rounded-lg text-red-600 hover:bg-red-50" aria-label={`ลบ ${r.name}`}>
                          <Icon name="trash" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                <p className="text-slate-600">ทั้งหมด {nf.format(page?.total ?? 0)} รายการ · หน้า {pageNo}/{lastPage}</p>
                <div className="flex gap-2">
                  <Button variant="secondary" icon="chevron-left" disabled={pageNo <= 1} onClick={() => setPageNo((p) => p - 1)}>ก่อนหน้า</Button>
                  <Button variant="secondary" icon="chevron-right" disabled={pageNo >= lastPage} onClick={() => setPageNo((p) => p + 1)}>ถัดไป</Button>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>

      {viewing && <EvidenceDialog row={viewing} onClose={() => setViewing(null)} />}
      {deleting && (
        <Dialog onClose={() => !deleteBusy && setDeleting(null)} title="ยืนยันการลบรายชื่อ" icon="trash">
          <p className="text-slate-700">ลบ <strong>{deleting.name}</strong> ออกจากระบบ{deleting.submittedAt ? " พร้อมภาพหลักฐานที่ส่งไว้" : ""} การลบไม่สามารถย้อนกลับได้</p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" disabled={deleteBusy} onClick={() => setDeleting(null)}>ยกเลิก</Button>
            <Button variant="danger" icon="trash" loading={deleteBusy} loadingText="กำลังลบ…" onClick={confirmDelete}>ลบรายชื่อ</Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function StatusBadge({ done }: { done: boolean }) {
  return done ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800"><Icon name="circle-check" /> ส่งแล้ว</span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-800"><Icon name="hourglass-half" /> ยังไม่ส่ง</span>
  );
}

function Dialog({ title, icon, onClose, children }: { title: string; icon: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => e.target === ref.current && onClose()} aria-labelledby="dlg-title"
      className="m-auto w-[min(92vw,42rem)] rounded-2xl p-0 shadow-2xl backdrop:bg-slate-900/50">
      <div className="p-5 sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="dlg-title" className="flex items-center gap-2 text-lg font-bold"><Icon name={icon} className="text-blue-700" /> {title}</h2>
          <button type="button" onClick={onClose} className="min-h-11 min-w-11 rounded-lg hover:bg-slate-100" aria-label="ปิดหน้าต่าง"><Icon name="xmark" /></button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

function EvidenceDialog({ row, onClose }: { row: Row; onClose: () => void }) {
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  return (
    <Dialog title={`หลักฐานของ ${row.name}`} icon="image" onClose={onClose}>
      {state === "loading" && <Skeleton className="h-64 w-full" />}
      {state === "error" && <Notice tone="error" icon="triangle-exclamation" title="โหลดภาพหลักฐานไม่สำเร็จ" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/admin/evidence/${row.id}?v=${encodeURIComponent(row.updatedAt ?? "")}`} alt={`ภาพหลักฐานการสมัคร EDU Pass ของ ${row.name}`}
        className={`max-h-[70vh] w-full rounded-lg border border-slate-200 object-contain ${state === "ok" ? "" : "hidden"}`}
        onLoad={() => setState("ok")} onError={() => setState("error")} />
      <p className="mt-3 text-sm text-slate-600">{row.department} · ส่งเมื่อ {fmt(row.updatedAt)}</p>
    </Dialog>
  );
}
