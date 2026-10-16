"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./ui";

// วางไฟล์โลโก้จริงที่ public/brand/school-logo.png (ดู public/brand/README.md)
// ถ้ายังไม่มีไฟล์ จะแสดงกรอบ placeholder — ไม่วาดหรือเดาโลโก้เอง
export function SchoolLogo() {
  const [missing, setMissing] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  // รูปอาจโหลดล้มเหลวก่อน hydrate ทำให้ onError ไม่ถูกเรียก จึงตรวจซ้ำตอน mount
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setMissing(true);
  }, []);
  if (missing)
    return (
      <div
        className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500"
        role="img"
        aria-label="พื้นที่สำหรับโลโก้โรงเรียนจอมทอง (ยังไม่มีไฟล์โลโก้)"
      >
        <Icon name="image" />
        <span className="text-[9px] leading-none">โลโก้</span>
      </div>
    );
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={ref} src="/brand/school-logo.png" alt="โลโก้โรงเรียนจอมทอง" className="size-12 shrink-0 object-contain" onError={() => setMissing(true)} />;
}
