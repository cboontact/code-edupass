import { Notice } from "./ui";

export function AccessGate({ reason }: { reason: "not_configured" | "unauthenticated" }) {
  return reason === "not_configured" ? (
    <Notice tone="warn" icon="lock" title="ไม่สามารถเข้าใช้งานได้ในขณะนี้">
      กรุณาติดต่อผู้ดูแลระบบของโรงเรียน แล้วลองเข้าใช้งานอีกครั้ง
    </Notice>
  ) : (
    <Notice tone="info" icon="right-to-bracket" title="กรุณาเข้าสู่ระบบ">
      ไม่พบข้อมูลการยืนยันตัวตน กรุณาเข้าสู่ระบบด้วยบัญชีที่โรงเรียนกำหนด แล้วลองใหม่อีกครั้ง
    </Notice>
  );
}
