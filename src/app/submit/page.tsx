import Link from "next/link";
import { getEnv } from "@/lib/env";
import { loadSettings, formatThai } from "@/lib/db";
import { SubmitForm } from "@/components/SubmitForm";
import { Card, Icon, Notice } from "@/components/ui";
import { isPastDeadline } from "@/lib/settings";
import type { DeptCount } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { DB } = getEnv();
  const [settings, deps] = await Promise.all([
    loadSettings(DB),
    DB.prepare(`SELECT d.id, d.name, COUNT(s.id) AS total,
      COUNT(CASE WHEN sub.id IS NOT NULL OR s.marked_submitted_at IS NOT NULL THEN 1 END) AS submitted
      FROM departments d JOIN staff s ON s.department_id = d.id
      LEFT JOIN submissions sub ON sub.staff_id = s.id
      GROUP BY d.id, d.name ORDER BY d.name`).all<DeptCount>(),
  ]);
  const past = isPastDeadline(settings.deadline);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/guide/teacher" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900">
        <Icon name="arrow-left" /> กลับไปอ่านคำแนะนำ
      </Link>
      <div>
        <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-900">
          <Icon name="id-card" className="text-blue-700" /> ส่งหลักฐานการสมัคร EDU Pass
        </h1>
        <p className="mt-1 text-slate-600">เลือกการ์ดกลุ่มสาระเพื่อดูรายชื่อและสถานะการส่ง แล้วกดชื่อของท่านเพื่อแนบหลักฐานการสมัคร EDU Pass</p>
      </div>

      {settings.deadline && (
        <Notice tone={past ? "warn" : "info"} icon="calendar-day" title={`กำหนดส่ง: ${new Intl.DateTimeFormat("th-TH", { dateStyle: "long", timeZone: "Asia/Bangkok" }).format(new Date(`${settings.deadline}T12:00:00+07:00`))}`}>
          {past ? (settings.blockAfterDeadline ? "หมดกำหนดส่งแล้ว ระบบปิดรับหลักฐาน" : "เลยกำหนดส่งแล้ว กรุณาส่งโดยเร็ว") : null}
        </Notice>
      )}
      {settings.evidenceInstructions && (
        <Card>
          <h2 className="flex items-center gap-2 font-bold text-slate-900"><Icon name="list-check" className="text-emerald-600" /> ภาพหลักฐานต้องแสดงข้อมูลต่อไปนี้</h2>
          <p className="mt-2 whitespace-pre-line text-slate-700">{settings.evidenceInstructions}</p>
        </Card>
      )}

      {deps.results.length === 0 ? (
        <Notice tone="info" icon="hourglass-half" title="รอผู้ดูแลนำเข้ารายชื่อ">
          ขณะนี้ยังไม่มีรายชื่อครูและบุคลากรในระบบ กรุณากลับมาใหม่หลังผู้ดูแลนำเข้ารายชื่อเรียบร้อยแล้ว
        </Notice>
      ) : (
        <SubmitForm
          departments={deps.results}
          maxFileMb={settings.maxFileMb}
          allowedTypes={settings.allowedTypes}
          allowResubmit={settings.allowResubmit}
          closed={past && settings.blockAfterDeadline}
        />
      )}
      <p className="text-center text-xs text-slate-500">ข้อมูลอัปเดต ณ {formatThai(new Date().toISOString())}</p>
    </div>
  );
}
