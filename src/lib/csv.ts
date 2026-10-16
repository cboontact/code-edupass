// แม่แบบคอลัมน์ — ปรับได้เมื่อได้รับไฟล์จริงจากผู้ดูแล (เพิ่มชื่อหัวคอลัมน์อื่นๆ ในรายการ alias)
export const CSV_COLUMNS = {
  department: { label: "กลุ่มสาระ", aliases: ["กลุ่มสาระ", "กลุ่มสาระการเรียนรู้", "department"] },
  name: { label: "ชื่อ-นามสกุล", aliases: ["ชื่อ-นามสกุล", "ชื่อ นามสกุล", "ชื่อสกุล", "name", "full name"] },
  position: { label: "ตำแหน่ง", aliases: ["ตำแหน่ง", "position"], optional: true },
  email: { label: "อีเมล", aliases: ["อีเมล", "email", "e-mail"], optional: true },
} as const;

export const IMPORT_LIMITS = { maxBytes: 1024 * 1024, maxRows: 3000 };

export function parseCsv(text: string): string[][] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else inQ = false;
      } else cell += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      rows.push(row); row = [];
    } else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export const normalize = (s: string) => s.normalize("NFC").replace(/\s+/g, " ").trim();
const keyOf = (dept: string, name: string) => `${dept}\u0000${name}`.toLowerCase();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type RowStatus = "new" | "update" | "unchanged" | "duplicate" | "incomplete" | "invalid";
export interface ImportRow {
  line: number; // เลขบรรทัดในไฟล์ (นับหัวตารางเป็น 1)
  department: string;
  name: string;
  position: string;
  email: string;
  status: RowStatus;
  reason?: string;
}
export interface ImportAnalysis {
  ok: boolean;
  headerError?: string;
  rows: ImportRow[];
  counts: Record<RowStatus, number>;
  newDepartments: string[];
  tooManyRows?: boolean;
}

export interface ExistingStaff {
  department: string;
  name: string;
  position?: string | null;
  email: string | null;
}

export function analyzeImport(text: string, existing: ExistingStaff[], knownDepartments: string[]): ImportAnalysis {
  const counts: Record<RowStatus, number> = { new: 0, update: 0, unchanged: 0, duplicate: 0, incomplete: 0, invalid: 0 };
  const empty = (headerError: string): ImportAnalysis => ({ ok: false, headerError, rows: [], counts, newDepartments: [] });
  const table = parseCsv(text);
  if (!table.length) return empty("ไฟล์ว่างเปล่า");
  const header = table[0].map((h) => normalize(h).toLowerCase());
  const find = (aliases: readonly string[]) => header.findIndex((h) => aliases.some((a) => a.toLowerCase() === h));
  const iDept = find(CSV_COLUMNS.department.aliases);
  const iName = find(CSV_COLUMNS.name.aliases);
  const iPos = find(CSV_COLUMNS.position.aliases);
  const iEmail = find(CSV_COLUMNS.email.aliases);
  if (iDept < 0 || iName < 0)
    return empty(`ไม่พบหัวคอลัมน์ที่จำเป็น: ต้องมี “${CSV_COLUMNS.department.label}” และ “${CSV_COLUMNS.name.label}”`);
  const body = table.slice(1);
  if (body.length > IMPORT_LIMITS.maxRows)
    return { ...empty(`จำนวนแถวเกินกำหนด (สูงสุด ${IMPORT_LIMITS.maxRows} แถว)`), tooManyRows: true };

  const existingMap = new Map(existing.map((e) => [keyOf(e.department, e.name), e]));
  const known = new Set(knownDepartments.map((d) => d.toLowerCase()));
  const seen = new Set<string>();
  const newDeps = new Map<string, string>();
  const rows: ImportRow[] = body.map((cells, idx) => {
    const department = normalize(cells[iDept] ?? "");
    const name = normalize(cells[iName] ?? "");
    const position = iPos >= 0 ? normalize(cells[iPos] ?? "") : "";
    const email = iEmail >= 0 ? normalize(cells[iEmail] ?? "").toLowerCase() : "";
    const r: ImportRow = { line: idx + 2, department, name, position, email, status: "new" };
    if (!department || !name) { r.status = "incomplete"; r.reason = !department ? "ไม่มีกลุ่มสาระ" : "ไม่มีชื่อ-นามสกุล"; }
    else if (department.length > 100 || name.length > 150) { r.status = "invalid"; r.reason = "ข้อความยาวเกินกำหนด"; }
    else if (position.length > 100) { r.status = "invalid"; r.reason = "ตำแหน่งยาวเกินกำหนด"; }
    else if (email && !EMAIL_RE.test(email)) { r.status = "invalid"; r.reason = "รูปแบบอีเมลไม่ถูกต้อง"; }
    else {
      const k = keyOf(department, name);
      if (seen.has(k)) { r.status = "duplicate"; r.reason = "ซ้ำกับแถวก่อนหน้าในไฟล์"; }
      else {
        seen.add(k);
        const ex = existingMap.get(k);
        if (ex) {
          const emailChanged = !!email && email !== (ex.email ?? "");
          const posChanged = !!position && position !== (ex.position ?? "");
          if (emailChanged || posChanged) {
            r.status = "update";
            r.reason = emailChanged && posChanged ? "อัปเดตอีเมลและตำแหน่ง" : emailChanged ? "อัปเดตอีเมล" : "อัปเดตตำแหน่ง";
          }
          else { r.status = "unchanged"; r.reason = "มีอยู่ในระบบแล้ว"; }
        } else if (!known.has(department.toLowerCase())) newDeps.set(department.toLowerCase(), department);
      }
    }
    counts[r.status]++;
    return r;
  });
  return { ok: true, rows, counts, newDepartments: [...newDeps.values()] };
}
