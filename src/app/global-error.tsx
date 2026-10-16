"use client";

export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="th">
      <head><title>ไม่สามารถโหลดข้อมูล | EDU Pass</title></head>
      <body style={{ margin: 0, padding: "48px 24px", fontFamily: "Tahoma, sans-serif", background: "#f4f7fb", color: "#0f172a", textAlign: "center" }}>
        <main>
          <h1>ไม่สามารถโหลดข้อมูลได้ในขณะนี้</h1>
          <p>กรุณาลองอีกครั้ง หากยังพบปัญหา โปรดติดต่อผู้ดูแลระบบของโรงเรียน</p>
          <button onClick={retry} style={{ padding: "12px 24px", border: 0, borderRadius: 8, background: "#1d4ed8", color: "white", font: "inherit", cursor: "pointer" }}>ลองอีกครั้ง</button>
        </main>
      </body>
    </html>
  );
}
