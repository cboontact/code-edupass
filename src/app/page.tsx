import Link from "next/link";
import { Icon } from "@/components/ui";

const audiences = [
  {
    href: "/guide/teacher",
    title: "ครูและบุคลากร",
    description: "ตรวจสอบรายชื่อของท่าน แล้วส่งภาพหลักฐานการลงทะเบียน EDU Pass",
    icon: "chalkboard-user",
    label: "สำหรับครู",
    steps: ["เลือกกลุ่มสาระ", "ตรวจสอบรายชื่อ", "แนบหลักฐาน"],
    accent: "blue",
  },
  {
    href: "/guide/student",
    title: "นักเรียน",
    description: "ใช้เลขประจำตัวนักเรียนเพื่อยืนยันข้อมูล แล้วส่งภาพหลักฐาน",
    icon: "user-graduate",
    label: "สำหรับนักเรียน",
    steps: ["กรอกเลขประจำตัว", "ยืนยันข้อมูล", "แนบหลักฐาน"],
    accent: "emerald",
  },
] as const;

const styles = {
  blue: {
    card: "hover:border-blue-300 hover:shadow-blue-100/80 focus-visible:outline-blue-600",
    bar: "bg-blue-600",
    glow: "bg-blue-100/70",
    icon: "bg-blue-100 text-blue-700",
    label: "bg-blue-50 text-blue-700 ring-blue-200",
    step: "bg-blue-50 text-blue-800",
    actionText: "text-blue-700",
    actionIcon: "text-blue-700 group-hover:bg-blue-700",
  },
  emerald: {
    card: "hover:border-emerald-300 hover:shadow-emerald-100/80 focus-visible:outline-emerald-600",
    bar: "bg-emerald-600",
    glow: "bg-emerald-100/70",
    icon: "bg-emerald-100 text-emerald-700",
    label: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    step: "bg-emerald-50 text-emerald-800",
    actionText: "text-emerald-700",
    actionIcon: "text-emerald-700 group-hover:bg-emerald-700",
  },
};

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700 ring-1 ring-blue-100">
          <Icon name="shield-halved" /> ระบบส่งหลักฐานการสมัคร EDU Pass
        </span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">ท่านต้องการส่งหลักฐานในฐานะใด</h1>
        <p className="mx-auto mt-2 max-w-xl text-slate-600">เลือกประเภทผู้ส่งเพื่อดูขั้นตอนและตรวจสอบข้อมูลก่อนส่งหลักฐาน</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {audiences.map((item) => {
          const tone = styles[item.accent];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-3 focus-visible:outline-offset-3 ${tone.card}`}
            >
              <span className={`absolute inset-x-0 top-0 h-1.5 ${tone.bar}`} aria-hidden="true" />
              <span className={`absolute -right-12 -top-12 size-40 rounded-full ${tone.glow}`} aria-hidden="true" />

              <article className="relative flex h-full min-h-80 flex-col p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className={`flex size-14 items-center justify-center rounded-2xl text-2xl ${tone.icon}`}><Icon name={item.icon} /></span>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${tone.label}`}>{item.label}</span>
                </div>

                <h2 className="mt-5 text-2xl font-bold text-slate-900">{item.title}</h2>
                <p className="mt-2 leading-relaxed text-slate-600">{item.description}</p>

                <div className="mt-5 flex flex-wrap gap-2" aria-label="ขั้นตอนโดยย่อ">
                  {item.steps.map((step, index) => (
                    <span key={step} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${tone.step}`}>
                      <span className="opacity-60">{index + 1}</span> {step}
                    </span>
                  ))}
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-5">
                  <span className={`font-bold ${tone.actionText}`}>อ่านวิธีและส่งหลักฐาน</span>
                  <span className={`flex size-10 items-center justify-center rounded-full transition-all group-hover:translate-x-1 group-hover:text-white ${tone.actionIcon}`}>
                    <Icon name="arrow-right" />
                  </span>
                </div>
              </article>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
