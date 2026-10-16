import Link from "next/link";
import { Icon } from "./ui";

export function RegistrationGuide({ audience }: { audience: "teacher" | "student" }) {
  const isStudent = audience === "student";
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900"><Icon name="arrow-left" /> กลับไปเลือกประเภทผู้ส่ง</Link>
      <div className="space-y-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-blue-700"><Icon name={isStudent ? "user-graduate" : "chalkboard-user"} /> คำแนะนำสำหรับ{isStudent ? "นักเรียน" : "ครูและบุคลากร"}</p>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">ลงทะเบียน Edu Pass ใน 3 ขั้นตอน</h1>
        <p className="leading-relaxed text-slate-600">กรุณาอ่านคำแนะนำและลงทะเบียนให้เรียบร้อย แล้วจึงกดปุ่มส่งหลักฐานด้านล่าง</p>
      </div>
      <ol className="space-y-4" aria-label="ขั้นตอนการลงทะเบียน Edu Pass">
        <li className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3"><StepNumber n="1" /><div className="min-w-0 space-y-2"><h2 className="text-lg font-bold text-slate-900">ดาวน์โหลดแอป Edu Pass</h2><p className="leading-relaxed text-slate-600">ดาวน์โหลดจาก <strong className="font-semibold text-slate-800">App Store</strong> หรือ <strong className="font-semibold text-slate-800">Google Play</strong> โดยค้นหา “Edu Pass” และตรวจสอบไอคอนแอปให้ตรงกับภาพด้านล่าง</p></div></div>
          <figure className="mt-5 flex flex-col items-center gap-2 rounded-xl bg-slate-50 p-4">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/examples/edupass-app-icon.jpg" alt="ไอคอนแอป Edu Pass สีเขียว" width={276} height={282} className="h-auto w-36 rounded-2xl" /><figcaption className="text-sm text-slate-600">ไอคอนแอป Edu Pass</figcaption></figure>
        </li>
        <li className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3"><StepNumber n="2" /><div className="min-w-0 space-y-2"><h2 className="text-lg font-bold text-slate-900">ลงทะเบียนผ่าน ThaID</h2><p className="leading-relaxed text-slate-600">เปิดแอป Edu Pass แล้วลงทะเบียนผ่าน <strong className="font-semibold text-slate-800">ThaID</strong> จากนั้นกรอกข้อมูลเพิ่มเติมให้ครบถ้วน</p></div></div>
          <figure className="mt-5 flex flex-col items-center gap-3 rounded-xl bg-slate-50 p-4">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/examples/edupass-thaid-register.jpeg" alt="หน้าช่องทางเข้าสู่ระบบของ Edu Pass ที่มีปุ่มลงทะเบียนด้วย ThaID" width={1206} height={1468} loading="lazy" className="h-auto w-full max-w-80 rounded-xl border border-slate-200" /><figcaption className="text-center text-sm text-slate-600">เลือก “ลงทะเบียนด้วย ThaID” เพื่อเริ่มลงทะเบียน</figcaption></figure>
        </li>
        <li className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3"><StepNumber n="3" /><div className="min-w-0 space-y-2"><h2 className="text-lg font-bold text-slate-900">แคปภาพหน้าแรกเพื่อส่งหลักฐาน</h2><p className="leading-relaxed text-slate-600">เมื่อลงทะเบียนเรียบร้อยแล้ว ให้แคปภาพหน้าแรกของแอป Edu Pass ตามตัวอย่าง แล้วนำภาพมาส่งเป็นหลักฐานการลงทะเบียน</p></div></div>
          <figure className="mt-5 flex flex-col items-center gap-3 rounded-xl bg-slate-50 p-4">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/examples/edupass-home-example.jpg" alt="ตัวอย่างหน้าแรกของแอป Edu Pass หลังลงทะเบียนเรียบร้อยแล้ว" width={868} height={1887} loading="lazy" className="h-auto w-full max-w-64 rounded-xl border border-slate-200" /><figcaption className="text-center text-sm text-slate-600">ตัวอย่างภาพหน้าแรกสำหรับแนบเป็นหลักฐาน</figcaption></figure>
        </li>
      </ol>
      <div className="space-y-3 pb-2 text-center">
        <p className="text-sm text-slate-600">เตรียมภาพเรียบร้อยแล้ว ไปยังขั้นตอนส่งหลักฐาน</p>
        <Link href={isStudent ? "/student/submit" : "/submit"} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-lg font-semibold text-white transition-colors hover:bg-blue-800 sm:w-auto"><Icon name="cloud-arrow-up" /> ส่งหลักฐาน <Icon name="arrow-right" className="ml-1 text-sm" /></Link>
      </div>
    </div>
  );
}

function StepNumber({ n }: { n: string }) {
  return <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-700 font-bold text-white" aria-hidden="true">{n}</span>;
}
