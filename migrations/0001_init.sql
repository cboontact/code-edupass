-- EDU Pass โรงเรียนจอมทอง: โครงสร้างข้อมูลเริ่มต้น (ไม่มีข้อมูลบุคคลจริง)
CREATE TABLE departments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE staff (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  email         TEXT,                       -- ใช้ผูกตัวตนกับบัญชีที่ล็อกอิน (ตัวพิมพ์เล็ก)
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (department_id, full_name)
);
CREATE INDEX idx_staff_department ON staff(department_id);
CREATE INDEX idx_staff_email ON staff(email);

-- หลักฐาน 1 รายการต่อบุคลากร 1 คน; เก็บเฉพาะ object key ของ R2 (สุ่ม ไม่มีชื่อบุคคล)
CREATE TABLE submissions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id     INTEGER NOT NULL UNIQUE REFERENCES staff(id) ON DELETE CASCADE,
  object_key   TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  size_bytes   INTEGER NOT NULL,
  submitted_by TEXT NOT NULL,               -- อีเมลผู้ส่ง (จากระบบยืนยันตัวตน)
  submitted_at TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE TABLE settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE audit_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  actor      TEXT NOT NULL,
  action     TEXT NOT NULL,
  detail     TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
