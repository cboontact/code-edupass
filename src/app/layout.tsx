import type { Metadata, Viewport } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "@fortawesome/fontawesome-free/css/fontawesome.min.css";
import "@fortawesome/fontawesome-free/css/solid.min.css";
import "./globals.css";
import { ToastProvider } from "@/components/toast";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getPageAuth } from "@/lib/page-auth";

const noto = Noto_Sans_Thai({ subsets: ["thai", "latin"], variable: "--font-noto-thai", display: "swap" });

export const metadata: Metadata = {
  title: "ส่งหลักฐานการสมัคร EDU Pass | โรงเรียนจอมทอง",
  description: "ระบบส่งหลักฐานการสมัครใช้งาน EDU Pass ของครู บุคลากร และนักเรียนโรงเรียนจอมทอง",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const auth = await getPageAuth();
  const id = auth.ok ? auth.identity : null;
  return (
    <html lang="th" className={noto.variable}>
      <body className="flex min-h-screen flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3">
          ข้ามไปยังเนื้อหา
        </a>
        <ToastProvider>
          <SiteHeader isAdmin={!!id?.isAdmin} />
          <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">{children}</main>
          <SiteFooter />
        </ToastProvider>
      </body>
    </html>
  );
}
