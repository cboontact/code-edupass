import Link from "next/link";
import { SchoolLogo } from "./SchoolLogo";
import { Icon } from "./ui";
import { AdminLogout } from "./AdminLogout";

export function SiteHeader({ isAdmin }: { isAdmin: boolean }) {
  const link = "inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-800";
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <SchoolLogo />
          <span className="min-w-0">
            <span className="block truncate text-lg font-bold leading-tight text-blue-900">ส่งหลักฐานการสมัคร EDU Pass</span>
            <span className="block truncate text-sm text-slate-600">โรงเรียนจอมทอง</span>
          </span>
        </Link>
        <nav aria-label="เมนูหลัก" className="ml-auto flex flex-wrap items-center gap-1">
          <Link href="/" className={link}><Icon name="house" /> หน้าหลัก</Link>
          {isAdmin && (
            <>
              <Link href="/admin" className={link}><Icon name="chart-column" /> สรุปข้อมูลครู</Link>
              <Link href="/admin/students" className={link}><Icon name="user-graduate" /> สรุปข้อมูลนักเรียน</Link>
              <Link href="/admin/import" className={link}><Icon name="file-csv" /> นำเข้ารายชื่อ</Link>
              <Link href="/admin/settings" className={link}><Icon name="sliders" /> ตั้งค่า</Link>
              <AdminLogout />
            </>
          )}
          {!isAdmin && <Link href="/admin" className={link}><Icon name="user-shield" /> ผู้ดูแลระบบ</Link>}
        </nav>

      </div>
    </header>
  );
}
