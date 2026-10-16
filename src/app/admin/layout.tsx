import { getPageAuth } from "@/lib/page-auth";
import { AccessGate } from "@/components/AccessGate";
import { AdminLogin } from "@/components/AdminLogin";

export const dynamic = "force-dynamic";

// ตรวจสิทธิ์ฝั่ง server ก่อน render ทุกหน้าใต้ /admin (API ตรวจซ้ำอีกชั้นด้วย requireAdmin)
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await getPageAuth();
  if (!auth.ok) return auth.reason === "not_configured" ? <AccessGate reason={auth.reason} /> : <AdminLogin />;
  return <>{children}</>;
}
