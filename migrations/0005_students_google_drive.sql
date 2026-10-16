-- รายชื่อนักเรียนและหลักฐานนักเรียนซึ่งจัดเก็บไฟล์จริงแบบ private ใน Google Shared Drive
CREATE TABLE students (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  student_number TEXT NOT NULL UNIQUE,
  full_name      TEXT NOT NULL,
  class_name     TEXT,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_students_name ON students(full_name);
CREATE INDEX idx_students_class ON students(class_name);

CREATE TABLE student_submissions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id    INTEGER NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  drive_file_id TEXT NOT NULL UNIQUE,
  content_type  TEXT NOT NULL,
  size_bytes    INTEGER NOT NULL,
  submitted_at  TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
