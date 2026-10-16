export interface DeptCount {
  id: number;
  name: string;
  total: number;
  submitted: number;
}
export interface Progress {
  total: number;
  submitted: number;
  pending: number;
  percent: number; // 0–100 ปัดเป็นทศนิยม 1 ตำแหน่ง
}

export function percentOf(submitted: number, total: number): number {
  if (total <= 0) return 0;
  const p = (Math.min(submitted, total) / total) * 100;
  return Math.round(p * 10) / 10;
}

export function computeProgress(depts: DeptCount[]): Progress {
  const total = depts.reduce((a, d) => a + d.total, 0);
  const submitted = depts.reduce((a, d) => a + Math.min(d.submitted, d.total), 0);
  return { total, submitted, pending: total - submitted, percent: percentOf(submitted, total) };
}
