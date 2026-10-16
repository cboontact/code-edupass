"use client";

import { Button, Card, Icon } from "@/components/ui";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <Card className="mx-auto max-w-xl space-y-4 text-center">
      <Icon name="triangle-exclamation" className="text-3xl text-orange-600" />
      <h1 className="text-xl font-bold">โหลดข้อมูลไม่สำเร็จ</h1>
      <p className="text-slate-600">กรุณาลองอีกครั้ง หากยังพบปัญหา โปรดติดต่อผู้ดูแลระบบของโรงเรียน</p>
      <Button icon="rotate-right" onClick={retry}>ลองอีกครั้ง</Button>
    </Card>
  );
}
