"use client";

import { readJson } from "@/lib/http";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Icon, Notice, Skeleton, inputClass } from "./ui";

type Summary = {
  total: number;
  submitted: number;
  pending: number;
  percent: number;
  lastSubmissionAt: string | null;
};

type Row = {
  id: number;
  studentNumber: string;
  name: string;
  className: string | null;
  advisorName: string | null;
  updatedAt: string | null;
};

type GradeSummary = {
  grade: string;
  total: number;
  submitted: number;
  percent: number;
};

type RoomSummary = {
  className: string;
  grade: string;
  room: string;
  advisorName: string | null;
  total: number;
  submitted: number;
  pending: number;
  percent: number;
};

type Payload = {
  summary: Summary;
  total: number;
  page: number;
  pageSize: number;
  rows: Row[];
  classes: string[];
  grades: GradeSummary[];
  rooms: RoomSummary[];
  generatedAt: string;
};

const fmt = (value: string | null) => value
  ? new Intl.DateTimeFormat("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Bangkok",
    }).format(new Date(value))
  : "—";

const nf = new Intl.NumberFormat("th-TH");

function splitClassName(className: string) {
  const [grade = "", room = ""] = className.split("/");
  return { grade, room };
}

function numericSort(a: string, b: string) {
  return Number(a) - Number(b);
}

export function StudentAdminDashboard() {
  const [data, setData] = useState<Payload | null>(null);
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [grade, setGrade] = useState("");
  const [room, setRoom] = useState("");
  const [status, setStatus] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Row | null>(null);
  const filterSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (query) params.set("q", query);
    if (grade) params.set("grade", grade);
    if (room) params.set("room", room);
    if (status) params.set("status", status);

    try {
      const response = await fetch(`/api/admin/students?${params}`);
      if (!response.ok) throw new Error();
      setData(await readJson(response));
      setError(null);
    } catch {
      setError("โหลดข้อมูลนักเรียนไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [grade, page, query, room, status]);

  useEffect(() => { load(); }, [load]);

  const grades = useMemo(() => Array.from(new Set(
    (data?.classes ?? []).map((className) => splitClassName(className).grade).filter(Boolean),
  )).sort(numericSort), [data?.classes]);

  const rooms = useMemo(() => Array.from(new Set(
    (data?.classes ?? [])
      .map(splitClassName)
      .filter((item) => (!grade || item.grade === grade) && item.room)
      .map((item) => item.room),
  )).sort(numericSort), [data?.classes, grade]);

  const lastPage = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const hasFilters = Boolean(query || grade || room || status);
  const selectedRooms = (data?.rooms ?? []).filter((item) => item.grade === selectedGrade);

  function filterByRoom(item: RoomSummary) {
    setGrade(item.grade);
    setRoom(item.room);
    setPage(1);
    requestAnimationFrame(() => filterSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold">
            <Icon name="user-graduate" className="text-emerald-700" /> สรุปข้อมูลนักเรียน
          </h1>
          <p className="mt-1 text-sm text-slate-600">ตรวจสอบสถานะและค้นหารายชื่อตามระดับชั้นหรือห้องเรียน</p>
        </div>
        <Button variant="secondary" icon="rotate" onClick={load}>รีเฟรชข้อมูล</Button>
      </div>

      {error && <Notice tone="error" icon="triangle-exclamation" title={error} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={hasFilters ? "นักเรียนที่พบ" : "นักเรียนทั้งหมด"} value={data?.summary.total} icon="users" tone="bg-sky-100 text-sky-700" />
        <Stat label="ส่งแล้ว" value={data?.summary.submitted} icon="circle-check" tone="bg-emerald-100 text-emerald-700" />
        <Stat label="ยังไม่ส่ง" value={data?.summary.pending} icon="hourglass-half" tone="bg-orange-100 text-orange-700" />
        <Stat label="ความคืบหน้า" value={data ? `${data.summary.percent}%` : undefined} icon="percent" tone="bg-blue-100 text-blue-700" />
      </div>

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Icon name="school" className="text-emerald-700" /> ความคืบหน้านักเรียนแยกตามระดับชั้น</h2>
          <p className="text-sm text-slate-500"><Icon name="hand-pointer" className="mr-1" /> กดที่ระดับชั้นเพื่อดูรายห้อง</p>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {!data && [1, 2, 3, 4, 5, 6].map((value) => <Skeleton key={value} className="h-24 w-full" />)}
          {data?.grades.map((item) => (
            <button
              type="button"
              key={item.grade}
              onClick={() => setSelectedGrade(item.grade)}
              aria-haspopup="dialog"
              className={`rounded-xl border p-3 text-left transition-colors hover:border-emerald-400 hover:bg-emerald-50/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${selectedGrade === item.grade ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500" : "border-slate-200 bg-slate-50/70"}`}
            >
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 font-bold text-emerald-700">{item.grade}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800">มัธยมศึกษาปีที่ {item.grade}</p>
                  <p className="text-xs text-slate-500">ส่งแล้ว {nf.format(item.submitted)}/{nf.format(item.total)} คน</p>
                </div>
                <Icon name="chevron-right" className="text-slate-400" />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${item.total - item.submitted === 0 ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800"}`}>
                  <Icon name={item.total - item.submitted === 0 ? "circle-check" : "hourglass-half"} /> ค้าง {nf.format(item.total - item.submitted)} คน
                </span>
                <span className="text-sm font-bold text-emerald-700">{item.percent}%</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label={`ความคืบหน้านักเรียนชั้น ม.${item.grade}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.percent}>
                <div className="h-full rounded-full bg-emerald-600 transition-[width] duration-500" style={{ width: `${item.percent}%` }} />
              </div>
            </button>
          ))}
        </div>

      </Card>

      {selectedGrade && (
        <GradeRoomsDialog
          grade={selectedGrade}
          rooms={selectedRooms}
          onClose={() => setSelectedGrade(null)}
          onSelect={(item) => { filterByRoom(item); setSelectedGrade(null); }}
        />
      )}

      <div ref={filterSectionRef} className="scroll-mt-4">
        <Card>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Icon name="filter" className="text-emerald-700" /> ค้นหาและกรองรายชื่อ
          </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-semibold">
            ค้นหา
            <span className="relative mt-1 block">
              <Icon name="magnifying-glass" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className={`${inputClass} pl-9`} value={q} onChange={(event) => setQ(event.target.value)} placeholder="เลขประจำตัว ชื่อ หรือครูที่ปรึกษา" />
            </span>
          </label>
          <label className="text-sm font-semibold">
            ระดับชั้น
            <select
              className={`${inputClass} mt-1`}
              value={grade}
              onChange={(event) => { setGrade(event.target.value); setRoom(""); setPage(1); }}
            >
              <option value="">ทุกระดับชั้น</option>
              {grades.map((value) => <option key={value} value={value}>ม.{value}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold">
            ห้อง
            <select className={`${inputClass} mt-1`} value={room} onChange={(event) => { setRoom(event.target.value); setPage(1); }}>
              <option value="">ทุกห้อง</option>
              {rooms.map((value) => <option key={value} value={value}>ห้อง {value}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold">
            สถานะ
            <select className={`${inputClass} mt-1`} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
              <option value="">ทุกสถานะ</option>
              <option value="submitted">ส่งแล้ว</option>
              <option value="pending">ยังไม่ส่ง</option>
            </select>
          </label>
        </div>

        <div className="mt-4" aria-busy={loading}>
          {loading && !data ? (
            <div className="space-y-2"><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
          ) : !data?.rows.length ? (
            <p className="rounded-xl bg-slate-50 p-6 text-center text-slate-600">ไม่พบรายชื่อนักเรียนตามเงื่อนไขที่เลือก</p>
          ) : (
            <ul className={loading ? "space-y-2 opacity-60" : "space-y-2"}>
              {data.rows.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{row.name}</p>
                    <p className="text-sm text-slate-500">เลขประจำตัว {row.studentNumber}{row.className ? ` · ชั้น ${row.className}` : ""}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600"><Icon name="user-tie" className="text-blue-600" /> ครูที่ปรึกษา: {row.advisorName || "ยังไม่ระบุ"}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${row.updatedAt ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800"}`}>
                    <Icon name={row.updatedAt ? "circle-check" : "hourglass-half"} />
                    {row.updatedAt ? "ส่งแล้ว" : "ยังไม่ส่ง"}
                  </span>
                  {row.updatedAt && (
                    <button type="button" className="inline-flex size-11 items-center justify-center rounded-lg text-blue-700 hover:bg-blue-50" onClick={() => setViewing(row)} aria-label={`ดูหลักฐานของ ${row.name}`}>
                      <Icon name="eye" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <span>พบ {nf.format(data?.total ?? 0)} รายการ · หน้า {page}/{lastPage}</span>
          <div className="flex gap-2">
            <Button variant="secondary" icon="chevron-left" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>ก่อนหน้า</Button>
            <Button variant="secondary" icon="chevron-right" disabled={page >= lastPage} onClick={() => setPage((value) => value + 1)}>ถัดไป</Button>
          </div>
        </div>
        </Card>
      </div>

      {viewing && <EvidenceDialog row={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

function GradeRoomsDialog({ grade, rooms, onClose, onSelect }: {
  grade: string;
  rooms: RoomSummary[];
  onClose: () => void;
  onSelect: (room: RoomSummary) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  const totals = rooms.reduce(
    (result, item) => ({ total: result.total + item.total, submitted: result.submitted + item.submitted, pending: result.pending + item.pending }),
    { total: 0, submitted: 0, pending: 0 },
  );

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => event.target === ref.current && onClose()}
      aria-labelledby="room-stats-title"
      className="m-auto max-h-[92vh] w-[min(94vw,72rem)] overflow-hidden rounded-2xl p-0 shadow-2xl backdrop:bg-slate-900/55"
    >
      <div className="flex max-h-[92vh] flex-col bg-white">
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="room-stats-title" className="flex items-center gap-2 text-xl font-bold text-slate-900"><Icon name="school" className="text-emerald-700" /> สถิติรายห้อง ม.{grade}</h2>
              <p className="mt-1 text-sm text-slate-500">เลือกห้องเพื่อดูรายชื่อนักเรียนและสถานะรายคน</p>
            </div>
            <button type="button" onClick={onClose} className="flex size-11 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100" aria-label="ปิด"><Icon name="xmark" /></button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-slate-100 px-2 py-2"><span className="flex items-center justify-center gap-1 text-xs text-slate-500"><Icon name="users" /> ทั้งหมด</span><strong className="text-lg text-slate-900">{nf.format(totals.total)}</strong></div>
            <div className="rounded-xl bg-emerald-50 px-2 py-2"><span className="flex items-center justify-center gap-1 text-xs text-emerald-700"><Icon name="circle-check" /> ส่งแล้ว</span><strong className="text-lg text-emerald-800">{nf.format(totals.submitted)}</strong></div>
            <div className="rounded-xl bg-orange-50 px-2 py-2"><span className="flex items-center justify-center gap-1 text-xs text-orange-700"><Icon name="hourglass-half" /> ค้าง</span><strong className="text-lg text-orange-800">{nf.format(totals.pending)}</strong></div>
          </div>
        </div>

        <div className="overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {rooms.map((item) => (
              <button type="button" key={item.className} onClick={() => onSelect(item)} className="group rounded-xl border border-slate-200 bg-white p-3 text-left transition-colors hover:border-blue-400 hover:bg-blue-50/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold text-slate-900">ห้อง {item.room}</p>
                  <span className="text-xs text-slate-500">{nf.format(item.total)} คน</span>
                  <span className="ml-auto font-bold text-emerald-700">{item.percent}%</span>
                  <Icon name="chevron-right" className="text-xs text-blue-600 transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="mt-1.5 truncate text-xs text-slate-600" title={item.advisorName || "ยังไม่ระบุครูที่ปรึกษา"}><Icon name="user-tie" className="mr-1 text-blue-600" /> {item.advisorName || "ยังไม่ระบุครูที่ปรึกษา"}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-center text-xs font-bold">
                  <span className="inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-100 px-2 py-1 text-emerald-800"><Icon name="circle-check" /> ส่งแล้ว {nf.format(item.submitted)}</span>
                  <span className={`inline-flex items-center justify-center gap-1 rounded-lg px-2 py-1 ${item.pending === 0 ? "bg-slate-100 text-slate-600" : "bg-orange-100 text-orange-800"}`}><Icon name={item.pending === 0 ? "circle-check" : "hourglass-half"} /> ค้าง {nf.format(item.pending)}</span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${item.percent}%` }} /></div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </dialog>
  );
}

function Stat({ label, value, icon, tone }: { label: string; value: number | string | undefined; icon: string; tone: string }) {
  return (
    <Card className="flex items-center gap-4">
      <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl text-xl ${tone}`}><Icon name={icon} /></span>
      <span>
        <span className="block text-sm text-slate-600">{label}</span>
        {value === undefined ? <Skeleton className="mt-1 h-8 w-16" /> : <strong className="block text-3xl">{typeof value === "number" ? nf.format(value) : value}</strong>}
      </span>
    </Card>
  );
}

function EvidenceDialog({ row, onClose }: { row: Row; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  useEffect(() => { ref.current?.showModal(); }, []);

  return (
    <dialog ref={ref} onClose={onClose} onClick={(event) => event.target === ref.current && onClose()} className="m-auto w-[min(92vw,42rem)] rounded-2xl p-0 shadow-2xl backdrop:bg-slate-900/50">
      <div className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">หลักฐานของ {row.name}</h2>
          <button type="button" onClick={onClose} className="size-11 rounded-lg hover:bg-slate-100" aria-label="ปิด"><Icon name="xmark" /></button>
        </div>
        {state === "loading" && <Skeleton className="h-64" />}
        {state === "error" && <Notice tone="error" icon="triangle-exclamation" title="โหลดภาพหลักฐานไม่สำเร็จ" />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/admin/student-evidence/${row.id}?v=${encodeURIComponent(row.updatedAt ?? "")}`}
          alt={`หลักฐานของ ${row.name}`}
          className={`max-h-[70vh] w-full rounded-lg border object-contain ${state === "ok" ? "" : "hidden"}`}
          onLoad={() => setState("ok")}
          onError={() => setState("error")}
        />
        <p className="mt-3 text-sm text-slate-600">ส่งเมื่อ {fmt(row.updatedAt)}</p>
      </div>
    </dialog>
  );
}
