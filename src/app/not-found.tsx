import Link from "next/link";
import { Card, Icon } from "@/components/ui";

export default function NotFound() {
  return (
    <Card className="mx-auto max-w-xl space-y-4 text-center">
      <Icon name="magnifying-glass" className="text-3xl text-blue-700" />
      <h1 className="text-xl font-bold">ไม่พบหน้าที่ต้องการ</h1>
      <p className="text-slate-600">ลิงก์อาจไม่ถูกต้อง กรุณากลับไปยังหน้าส่งหลักฐาน</p>
      <Link href="/" className="inline-flex min-h-11 items-center rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white">กลับหน้าหลัก</Link>
    </Card>
  );
}
