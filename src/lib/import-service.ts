import { analyzeImport, IMPORT_LIMITS, type ImportAnalysis } from "./csv";

/** อ่านไฟล์ CSV จากคำขอ multipart แล้ววิเคราะห์เทียบกับข้อมูลในฐานข้อมูล */
export async function analyzeUpload(req: Request, db: D1Database): Promise<{ text: string; analysis: ImportAnalysis } | { error: string }> {
  let form: FormData;
  try { form = await req.formData(); } catch { return { error: "อ่านไฟล์ไม่ได้" }; }
  const file = form.get("file");
  if (!(file instanceof File)) return { error: "กรุณาเลือกไฟล์ CSV" };
  if (file.size > IMPORT_LIMITS.maxBytes) return { error: "ไฟล์ใหญ่เกิน 1 MB" };
  const text = await file.text();
  const [{ results: staff }, { results: deps }] = await Promise.all([
    db.prepare("SELECT d.name AS department, s.full_name AS name, s.position, s.email FROM staff s JOIN departments d ON d.id = s.department_id").all<{ department: string; name: string; position: string | null; email: string | null }>(),
    db.prepare("SELECT name FROM departments").all<{ name: string }>(),
  ]);
  return { text, analysis: analyzeImport(text, staff, deps.map((d) => d.name)) };
}
