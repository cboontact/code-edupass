import Link from "next/link";
import { StudentSubmitForm } from "@/components/StudentSubmitForm";
import { Notice, Icon } from "@/components/ui";
import { getEnv } from "@/lib/env";
import { loadSettings } from "@/lib/db";
import { isPastDeadline } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { DB } = getEnv();
  const [settings, count] = await Promise.all([
    loadSettings(DB),
    DB.prepare("SELECT COUNT(*) AS total FROM students").first<{ total: number }>(),
  ]);
  const past = isPastDeadline(settings.deadline);
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/guide/student" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900"><Icon name="arrow-left" /> กลับไปอ่านคำแนะนำ</Link>
      <div><h1 className="flex items-center gap-3 text-2xl font-bold text-slate-900"><Icon name="user-graduate" className="text-emerald-700" /> ส่งหลักฐานสำหรับนักเรียน</h1><p className="mt-1 text-slate-600">กรอกเลขประจำตัวนักเรียน ตรวจสอบชื่อ-นามสกุล แล้วแนบภาพหลักฐาน</p></div>
      {settings.deadline && <Notice tone={past ? "warn" : "info"} icon="calendar-day" title={`กำหนดส่ง: ${new Intl.DateTimeFormat("th-TH", { dateStyle: "long", timeZone: "Asia/Bangkok" }).format(new Date(`${settings.deadline}T12:00:00+07:00`))}`}>{past ? (settings.blockAfterDeadline ? "หมดกำหนดส่งแล้ว ระบบปิดรับหลักฐาน" : "เลยกำหนดส่งแล้ว กรุณาส่งโดยเร็ว") : null}</Notice>}
      {(count?.total ?? 0) === 0 ? <Notice tone="info" icon="hourglass-half" title="ยังไม่เปิดรับหลักฐานนักเรียน">ผู้ดูแลระบบกำลังเตรียมรายชื่อนักเรียน กรุณากลับมาใหม่ภายหลัง</Notice> : <StudentSubmitForm maxFileMb={settings.maxFileMb} allowedTypes={settings.allowedTypes} allowResubmit={settings.allowResubmit} closed={past && settings.blockAfterDeadline} />}
    </div>
  );
}
