const DEPARTMENT_ICONS: Record<string, string> = {
  ภาษาไทย: "book-open",
  คณิตศาสตร์: "calculator",
  วิทยาศาสตร์และเทคโนโลยี: "flask",
  สังคมศึกษาศาสนาและวัฒนธรรม: "earth-asia",
  สุขศึกษาและพลศึกษา: "person-running",
  ศิลปะ: "palette",
  การงานอาชีพ: "screwdriver-wrench",
  ภาษาต่างประเทศ: "language",
  กิจกรรมพัฒนาผู้เรียน: "compass",
  ฝ่ายบริหาร: "user-tie",
  เจ้าหน้าที่: "users-gear",
};

export function departmentIcon(name: string): string {
  const key = name.normalize("NFC").replace(/\s+/g, "").replace(/^กลุ่มสาระ(?:การเรียนรู้)?/, "");
  return Object.hasOwn(DEPARTMENT_ICONS, key) ? DEPARTMENT_ICONS[key] : "users";
}
